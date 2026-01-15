import { Router } from 'express';
import { getServerSupabase } from '../services/supabase.js';
import { config } from '../config/index.js';

const router = Router();

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
        version: '1.0.0',
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
