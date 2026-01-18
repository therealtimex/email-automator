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

// Execute action(s) on email - supports both single action and array of actions
router.post('/execute',
    apiRateLimit,
    authMiddleware,
    validateBody(schemas.executeAction),
    asyncHandler(async (req, res) => {
        const { emailId, action, actions, draftContent } = req.body;
        const userId = req.user!.id;

        // Support both single action (legacy) and actions array
        const actionsToExecute: string[] = actions && actions.length > 0
            ? actions
            : (action ? [action] : []);

        if (actionsToExecute.length === 0) {
            return res.status(400).json({ error: 'No actions specified' });
        }

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
        const actionResults: { action: string; success: boolean; details?: string }[] = [];

        for (const currentAction of actionsToExecute) {
            try {
                let details = '';

                if (currentAction === 'none') {
                    // Just mark as reviewed, no provider action needed
                } else if (account.provider === 'gmail') {
                    const gmailService = getGmailService();

                    if (currentAction === 'delete') {
                        await gmailService.trashMessage(account, email.external_id);
                    } else if (currentAction === 'archive') {
                        await gmailService.archiveMessage(account, email.external_id);
                    } else if (currentAction === 'draft') {
                        const content = draftContent || email.ai_analysis?.draft_response || '';
                        if (content) {
                            const draftId = await gmailService.createDraft(account, email.external_id, content);
                            details = `Draft created: ${draftId}`;
                        }
                    } else if (currentAction === 'flag') {
                        await gmailService.addLabel(account, email.external_id, ['STARRED']);
                    } else if (currentAction === 'read') {
                        await gmailService.markAsRead(account, email.external_id);
                    } else if (currentAction === 'star') {
                        await gmailService.starMessage(account, email.external_id);
                    }
                } else if (account.provider === 'outlook') {
                    const microsoftService = getMicrosoftService();

                    if (currentAction === 'delete') {
                        await microsoftService.trashMessage(account, email.external_id);
                    } else if (currentAction === 'archive') {
                        await microsoftService.archiveMessage(account, email.external_id);
                    } else if (currentAction === 'draft') {
                        const content = draftContent || email.ai_analysis?.draft_response || '';
                        if (content) {
                            const draftId = await microsoftService.createDraft(account, email.external_id, content);
                            details = `Draft created: ${draftId}`;
                        }
                    } else if (currentAction === 'read') {
                        await microsoftService.markAsRead(account, email.external_id);
                    } else if (currentAction === 'star' || currentAction === 'flag') {
                        await microsoftService.flagMessage(account, email.external_id);
                    }
                }

                // Record this action using atomic append
                await req.supabase!.rpc('append_email_action', {
                    p_email_id: emailId,
                    p_action: currentAction
                });

                actionResults.push({ action: currentAction, success: true, details: details || undefined });
            } catch (err) {
                logger.error('Action failed', err, { emailId, action: currentAction });
                actionResults.push({
                    action: currentAction,
                    success: false,
                    details: err instanceof Error ? err.message : 'Unknown error'
                });
            }
        }

        // Update legacy column with first action for backward compatibility
        await req.supabase!
            .from('emails')
            .update({ action_taken: actionsToExecute[0] })
            .eq('id', emailId);

        logger.info('Actions executed', { emailId, actions: actionsToExecute, userId });

        res.json({
            success: actionResults.every(r => r.success),
            results: actionResults,
            // Legacy field for backward compatibility
            details: actionResults.map(r => r.details).filter(Boolean).join('; ')
        });
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
