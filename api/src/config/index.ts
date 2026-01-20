import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path, { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Robustly find package root (directory containing package.json and bin folder)
function findPackageRoot(startDir: string): string {
    let current = startDir;
    while (current !== path.parse(current).root) {
        if (existsSync(join(current, 'package.json')) && existsSync(join(current, 'bin'))) {
            return current;
        }
        current = dirname(current);
    }
    return process.cwd();
}

const packageRoot = findPackageRoot(__dirname);
console.log(`🏠 Package Root: ${packageRoot}`);

function loadEnvironment() {
    const cwdEnv = join(process.cwd(), '.env');
    const rootEnv = join(packageRoot, '.env');

    if (existsSync(cwdEnv)) {
        console.log(`📝 Loading environment from CWD: ${cwdEnv}`);
        dotenv.config({ path: cwdEnv, override: true });
    } else if (existsSync(rootEnv)) {
        console.log(`📝 Loading environment from Root: ${rootEnv}`);
        dotenv.config({ path: rootEnv, override: true });
    } else {
        // Just run default dotenv config in case it's in a standard location
        dotenv.config();
    }
}

loadEnvironment();

function parseArgs(args: string[]): { port: number | null, noUi: boolean, rename: boolean } {
    const portIndex = args.indexOf('--port');
    let port = null;
    if (portIndex !== -1 && args[portIndex + 1]) {
        const p = parseInt(args[portIndex + 1], 10);
        if (!isNaN(p) && p > 0 && p < 65536) {
            port = p;
        }
    }
    
    const noUi = args.includes('--no-ui');
    const rename = args.includes('--rename');
    
    return { port, noUi, rename };
}

const cliArgs = parseArgs(process.argv.slice(2));

export const config = {
    // Server
    packageRoot,
    // Default port 3004 (RealTimeX Desktop uses 3001/3002)
    port: cliArgs.port || (process.env.PORT ? parseInt(process.env.PORT, 10) : 3004),
    noUi: cliArgs.noUi,
    intelligentRename: cliArgs.rename || process.env.INTELLIGENT_RENAME === 'true',
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',

    // Paths - Robust resolution for both TS source and compiled JS in dist/
    rootDir: packageRoot,
    scriptsDir: join(packageRoot, 'scripts'),

    // Supabase
    supabase: {
        url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
        anonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
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
