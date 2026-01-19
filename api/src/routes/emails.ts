import { Router } from 'express';
import { asyncHandler, NotFoundError } from '../middleware/errorHandler.js';
import { authMiddleware } from '../middleware/auth.js';
import { apiRateLimit } from '../middleware/rateLimit.js';
import { createLogger } from '../utils/logger.js';

const router = Router();
const logger = createLogger('EmailsRoutes');

// List emails with pagination and filters
router.get('/',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const {
            limit = '20',
            offset = '0',
            category,
            is_useless,
            account_id,
            action_taken,
            search,
            sort_by = 'date',
            sort_order = 'desc'
        } = req.query;

        // Validate sort params
        const validSortFields = ['date', 'created_at'];
        const sortField = validSortFields.includes(sort_by as string) ? sort_by as string : 'date';
        const isAscending = sort_order === 'asc';

        let query = req.supabase!
            .from('emails')
            .select(`
                *,
                email_accounts!inner(id, user_id, email_address, provider)
            `, { count: 'exact' })
            .eq('email_accounts.user_id', req.user!.id)
            .order(sortField, { ascending: isAscending })
            .range(
                parseInt(offset as string, 10),
                parseInt(offset as string, 10) + parseInt(limit as string, 10) - 1
            );

        // Apply filters
        if (category) {
            query = query.eq('category', category);
        }
        if (is_useless !== undefined) {
            query = query.eq('is_useless', is_useless === 'true');
        }
        if (account_id) {
            query = query.eq('account_id', account_id);
        }
        if (action_taken) {
            query = query.eq('action_taken', action_taken);
        }
        if (search) {
            query = query.or(`subject.ilike.%${search}%,sender.ilike.%${search}%`);
        }

        const { data, error, count } = await query;

        if (error) throw error;

        res.json({
            emails: data || [],
            total: count || 0,
            limit: parseInt(limit as string, 10),
            offset: parseInt(offset as string, 10),
        });
    })
);

// Get single email
router.get('/:emailId',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const { emailId } = req.params;

        const { data, error } = await req.supabase!
            .from('emails')
            .select(`
                *,
                email_accounts!inner(id, user_id, email_address, provider)
            `)
            .eq('id', emailId)
            .eq('email_accounts.user_id', req.user!.id)
            .single();

        if (error || !data) {
            throw new NotFoundError('Email');
        }

        res.json({ email: data });
    })
);

// Delete email record (not the actual email from provider)
router.delete('/:emailId',
    apiRateLimit,
    authMiddleware,
    asyncHandler(async (req, res) => {
        const { emailId } = req.params;

        // Verify ownership first
        const { data: email } = await req.supabase!
            .from('emails')
            .select('id, email_accounts!inner(user_id)')
            .eq('id', emailId)
            .eq('email_accounts.user_id', req.user!.id)
            .single();

        if (!email) {
            throw new NotFoundError('Email');
        }

        const { error } = await req.supabase!
            .from('emails')
            .delete()
            .eq('id', emailId);

        if (error) throw error;

        logger.info('Email record deleted', { emailId, userId: req.user!.id });

        res.json({ success: true });
    })
);

// Get email categories summary
router.get('/summary/categories',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const { data, error } = await req.supabase!
            .from('emails')
            .select('category, email_accounts!inner(user_id)')
            .eq('email_accounts.user_id', req.user!.id);

        if (error) throw error;

        const summary: Record<string, number> = {};
        for (const email of data || []) {
            const cat = email.category || 'uncategorized';
            summary[cat] = (summary[cat] || 0) + 1;
        }

        res.json({ categories: summary });
    })
);

export default router;
