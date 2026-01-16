import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authMiddleware } from '../middleware/auth.js';
import { apiRateLimit } from '../middleware/rateLimit.js';
import { validateBody, schemas } from '../middleware/validation.js';
import { createLogger } from '../utils/logger.js';

const router = Router();
const logger = createLogger('SettingsRoutes');

// Get user settings
router.get('/',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const { data, error } = await req.supabase!
            .from('user_settings')
            .select('*')
            .eq('user_id', req.user!.id)
            .single();

        if (error && error.code !== 'PGRST116') {
            // PGRST116 = no rows returned
            throw error;
        }

        // Return defaults if no settings exist
        const settings = data || {
            llm_model: null,
            llm_base_url: null,
            auto_trash_spam: false,
            smart_drafts: false,
            sync_interval_minutes: 5,
        };

        res.json({ settings });
    })
);

// Update user settings
router.patch('/',
    apiRateLimit,
    authMiddleware,
    validateBody(schemas.updateSettings),
    asyncHandler(async (req, res) => {
        const updates = req.body;
        const userId = req.user!.id;

        // Upsert settings
        const { data, error } = await req.supabase!
            .from('user_settings')
            .upsert({
                user_id: userId,
                ...updates,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' })
            .select()
            .single();

        if (error) throw error;

        logger.info('Settings updated', { userId });

        res.json({ settings: data });
    })
);

// Test LLM Connection
router.post('/test-llm',
    apiRateLimit,
    authMiddleware,
    asyncHandler(async (req, res) => {
        const { llm_model, llm_base_url, llm_api_key } = req.body;

        const { getIntelligenceService } = await import('../services/intelligence.js');
        const intelligence = getIntelligenceService({
            model: llm_model,
            baseUrl: llm_base_url,
            apiKey: llm_api_key,
        });

        const result = await intelligence.testConnection();
        res.json(result);
    })
);

// Get analytics/stats
router.get('/stats',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const userId = req.user!.id;

        // Get email counts by category
        const { data: emailStats } = await req.supabase!
            .from('emails')
            .select('category, is_useless, action_taken')
            .eq('email_accounts.user_id', userId);

        // Get account counts
        const { data: accounts } = await req.supabase!
            .from('email_accounts')
            .select('id, provider')
            .eq('user_id', userId);

        // Get recent processing logs
        const { data: recentLogs } = await req.supabase!
            .from('processing_logs')
            .select('*')
            .eq('user_id', userId)
            .order('started_at', { ascending: false })
            .limit(5);

        // Calculate stats
        const stats = {
            totalEmails: emailStats?.length || 0,
            categoryCounts: {} as Record<string, number>,
            actionCounts: {} as Record<string, number>,
            uselessCount: emailStats?.filter(e => e.is_useless).length || 0,
            accountCount: accounts?.length || 0,
            accountsByProvider: {} as Record<string, number>,
            recentSyncs: recentLogs || [],
        };

        // Count by category
        for (const email of emailStats || []) {
            const cat = email.category || 'uncategorized';
            stats.categoryCounts[cat] = (stats.categoryCounts[cat] || 0) + 1;

            const action = email.action_taken || 'none';
            stats.actionCounts[action] = (stats.actionCounts[action] || 0) + 1;
        }

        // Count by provider
        for (const account of accounts || []) {
            stats.accountsByProvider[account.provider] =
                (stats.accountsByProvider[account.provider] || 0) + 1;
        }

        res.json({ stats });
    })
);

export default router;
