import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function parsePort(args: string[], envPort: string | undefined, defaultPort: number): number {
    const portIndex = args.indexOf('--port');
    if (portIndex !== -1 && args[portIndex + 1]) {
        const customPort = parseInt(args[portIndex + 1], 10);
        if (!isNaN(customPort) && customPort > 0 && customPort < 65536) {
            return customPort;
        }
    }
    return envPort ? parseInt(envPort, 10) : defaultPort;
}

export const config = {
    // Server
    // Default port 3004 (RealTimeX Desktop uses 3001/3002)
    port: parsePort(process.argv.slice(2), process.env.PORT, 3004),
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',

    // Paths
    rootDir: join(__dirname, '..', '..', '..'),
    scriptsDir: join(__dirname, '..', '..', '..', 'scripts'),

    // Supabase
    supabase: {
        url: process.env.SUPABASE_URL || '',
        anonKey: process.env.SUPABASE_ANON_KEY || '',
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    },

    // LLM
    llm: {
        apiKey: process.env.LLM_API_KEY || '',
        baseUrl: process.env.LLM_BASE_URL,
        model: process.env.LLM_MODEL || 'gpt-4o-mini',
    },

    // OAuth - Gmail
    gmail: {
        clientId: process.env.GMAIL_CLIENT_ID || '',
        clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
        redirectUri: process.env.GMAIL_REDIRECT_URI || 'urn:ietf:wg:oauth:2.0:oob',
    },

    // OAuth - Microsoft
    microsoft: {
        clientId: process.env.MS_GRAPH_CLIENT_ID || '',
        tenantId: process.env.MS_GRAPH_TENANT_ID || 'common',
        clientSecret: process.env.MS_GRAPH_CLIENT_SECRET || '',
    },

    // Security
    security: {
        encryptionKey: process.env.TOKEN_ENCRYPTION_KEY || '',
        jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
        corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3003', 'http://localhost:5173'],
        rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
        rateLimitMax: 100,
        disableAuth: process.env.DISABLE_AUTH === 'true',
    },

    // Processing
    processing: {
        batchSize: parseInt(process.env.EMAIL_BATCH_SIZE || '20', 10),
        syncIntervalMs: parseInt(process.env.SYNC_INTERVAL_MS || '60000', 10), // 1 minute
        maxRetries: 3,
    },
};

export function validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.supabase.url) {
        errors.push('SUPABASE_URL is required');
    }
    if (!config.supabase.anonKey) {
        errors.push('SUPABASE_ANON_KEY is required');
    }
    if (config.isProduction && config.security.jwtSecret === 'dev-secret-change-in-production') {
        errors.push('JWT_SECRET must be set in production');
    }
    if (config.isProduction && !config.security.encryptionKey) {
        errors.push('TOKEN_ENCRYPTION_KEY must be set in production');
    }

    return { valid: errors.length === 0, errors };
}
