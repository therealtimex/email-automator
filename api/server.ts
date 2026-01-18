import express from 'express';
import cors from 'cors';
import path, { join } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
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
