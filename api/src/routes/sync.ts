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

        // Start sync in background
        const processor = new EmailProcessorService(req.supabase!);
        
        // Don't await - run in background
        processor.syncAccount(accountId, userId)
            .then(result => {
                logger.info('Background sync completed', { accountId, ...result });
            })
            .catch(err => {
                logger.error('Background sync failed', err, { accountId });
            });

        res.json({ 
            message: 'Sync started',
            accountId,
        });
    })
);

// Sync all accounts for user
router.post('/all',
    syncRateLimit,
    authMiddleware,
    asyncHandler(async (req, res) => {
        const userId = req.user!.id;

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

        // Start syncs in background
        for (const account of accounts) {
            processor.syncAccount(account.id, userId)
                .then(result => {
                    logger.info('Background sync completed', { accountId: account.id, ...result });
                })
                .catch(err => {
                    logger.error('Background sync failed', err, { accountId: account.id });
                });
        }

        res.json({
            message: 'Sync started for all accounts',
            accountCount: accounts.length,
        });
    })
);

// Get sync history/logs
router.get('/logs',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const { limit = '10' } = req.query;

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
