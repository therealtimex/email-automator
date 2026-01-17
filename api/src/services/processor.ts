import { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { getGmailService, GmailMessage } from './gmail.js';
import { getMicrosoftService, OutlookMessage } from './microsoft.js';
import { getIntelligenceService, EmailAnalysis } from './intelligence.js';
import { EmailAccount, Email, Rule, ProcessingLog } from './supabase.js';
import { EventLogger } from './eventLogger.js';

const logger = createLogger('Processor');

export interface ProcessingResult {
    processed: number;
    deleted: number;
    drafted: number;
    errors: number;
}

export class EmailProcessorService {
    private supabase: SupabaseClient;
    private gmailService = getGmailService();
    private microsoftService = getMicrosoftService();

    constructor(supabase: SupabaseClient) {
        this.supabase = supabase;
    }

    async syncAccount(accountId: string, userId: string): Promise<ProcessingResult> {
        const result: ProcessingResult = { processed: 0, deleted: 0, drafted: 0, errors: 0 };

        // Create processing log
        const { data: log } = await this.supabase
            .from('processing_logs')
            .insert({
                user_id: userId,
                status: 'running',
            })
            .select()
            .single();

        try {
            // Fetch account
            const { data: account, error: accError } = await this.supabase
                .from('email_accounts')
                .select('*')
                .eq('id', accountId)
                .eq('user_id', userId)
                .single();

            if (accError || !account) {
                throw new Error('Account not found or access denied');
            }

            // Refresh token if needed
            let refreshedAccount = account;
            if (account.provider === 'gmail') {
                refreshedAccount = await this.gmailService.refreshTokenIfNeeded(this.supabase, account);
            }

            // Update status to syncing
            await this.supabase
                .from('email_accounts')
                .update({
                    last_sync_status: 'syncing',
                    last_sync_at: new Date().toISOString()
                })
                .eq('id', accountId);

            // Fetch user's rules
            const { data: rules } = await this.supabase
                .from('rules')
                .select('*')
                .eq('user_id', userId)
                .eq('is_enabled', true);

            // Fetch user settings for AI preferences
            const { data: settings } = await this.supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', userId)
                .single();

            const eventLogger = log ? new EventLogger(this.supabase, log.id) : null;
            if (eventLogger) await eventLogger.info('Running', 'Starting sync process');

            // Process based on provider
            if (refreshedAccount.provider === 'gmail') {
                await this.processGmailAccount(refreshedAccount, rules || [], settings, result, eventLogger);
            } else if (refreshedAccount.provider === 'outlook') {
                await this.processOutlookAccount(refreshedAccount, rules || [], settings, result, eventLogger);
            }

            // Update log and account on success
            if (log) {
                await this.supabase
                    .from('processing_logs')
                    .update({
                        status: 'success',
                        completed_at: new Date().toISOString(),
                        emails_processed: result.processed,
                        emails_deleted: result.deleted,
                        emails_drafted: result.drafted,
                    })
                    .eq('id', log.id);
            }

            await this.supabase
                .from('email_accounts')
                .update({
                    last_sync_status: 'success',
                    last_sync_error: null
                })
                .eq('id', accountId);

            logger.info('Sync completed', { accountId, ...result });
        } catch (error) {
            logger.error('Sync failed', error, { accountId });

            if (log) {
                await this.supabase
                    .from('processing_logs')
                    .update({
                        status: 'failed',
                        completed_at: new Date().toISOString(),
                        error_message: error instanceof Error ? error.message : 'Unknown error',
                    })
                    .eq('id', log.id);
            }

            await this.supabase
                .from('email_accounts')
                .update({
                    last_sync_status: 'error',
                    last_sync_error: error instanceof Error ? error.message : 'Unknown error'
                })
                .eq('id', accountId);

            throw error;
        }

        return result;
    }

    private async processGmailAccount(
        account: EmailAccount,
        rules: Rule[],
        settings: any,
        result: ProcessingResult,
        eventLogger: EventLogger | null
    ): Promise<void> {
        const batchSize = account.sync_max_emails_per_run || config.processing.batchSize;

        // Construct query
        let query = '';
        if (account.last_sync_checkpoint) {
            const lastSyncSeconds = Math.floor(parseInt(account.last_sync_checkpoint) / 1000);
            query = `after:${lastSyncSeconds}`;
        } else if (account.sync_start_date) {
            const startSeconds = Math.floor(new Date(account.sync_start_date).getTime() / 1000);
            query = `after:${startSeconds}`;
        }
        
        if (eventLogger) await eventLogger.info('Fetching', 'Fetching emails from Gmail', { query, batchSize });

        const { messages } = await this.gmailService.fetchMessages(account, {
            maxResults: batchSize,
            query: query || undefined,
        });
        
        if (eventLogger) await eventLogger.info('Fetching', `Fetched ${messages.length} emails`);

        let maxInternalDate = account.last_sync_checkpoint ? parseInt(account.last_sync_checkpoint) : 0;

        for (const message of messages) {
            try {
                // Get internalDate from Gmail message if possible
                // We need to fetch details again or modify GmailService to return it
                // For now, we'll use the date from headers which is what parseMessage returns
                // But internalDate is more reliable for checkpoints.
                // Re-viewing parseMessage shows it doesn't return internalDate.
                await this.processMessage(account, message, rules, settings, result, eventLogger);

                // Track progress for checkpoint (simplified: using Date.now() for next time, 
                // or better: the date of the message)
                const msgDate = new Date(message.date).getTime();
                if (msgDate > maxInternalDate) maxInternalDate = msgDate;
            } catch (error) {
                logger.error('Failed to process Gmail message', error, { messageId: message.id });
                if (eventLogger) await eventLogger.error('Error', error);
                result.errors++;
            }
        }

        // Update checkpoint
        if (maxInternalDate > (account.last_sync_checkpoint ? parseInt(account.last_sync_checkpoint) : 0)) {
            await this.supabase
                .from('email_accounts')
                .update({ last_sync_checkpoint: maxInternalDate.toString() })
                .eq('id', account.id);
        }
    }

    private async processOutlookAccount(
        account: EmailAccount,
        rules: Rule[],
        settings: any,
        result: ProcessingResult,
        eventLogger: EventLogger | null
    ): Promise<void> {
        const batchSize = account.sync_max_emails_per_run || config.processing.batchSize;

        // Construct filter
        let filter = '';
        if (account.last_sync_checkpoint) {
            filter = `receivedDateTime gt ${account.last_sync_checkpoint}`;
        } else if (account.sync_start_date) {
            filter = `receivedDateTime ge ${new Date(account.sync_start_date).toISOString()}`;
        }

        if (eventLogger) await eventLogger.info('Fetching', 'Fetching emails from Outlook', { filter, batchSize });

        const { messages } = await this.microsoftService.fetchMessages(account, {
            top: batchSize,
            filter: filter || undefined,
        });
        
        if (eventLogger) await eventLogger.info('Fetching', `Fetched ${messages.length} emails`);

        let latestCheckpoint = account.last_sync_checkpoint || '';

        for (const message of messages) {
            try {
                await this.processMessage(account, message, rules, settings, result, eventLogger);

                if (!latestCheckpoint || message.date > latestCheckpoint) {
                    latestCheckpoint = message.date;
                }
            } catch (error) {
                logger.error('Failed to process Outlook message', error, { messageId: message.id });
                if (eventLogger) await eventLogger.error('Error', error);
                result.errors++;
            }
        }

        // Update checkpoint
        if (latestCheckpoint && latestCheckpoint !== account.last_sync_checkpoint) {
            await this.supabase
                .from('email_accounts')
                .update({ last_sync_checkpoint: latestCheckpoint })
                .eq('id', account.id);
        }
    }

    private async processMessage(
        account: EmailAccount,
        message: GmailMessage | OutlookMessage,
        rules: Rule[],
        settings: any,
        result: ProcessingResult,
        eventLogger: EventLogger | null
    ): Promise<void> {
        // Check if already processed
        const { data: existing } = await this.supabase
            .from('emails')
            .select('id')
            .eq('account_id', account.id)
            .eq('external_id', message.id)
            .single();

        if (existing) {
            logger.debug('Message already processed', { messageId: message.id });
            if (eventLogger) await eventLogger.info('Skipped', `Already processed: ${message.subject}`);
            return;
        }
        
        if (eventLogger) await eventLogger.info('Processing', `Processing email: ${message.subject}`);

        // Analyze with AI
        const intelligenceService = getIntelligenceService(
            settings?.llm_model || settings?.llm_base_url || settings?.llm_api_key
                ? {
                    model: settings.llm_model,
                    baseUrl: settings.llm_base_url,
                    apiKey: settings.llm_api_key,
                }
                : undefined
        );

        const analysis = await intelligenceService.analyzeEmail(message.body, {
            subject: message.subject,
            sender: message.sender,
            date: message.date,
            userPreferences: {
                autoTrashSpam: settings?.auto_trash_spam,
                smartDrafts: settings?.smart_drafts,
            },
        }, eventLogger || undefined);

        // Save to database
        const emailData: Partial<Email> = {
            account_id: account.id,
            external_id: message.id,
            subject: message.subject,
            sender: message.sender,
            recipient: message.recipient,
            date: message.date ? new Date(message.date).toISOString() : null,
            body_snippet: message.snippet || message.body.substring(0, 500),
            category: analysis?.category || null,
            is_useless: analysis?.is_useless || false,
            ai_analysis: analysis as any,
            suggested_actions: analysis?.suggested_actions || [],
            suggested_action: analysis?.suggested_actions?.[0] || 'none', // Fallback
        };

        const { data: savedEmail } = await this.supabase
            .from('emails')
            .insert(emailData)
            .select()
            .single();
            
        // Log email created event? Maybe redundant if we have analysis event.

        result.processed++;

        // Execute automation rules
        if (analysis && savedEmail) {
            await this.executeRules(account, savedEmail, analysis, rules, settings, result, eventLogger);
        }
    }

    private async executeRules(
        account: EmailAccount,
        email: Email,
        analysis: EmailAnalysis,
        rules: Rule[],
        settings: any,
        result: ProcessingResult,
        eventLogger: EventLogger | null
    ): Promise<void> {
        // Auto-trash spam
        if (settings?.auto_trash_spam && analysis.is_useless && analysis.category === 'spam') {
            await this.executeAction(account, email, 'delete', undefined, eventLogger, 'Auto-trash spam setting');
            result.deleted++;
            return;
        }

        // Smart drafts
        if (settings?.smart_drafts && analysis.suggested_action === 'reply' && analysis.draft_response) {
            await this.executeAction(account, email, 'draft', analysis.draft_response, eventLogger, 'Smart drafts setting');
            result.drafted++;
        }

        // User-defined rules
        for (const rule of rules) {
            if (this.matchesCondition(analysis, rule.condition)) {
                await this.executeAction(account, email, rule.action, undefined, eventLogger, `Rule: ${rule.name}`);

                if (rule.action === 'delete') result.deleted++;
                else if (rule.action === 'draft') result.drafted++;

                break; // Only execute first matching rule
            }
        }
    }

    private matchesCondition(analysis: EmailAnalysis, condition: Record<string, unknown>): boolean {
        for (const [key, value] of Object.entries(condition)) {
            if ((analysis as any)[key] !== value) {
                return false;
            }
        }
        return true;
    }

    private async executeAction(
        account: EmailAccount,
        email: Email,
        action: 'delete' | 'archive' | 'draft' | 'read' | 'star',
        draftContent?: string,
        eventLogger?: EventLogger | null,
        reason?: string
    ): Promise<void> {
        try {
            if (eventLogger) {
                await eventLogger.info('Acting', `Executing action: ${action}`, { emailId: email.id, reason });
            }

            if (account.provider === 'gmail') {
                if (action === 'delete') {
                    await this.gmailService.trashMessage(account, email.external_id);
                } else if (action === 'archive') {
                    await this.gmailService.archiveMessage(account, email.external_id);
                } else if (action === 'draft' && draftContent) {
                    await this.gmailService.createDraft(account, email.external_id, draftContent);
                } else if (action === 'read') {
                    await this.gmailService.markAsRead(account, email.external_id);
                } else if (action === 'star') {
                    await this.gmailService.starMessage(account, email.external_id);
                }
            } else if (account.provider === 'outlook') {
                if (action === 'delete') {
                    await this.microsoftService.trashMessage(account, email.external_id);
                } else if (action === 'archive') {
                    await this.microsoftService.archiveMessage(account, email.external_id);
                } else if (action === 'draft' && draftContent) {
                    await this.microsoftService.createDraft(account, email.external_id, draftContent);
                } else if (action === 'read') {
                    await this.microsoftService.markAsRead(account, email.external_id);
                } else if (action === 'star') {
                    await this.microsoftService.flagMessage(account, email.external_id);
                }
            }

            // Update email record
            await this.supabase
                .from('emails')
                .update({ action_taken: action })
                .eq('id', email.id);

            logger.debug('Action executed', { emailId: email.id, action });
            
            if (eventLogger) {
                await eventLogger.action('Acted', email.id, action, reason);
            }
        } catch (error) {
            logger.error('Failed to execute action', error, { emailId: email.id, action });
            if (eventLogger) {
                await eventLogger.error('Action Failed', error, email.id);
            }
            throw error;
        }
    }
}
