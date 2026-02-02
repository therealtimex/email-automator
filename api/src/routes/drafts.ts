import { Router } from 'express';
import { asyncHandler, NotFoundError } from '../middleware/errorHandler.js';
import { authMiddleware } from '../middleware/auth.js';
import { apiRateLimit } from '../middleware/rateLimit.js';
import { getGmailService } from '../services/gmail.js';
import { getMicrosoftService } from '../services/microsoft.js';
import { createLogger } from '../utils/logger.js';

const router = Router();
const logger = createLogger('DraftsRoutes');

// List drafts
router.get('/',
    apiRateLimit,
    authMiddleware,
    asyncHandler(async (req, res) => {
        const {
            limit = '100',
            offset = '0',
            status = 'pending',
            account_id
        } = req.query;

        let query = req.supabase!
            .from('emails')
            .select(`
                id, subject, sender, recipient, date,
                draft_status, draft_created_at, draft_content, ai_analysis,
                account_id, external_id, draft_id,
                email_accounts!inner(id, user_id, email_address, provider)
            `, { count: 'exact' })
            .eq('email_accounts.user_id', req.user!.id)
            .eq('draft_status', status)
            .order('draft_created_at', { ascending: false })
            .range(
                parseInt(offset as string, 10),
                parseInt(offset as string, 10) + parseInt(limit as string, 10) - 1
            );

        if (account_id) {
            query = query.eq('account_id', account_id);
        }

        const { data, error, count } = await query;

        if (error) throw error;

        res.json({
            drafts: data || [],
            total: count || 0
        });
    })
);

// Send draft
router.post('/:emailId/send',
    apiRateLimit,
    authMiddleware,
    asyncHandler(async (req, res) => {
        const { emailId } = req.params;
        const userId = req.user!.id;

        // Fetch email with account info and SECURITY CHECK in query
        const { data: email, error } = await req.supabase!
            .from('emails')
            .select('*, email_accounts!inner(*)')
            .eq('id', emailId)
            .eq('email_accounts.user_id', userId) // Security: Ensure user owns the account
            .single();

        if (error || !email) {
            throw new NotFoundError('Email');
        }

        // if (email.email_accounts.user_id !== userId) {
        //     throw new NotFoundError('Email');
        // }

        const account = email.email_accounts;
        // CRITICAL: Priority Definition
        // 1. draft_content (User edits / Persisted draft) overrides everything
        // 2. ai_analysis.draft_response (Fallback if no manual content)
        const draftContent = email.draft_content ?? email.ai_analysis?.draft_response;

        logger.debug('Sending draft', {
            emailId,
            hasDraftContent: !!email.draft_content,
            hasAiDraft: !!email.ai_analysis?.draft_response,
            contentLength: draftContent?.length || 0,
            analysisKeys: email.ai_analysis ? Object.keys(email.ai_analysis) : []
        });

        if (!draftContent) {
            logger.warn('Draft content missing', {
                emailId, emailData: {
                    draft_content: email.draft_content,
                    ai_analysis: email.ai_analysis
                }
            });
            return res.status(400).json({
                error: 'No draft content found for this email',
                details: 'Both draft_content and ai_analysis.draft_response are empty'
            });
        }

        let sentMessageId: string | null = null;
        const replyToId = email.external_id;

        try {
            // Priority: Send existing draft if ID exists (cleaner, preserves original draft object)
            if (email.draft_id) {
                if (account.provider === 'gmail') {
                    const gmailService = getGmailService();
                    sentMessageId = await gmailService.sendDraft(account, email.draft_id);
                } else if (account.provider === 'outlook') {
                    const microsoftService = getMicrosoftService();
                    sentMessageId = await microsoftService.sendDraft(account, email.draft_id);
                }
                logger.info('Sent existing draft', { draftId: email.draft_id, sentMessageId });
            }
            // Fallback: Create new reply using content (if draft object was deleted externally or not saved)
            else {
                if (account.provider === 'gmail') {
                    const gmailService = getGmailService();
                    // Send reply
                    sentMessageId = await gmailService.sendReply(
                        account,
                        replyToId,
                        draftContent,
                        email.subject || ''
                    );
                } else if (account.provider === 'outlook') {
                    const microsoftService = getMicrosoftService();
                    sentMessageId = await microsoftService.sendReply(
                        account,
                        replyToId,
                        draftContent
                    );
                }
                logger.info('Sent draft via reply', { sentMessageId });
            }

            // Update email status
            await req.supabase!
                .from('emails')
                .update({
                    draft_status: 'sent',
                    draft_sent_at: new Date().toISOString(),
                    action_taken: 'reply', // Legacy compatibility
                    actions_taken: ['reply']
                })
                .eq('id', emailId);

            res.json({ success: true, messageId: sentMessageId || email.draft_id });

        } catch (error: any) {
            logger.error('Failed to send draft', error, { emailId });
            res.status(500).json({
                error: 'Failed to send draft',
                details: error.message
            });
        }
    })
);

// Dismiss draft
router.post('/:emailId/dismiss',
    apiRateLimit,
    authMiddleware,
    asyncHandler(async (req, res) => {
        const { emailId } = req.params;

        // Verify ownership
        const { data: email, error } = await req.supabase!
            .from('emails')
            .select('id, email_accounts!inner(user_id)')
            .eq('id', emailId)
            .eq('email_accounts.user_id', req.user!.id)
            .single();

        if (error || !email) {
            throw new NotFoundError('Email');
        }

        // Update status to dismissed
        const { error: updateError } = await req.supabase!
            .from('emails')
            .update({
                draft_status: 'dismissed',
                draft_dismissed_at: new Date().toISOString()
            })
            .eq('id', emailId);

        if (updateError) throw updateError;

        res.json({ success: true });
    })
);

export default router;
