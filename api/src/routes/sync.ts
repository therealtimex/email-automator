import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authMiddleware } from '../middleware/auth.js';
import { syncRateLimit } from '../middleware/rateLimit.js';
import { validateBody, schemas } from '../middleware/validation.js';
import { EmailProcessorService } from '../services/processor.js';
import { createLogger } from '../utils/logger.js';

const router = Router();
const logger = createLogger('SyncRoutes');

// Trigger sync for an account
router.post('/',
    syncRateLimit,
    authMiddleware,
    validateBody(schemas.syncRequest),
    asyncHandler(async (req, res) => {
        const { accountId } = req.body;
        const userId = req.user!.id;

        if (!req.supabase) {
            return res.status(503).json({
                error: 'Supabase service is not configured. Please set your SUPABASE_URL and SUPABASE_ANON_KEY in the .env file and restart the server.'
            });
        }

        // Verify account ownership
        const { data: account, error } = await req.supabase!
            .from('email_accounts')
            .select('id')
            .eq('id', accountId)
            .eq('user_id', userId)
            .single();

        if (error || !account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        // Run sync and wait for result
        const processor = new EmailProcessorService(req.supabase!);

        try {
            const result = await processor.syncAccount(accountId, userId);
            logger.info('Sync completed', { accountId, ...result });
            res.json({
                message: 'Sync completed',
                accountId,
                ...result,
            });
        } catch (err) {
            logger.error('Sync failed', err, { accountId });
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            res.status(500).json({
                error: errorMessage,
                accountId,
            });
        }
    })
);

// Sync all accounts for user
router.post('/all',
    syncRateLimit,
    authMiddleware,
    asyncHandler(async (req, res) => {
        const userId = req.user!.id;

        if (!req.supabase) {
            return res.status(503).json({
                error: 'Supabase service is not configured. Please set your SUPABASE_URL and SUPABASE_ANON_KEY in the .env file and restart the server.'
            });
        }

        const { data: accounts, error } = await req.supabase!
            .from('email_accounts')
            .select('id')
            .eq('user_id', userId)
            .eq('is_active', true);

        if (error) throw error;

        if (!accounts || accounts.length === 0) {
            return res.status(400).json({ error: 'No connected accounts' });
        }

        const processor = new EmailProcessorService(req.supabase!);

        // Sync all accounts and collect results
        const results = await Promise.allSettled(
            accounts.map(account => processor.syncAccount(account.id, userId))
        );

        const summary = {
            total: accounts.length,
            success: 0,
            failed: 0,
            errors: [] as { accountId: string; error: string }[],
        };

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                summary.success++;
                logger.info('Sync completed', { accountId: accounts[index].id, ...result.value });
            } else {
                summary.failed++;
                const errorMessage = result.reason instanceof Error ? result.reason.message : 'Unknown error';
                summary.errors.push({ accountId: accounts[index].id, error: errorMessage });
                logger.error('Sync failed', result.reason, { accountId: accounts[index].id });
            }
        });

        // Return error status if all syncs failed
        if (summary.failed === summary.total) {
            return res.status(500).json({
                message: 'All syncs failed',
                ...summary,
            });
        }

        res.json({
            message: summary.failed > 0 ? 'Sync completed with errors' : 'Sync completed',
            ...summary,
        });
    })
);

// Get sync history/logs
router.get('/logs',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const { limit = '10' } = req.query;

        if (!req.supabase) {
            return res.status(503).json({
                error: 'Supabase service is not configured. Please set your SUPABASE_URL and SUPABASE_ANON_KEY in the .env file and restart the server.'
            });
        }

        const { data, error } = await req.supabase!
            .from('processing_logs')
            .select('*')
            .eq('user_id', req.user!.id)
            .order('started_at', { ascending: false })
            .limit(parseInt(limit as string, 10));

        if (error) throw error;

        res.json({ logs: data || [] });
    })
);

export default router;
