import { Router } from 'express';
import { asyncHandler, NotFoundError } from '../middleware/errorHandler.js';
import { authMiddleware } from '../middleware/auth.js';
import { apiRateLimit } from '../middleware/rateLimit.js';
import { validateBody, schemas } from '../middleware/validation.js';
import { getGmailService } from '../services/gmail.js';
import { getMicrosoftService } from '../services/microsoft.js';
import { getIntelligenceService } from '../services/intelligence.js';
import { createLogger } from '../utils/logger.js';

const router = Router();
const logger = createLogger('ActionRoutes');

// Execute action on email
router.post('/execute',
    apiRateLimit,
    authMiddleware,
    validateBody(schemas.executeAction),
    asyncHandler(async (req, res) => {
        const { emailId, action, draftContent } = req.body;
        const userId = req.user!.id;

        // Fetch email with account info
        const { data: email, error } = await req.supabase!
            .from('emails')
            .select('*, email_accounts(*)')
            .eq('id', emailId)
            .single();

        if (error || !email) {
            throw new NotFoundError('Email');
        }

        // Verify ownership
        if (email.email_accounts.user_id !== userId) {
            throw new NotFoundError('Email');
        }

        const account = email.email_accounts;
        let actionResult = { success: true, details: '' };

        if (action === 'none') {
            // Just mark as reviewed
            await req.supabase!
                .from('emails')
                .update({ action_taken: 'none' })
                .eq('id', emailId);
        } else if (account.provider === 'gmail') {
            const gmailService = getGmailService();
            
            if (action === 'delete') {
                await gmailService.trashMessage(account, email.external_id);
            } else if (action === 'archive') {
                await gmailService.archiveMessage(account, email.external_id);
            } else if (action === 'draft') {
                const content = draftContent || email.ai_analysis?.draft_response || '';
                if (content) {
                    const draftId = await gmailService.createDraft(account, email.external_id, content);
                    actionResult.details = `Draft created: ${draftId}`;
                }
            } else if (action === 'flag') {
                await gmailService.addLabel(account, email.external_id, ['STARRED']);
            }

            await req.supabase!
                .from('emails')
                .update({ action_taken: action })
                .eq('id', emailId);
        } else if (account.provider === 'outlook') {
            const microsoftService = getMicrosoftService();
            
            if (action === 'delete') {
                await microsoftService.trashMessage(account, email.external_id);
            } else if (action === 'archive') {
                await microsoftService.archiveMessage(account, email.external_id);
            } else if (action === 'draft') {
                const content = draftContent || email.ai_analysis?.draft_response || '';
                if (content) {
                    const draftId = await microsoftService.createDraft(account, email.external_id, content);
                    actionResult.details = `Draft created: ${draftId}`;
                }
            }

            await req.supabase!
                .from('emails')
                .update({ action_taken: action })
                .eq('id', emailId);
        }

        logger.info('Action executed', { emailId, action, userId });

        res.json(actionResult);
    })
);

// Generate AI draft for an email
router.post('/draft/:emailId',
    apiRateLimit,
    authMiddleware,
    asyncHandler(async (req, res) => {
        const { emailId } = req.params;
        const { instructions } = req.body;
        const userId = req.user!.id;

        // Fetch email
        const { data: email, error } = await req.supabase!
            .from('emails')
            .select('*, email_accounts(user_id)')
            .eq('id', emailId)
            .single();

        if (error || !email) {
            throw new NotFoundError('Email');
        }

        if (email.email_accounts.user_id !== userId) {
            throw new NotFoundError('Email');
        }

        // Get user settings for LLM config
        const { data: settings } = await req.supabase!
            .from('user_settings')
            .select('llm_model, llm_base_url')
            .eq('user_id', userId)
            .single();

        const intelligenceService = getIntelligenceService(
            settings ? { model: settings.llm_model, baseUrl: settings.llm_base_url } : undefined
        );

        const draft = await intelligenceService.generateDraftReply(
            {
                subject: email.subject,
                sender: email.sender,
                body: email.body_snippet,
            },
            instructions
        );

        if (!draft) {
            return res.status(500).json({ error: 'Failed to generate draft' });
        }

        res.json({ draft });
    })
);

// Bulk actions
router.post('/bulk',
    apiRateLimit,
    authMiddleware,
    asyncHandler(async (req, res) => {
        const { emailIds, action } = req.body;
        const userId = req.user!.id;

        if (!Array.isArray(emailIds) || emailIds.length === 0) {
            return res.status(400).json({ error: 'emailIds must be a non-empty array' });
        }

        if (!['delete', 'archive', 'none'].includes(action)) {
            return res.status(400).json({ error: 'Invalid action for bulk operation' });
        }

        const results = { success: 0, failed: 0 };

        for (const emailId of emailIds) {
            try {
                // Fetch email
                const { data: email } = await req.supabase!
                    .from('emails')
                    .select('*, email_accounts(*)')
                    .eq('id', emailId)
                    .single();

                if (!email || email.email_accounts.user_id !== userId) {
                    results.failed++;
                    continue;
                }

                const account = email.email_accounts;

                if (account.provider === 'gmail') {
                    const gmailService = getGmailService();
                    if (action === 'delete') {
                        await gmailService.trashMessage(account, email.external_id);
                    } else if (action === 'archive') {
                        await gmailService.archiveMessage(account, email.external_id);
                    }
                } else if (account.provider === 'outlook') {
                    const microsoftService = getMicrosoftService();
                    if (action === 'delete') {
                        await microsoftService.trashMessage(account, email.external_id);
                    } else if (action === 'archive') {
                        await microsoftService.archiveMessage(account, email.external_id);
                    }
                }

                await req.supabase!
                    .from('emails')
                    .update({ action_taken: action })
                    .eq('id', emailId);

                results.success++;
            } catch (err) {
                logger.error('Bulk action failed for email', err, { emailId });
                results.failed++;
            }
        }

        res.json(results);
    })
);

export default router;
