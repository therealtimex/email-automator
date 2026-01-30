import express from 'express';
import cors from 'cors';
import path, { join } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import axios from 'axios';
import crypto from 'crypto';
import { SDKService } from './src/services/SDKService.js';
import { config, validateConfig } from './src/config/index.js';
import { errorHandler } from './src/middleware/errorHandler.js';
import { apiRateLimit } from './src/middleware/rateLimit.js';
import routes from './src/routes/index.js';
import { logger } from './src/utils/logger.js';
import { getServerSupabase } from './src/services/supabase.js';
import { startScheduler, stopScheduler } from './src/services/scheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate configuration
const configValidation = validateConfig();
if (!configValidation.valid) {
    logger.warn('Configuration warnings', { errors: configValidation.errors });
}

// Initialize RealTimeX SDK
SDKService.initialize();

const app = express();

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    if (config.isProduction) {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
});

// CORS configuration
app.use(cors({
    origin: config.isProduction
        ? config.security.corsOrigins
        : true, // Allow all in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Supabase-Url', 'X-Supabase-Anon-Key'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.debug(`${req.method} ${req.path}`, {
            status: res.statusCode,
            duration: `${duration}ms`,
        });
    });
    next();
});

// Rate limiting (global)
app.use('/api', apiRateLimit);

// API routes
app.use('/api', routes);

// --- SETUP & PROVISIONING (Golden Standard) ---

// GET /api/setup/organizations - List Supabase organizations using access token
app.get('/api/setup/organizations', async (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ error: 'Missing Authorization header' });
    }

    try {
        const response = await axios.get('https://api.supabase.com/v1/organizations', {
            headers: { 'Authorization': authHeader }
        });
        res.json(response.data);
    } catch (error: any) {
        logger.error('Failed to fetch organizations', error);
        res.status(error.response?.status || 500).json({
            error: error.response?.data?.message || 'Failed to fetch organizations'
        });
    }
});

// POST /api/setup/auto-provision - Create project and poll for readiness (SSE)
app.post('/api/setup/auto-provision', async (req, res) => {
    const { orgId, projectName: customProjectName, region: customRegion } = req.body;
    const authHeader = req.headers['authorization'];

    if (!orgId) {
        return res.status(400).json({ error: 'Missing required parameter (orgId)' });
    }

    if (!authHeader) {
        return res.status(401).json({ error: 'Missing Authorization header' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendEvent = (type: string, data: any) => {
        res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
    };

    try {
        const projectName = customProjectName || `Email-Automator-${crypto.randomBytes(2).toString('hex')}`;
        const region = customRegion || 'us-east-1';

        // Generate a secure DB password server-side
        const dbPass = crypto.randomBytes(16).toString('base64')
            .replace(/\+/g, 'a')
            .replace(/\//g, 'b')
            .replace(/=/g, 'c') + '1!Aa';

        sendEvent('info', `🚀 Creating Supabase project: ${projectName} in ${region}...`);

        // 1. Create Project
        const createResponse = await axios.post('https://api.supabase.com/v1/projects', {
            name: projectName,
            organization_id: orgId,
            region: region,
            db_pass: dbPass
        }, {
            headers: { 'Authorization': authHeader },
            timeout: 15000
        });

        const project = createResponse.data;
        const projectRef = project.id;

        sendEvent('info', `📦 Project created! ID: ${projectRef}. Waiting for it to go live...`);
        sendEvent('project_id', projectRef);

        // 2. Poll for Readiness
        let isReady = false;
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes

        while (!isReady && attempts < maxAttempts) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 5000));

            try {
                const statusResponse = await axios.get(`https://api.supabase.com/v1/projects/${projectRef}`, {
                    headers: { 'Authorization': authHeader },
                    timeout: 10000
                });

                const status = statusResponse.data.status;
                sendEvent('info', `⏳ Status: ${status} (Attempt ${attempts}/${maxAttempts})`);

                if (status === 'ACTIVE_HEALTHY' || status === 'ACTIVE') {
                    isReady = true;
                }
            } catch (pollError: any) {
                logger.warn('Polling error during provision', { error: pollError.message });
            }
        }

        if (!isReady) {
            throw new Error('Project provision timed out after 5 minutes.');
        }

        // 3. Get API Keys
        sendEvent('info', '🔑 Retrieving API keys...');

        let anonKey = '';
        let keyAttempts = 0;
        const maxKeyAttempts = 10;

        while (!anonKey && keyAttempts < maxKeyAttempts) {
            keyAttempts++;
            if (keyAttempts > 1) {
                sendEvent('info', `⏳ API keys not ready yet. Retrying (Attempt ${keyAttempts}/${maxKeyAttempts})...`);
                await new Promise(resolve => setTimeout(resolve, 3000));
            }

            try {
                const keysResponse = await axios.get(`https://api.supabase.com/v1/projects/${projectRef}/api-keys`, {
                    headers: { 'Authorization': authHeader },
                    timeout: 10000
                });

                const keys = keysResponse.data;
                if (Array.isArray(keys)) {
                    anonKey = keys.find((k: any) => k.name === 'anon')?.api_key;
                    if (anonKey) {
                        sendEvent('info', '✅ API keys retrieved successfully.');
                    }
                }
            } catch (err: any) {
                logger.warn('Key retrieval attempt failed', { error: err.message });
            }
        }

        if (!anonKey) {
            throw new Error('Could not find anonymous API key for the new project.');
        }

        const supabaseUrl = `https://${projectRef}.supabase.co`;

        // 4. DNS Verification
        sendEvent('info', '🌐 Waiting for DNS propagation...');
        let dnsReady = false;
        let dnsAttempts = 0;
        const maxDnsAttempts = 20;

        while (!dnsReady && dnsAttempts < maxDnsAttempts) {
            dnsAttempts++;
            try {
                const pingResponse = await axios.get(`${supabaseUrl}/rest/v1/`, {
                    timeout: 5000,
                    validateStatus: () => true
                });
                if (pingResponse.status < 500) {
                    dnsReady = true;
                    sendEvent('info', '✨ DNS resolved! Project is fully accessible.');
                }
            } catch (pingError: any) {
                if (dnsAttempts % 5 === 0) {
                    sendEvent('info', '⏳ DNS still propagating... standby.');
                }
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }

        sendEvent('success', {
            url: supabaseUrl,
            anonKey: anonKey,
            projectId: projectRef,
            dbPass: dbPass
        });

        sendEvent('done', 'success');
    } catch (error: any) {
        const errorMsg = error.response?.data?.message || error.message || 'Auto-provisioning failed';
        logger.error('Auto-provision failed', { error: errorMsg });
        sendEvent('error', errorMsg);
        sendEvent('done', 'failed');
    } finally {
        res.end();
    }
});

// Robust resolution for static assets (dist folder)
function getDistPath() {
    // 1. Check environment variable override (must contain index.html)
    if (process.env.ELECTRON_STATIC_PATH && existsSync(join(process.env.ELECTRON_STATIC_PATH, 'index.html'))) {
        return process.env.ELECTRON_STATIC_PATH;
    }

    // 2. Try to find dist relative to packageRoot (from config)
    // This is the most reliable way in compiled app
    const fromRoot = join(config.rootDir || process.cwd(), 'dist');
    if (existsSync(join(fromRoot, 'index.html'))) {
        return fromRoot;
    }

    // 3. Try to find dist relative to this file
    let current = __dirname;
    for (let i = 0; i < 4; i++) {
        const potential = join(current, 'dist');
        if (existsSync(join(potential, 'index.html'))) return potential;
        current = path.dirname(current);
    }

    // 4. Fallback to current working directory
    return join(config.packageRoot || process.cwd(), 'dist');
}

const distPath = getDistPath();
logger.info('Serving static assets', { path: distPath });
app.use(express.static(distPath));

// Handle client-side routing
app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
        if (err) {
            // If dist doesn't exist, return 404 for non-API routes
            res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Frontend not built or endpoint not found' }
            });
        }
    });
});

// Error handler (must be last)
app.use(errorHandler);

// Graceful shutdown
const shutdown = () => {
    logger.info('Shutting down gracefully...');
    stopScheduler();
    process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
const server = app.listen(config.port, () => {
    const url = `http://localhost:${config.port}`;
    logger.info(`Server running at ${url}`, {
        environment: config.nodeEnv,
        supabase: getServerSupabase() ? 'connected' : 'not configured',
    });

    // Start background scheduler
    if (getServerSupabase()) {
        startScheduler();
    }
});

// Handle server errors
server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${config.port} is already in use`);
    } else {
        logger.error('Server error', error);
    }
    process.exit(1);
});

export default app;
