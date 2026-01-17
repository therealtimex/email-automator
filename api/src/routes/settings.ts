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
        // Fetch settings and integrations in parallel
        const [settingsResult, integrationsResult] = await Promise.all([
            req.supabase!
                .from('user_settings')
                .select('*')
                .eq('user_id', req.user!.id)
                .single(),
            req.supabase!
                .from('integrations')
                .select('*')
                .eq('user_id', req.user!.id)
        ]);

        const settingsData = settingsResult.data;
        const integrationsData = integrationsResult.data || [];

        // Return defaults if no settings exist
        const settings = settingsData || {
            llm_model: null,
            llm_base_url: null,
            auto_trash_spam: false,
            smart_drafts: false,
            sync_interval_minutes: 5,
        };

        // Merge integration credentials back into settings for frontend compatibility
        const googleIntegration = integrationsData.find((i: any) => i.provider === 'google');
        if (googleIntegration?.credentials) {
            settings.google_client_id = googleIntegration.credentials.client_id;
            settings.google_client_secret = googleIntegration.credentials.client_secret;
        }

        const microsoftIntegration = integrationsData.find((i: any) => i.provider === 'microsoft');
        if (microsoftIntegration?.credentials) {
            settings.microsoft_client_id = microsoftIntegration.credentials.client_id;
            settings.microsoft_client_secret = microsoftIntegration.credentials.client_secret;
            settings.microsoft_tenant_id = microsoftIntegration.credentials.tenant_id;
        }

        res.json({ settings });
    })
);

// Update user settings
router.patch('/',
    apiRateLimit,
    authMiddleware,
    validateBody(schemas.updateSettings),
    asyncHandler(async (req, res) => {
        const {
            google_client_id,
            google_client_secret,
            microsoft_client_id,
            microsoft_client_secret,
            microsoft_tenant_id,
            ...userSettingsUpdates
        } = req.body;
        
        const userId = req.user!.id;

        // 1. Update user_settings
        const { data: updatedSettings, error: settingsError } = await req.supabase!
            .from('user_settings')
            .upsert({
                user_id: userId,
                ...userSettingsUpdates,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' })
            .select()
            .single();

        if (settingsError) throw settingsError;

        // 2. Handle Google Integration
        if (google_client_id || google_client_secret) {
            const { data: existing } = await req.supabase!
                .from('integrations')
                .select('credentials')
                .eq('user_id', userId)
                .eq('provider', 'google')
                .single();
                
            const credentials: any = {};
            if (google_client_id) credentials.client_id = google_client_id;
            if (google_client_secret) credentials.client_secret = google_client_secret;

            const newCredentials = { ...(existing?.credentials || {}), ...credentials };

            await req.supabase!
                .from('integrations')
                .upsert({
                    user_id: userId,
                    provider: 'google',
                    credentials: newCredentials,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id, provider' });
        }

        // 3. Handle Microsoft Integration
        if (microsoft_client_id || microsoft_client_secret || microsoft_tenant_id) {
             const { data: existing } = await req.supabase!
                .from('integrations')
                .select('credentials')
                .eq('user_id', userId)
                .eq('provider', 'microsoft')
                .single();

             const credentials: any = {};
             if (microsoft_client_id) credentials.client_id = microsoft_client_id;
             if (microsoft_client_secret) credentials.client_secret = microsoft_client_secret;
             if (microsoft_tenant_id) credentials.tenant_id = microsoft_tenant_id;

             const newCredentials = { ...(existing?.credentials || {}), ...credentials };

            await req.supabase!
                .from('integrations')
                .upsert({
                    user_id: userId,
                    provider: 'microsoft',
                    credentials: newCredentials,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id, provider' });
        }

        // Construct response with merged values
        const finalSettings = {
            ...updatedSettings,
            // Re-inject the values from request if they were present
            ...(google_client_id ? { google_client_id } : {}),
            ...(google_client_secret ? { google_client_secret } : {}),
            ...(microsoft_client_id ? { microsoft_client_id } : {}),
            ...(microsoft_client_secret ? { microsoft_client_secret } : {}),
            ...(microsoft_tenant_id ? { microsoft_tenant_id } : {}),
        };

        logger.info('Settings updated', { userId });

        res.json({ settings: finalSettings });
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
