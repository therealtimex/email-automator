import { Router } from 'express';
import { getServerSupabase } from '../services/supabase.js';
import { config } from '../config/index.js';
import { readFileSync } from 'fs';
import { join } from 'path';

const router = Router();

// Read version from package.json
let version = '1.0.0';
try {
    const pkgPath = join(config.packageRoot, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    version = pkg.version;
} catch (e) {
    console.error('Failed to read version from package.json', e);
}

router.get('/', async (_req, res) => {
    const supabase = getServerSupabase();
    let dbStatus = 'unknown';
    
    if (supabase) {
        try {
            const { error } = await supabase.from('email_accounts').select('id').limit(1);
            dbStatus = error ? 'error' : 'connected';
        } catch {
            dbStatus = 'error';
        }
    } else {
        dbStatus = 'not_configured';
    }

    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version,
        environment: config.nodeEnv,
        services: {
            database: dbStatus,
            llm: config.llm.apiKey ? 'configured' : 'not_configured',
            gmail: config.gmail.clientId ? 'configured' : 'not_configured',
            microsoft: config.microsoft.clientId ? 'configured' : 'not_configured',
        },
    });
});

export default router;
