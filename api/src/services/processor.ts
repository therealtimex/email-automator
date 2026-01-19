import { SupabaseClient } from '@supabase/supabase-js';
import { simpleParser } from 'mailparser';
import { createLogger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { getGmailService, GmailMessage } from './gmail.js';
import { getMicrosoftService, OutlookMessage } from './microsoft.js';
import { getIntelligenceService, EmailAnalysis } from './intelligence.js';
import { getStorageService } from './storage.js';
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
    private storageService = getStorageService();

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
                account_id: accountId,
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

            // After processing new emails, run retention rules for this account
            await this.runRetentionRules(refreshedAccount, rules || [], settings, result, eventLogger);

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

            const errMsg = error instanceof Error ? error.message : 'Unknown error';

            if (log) {
                await this.supabase
                    .from('processing_logs')
                    .update({
                        status: 'failed',
                        completed_at: new Date().toISOString(),
                        error_message: errMsg,
                    })
                    .eq('id', log.id);
            }

            await this.supabase
                .from('email_accounts')
                .update({
                    last_sync_status: 'error',
                    last_sync_error: errMsg
                })
                .eq('id', accountId);

            // If it's a fatal setup error (e.g. Account not found), throw it
            if (errMsg.includes('Account not found') || errMsg.includes('access denied')) {
                throw error;
            }
            
            // Otherwise, increment error count and return partial results
            result.errors++;
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

        // Debug: Log account sync settings
        logger.info('Gmail sync settings', {
            accountId: account.id,
            sync_start_date: account.sync_start_date,
            last_sync_checkpoint: account.last_sync_checkpoint,
            sync_max_emails_per_run: account.sync_max_emails_per_run,
        });

        // Construct query: Use sync_start_date if present (Override), otherwise checkpoint
        let effectiveStartMs = 0;
        if (account.sync_start_date) {
            effectiveStartMs = new Date(account.sync_start_date).getTime();
            logger.info('Using sync_start_date override', { effectiveStartMs, date: new Date(effectiveStartMs).toISOString() });
        } else if (account.last_sync_checkpoint) {
            effectiveStartMs = parseInt(account.last_sync_checkpoint);
            logger.info('Using last_sync_checkpoint', { effectiveStartMs, date: new Date(effectiveStartMs).toISOString() });
        }

        let query = '';
        if (effectiveStartMs > 0) {
            // Subtract 1 second to make query inclusive (Gmail's after: is exclusive)
            // This ensures we don't miss emails at the exact checkpoint timestamp
            const startSeconds = Math.floor(effectiveStartMs / 1000) - 1;
            query = `after:${startSeconds}`;
        }

        logger.info('Final Gmail query', { query, effectiveDate: new Date(effectiveStartMs).toISOString() });

        if (eventLogger) await eventLogger.info('Fetching', 'Fetching emails from Gmail (oldest first)', {
            query,
            batchSize,
            sync_start_date: account.sync_start_date,
            last_sync_checkpoint: account.last_sync_checkpoint,
            effectiveDate: new Date(effectiveStartMs).toISOString()
        });

        // Use "Fetch IDs → Sort → Hydrate" strategy to get OLDEST emails first
        // Gmail API always returns newest first, so we must fetch all IDs, sort, then hydrate
        // This prevents skipping emails when using max_emails pagination
        const { messages, hasMore } = await this.gmailService.fetchMessagesOldestFirst(account, {
            limit: batchSize,
            query: query || undefined,
            maxIdsToFetch: 1000, // Safety limit for ID fetching
        });

        if (eventLogger) {
            await eventLogger.info('Fetching', `Fetched ${messages.length} emails (oldest first)${hasMore ? ', more available' : ''}`);
        }

        // Initialize max tracking with effective start time to allow checkpoint to update relative to current run
        let maxInternalDate = effectiveStartMs;

        for (const message of messages) {
            try {
                await this.processMessage(account, message, rules, settings, result, eventLogger);

                // Track highest internalDate in memory
                const msgInternalDate = parseInt(message.internalDate);
                if (msgInternalDate > maxInternalDate) {
                    maxInternalDate = msgInternalDate;
                }
            } catch (error) {
                logger.error('Failed to process Gmail message', error, { messageId: message.id });
                if (eventLogger) await eventLogger.error('Error', error);
                result.errors++;
            }
        }

        // Update checkpoint once at the end of the batch
        if (maxInternalDate > (account.last_sync_checkpoint ? parseInt(account.last_sync_checkpoint) : 0)) {
            logger.debug('Updating Gmail checkpoint at end of batch', { accountId: account.id, checkpoint: maxInternalDate.toString() });
            const { error: updateError } = await this.supabase
                .from('email_accounts')
                .update({ last_sync_checkpoint: maxInternalDate.toString() })
                .eq('id', account.id);
            
            if (updateError) {
                logger.error('Failed to update Gmail checkpoint', updateError);
            }
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

        // Debug: Log account sync settings
        logger.info('Outlook sync settings', {
            accountId: account.id,
            sync_start_date: account.sync_start_date,
            last_sync_checkpoint: account.last_sync_checkpoint,
            sync_max_emails_per_run: account.sync_max_emails_per_run,
        });

        // Construct filter: Use sync_start_date if present (Override), otherwise checkpoint
        let effectiveStartIso = '';
        if (account.sync_start_date) {
            effectiveStartIso = new Date(account.sync_start_date).toISOString();
            logger.info('Using sync_start_date override', { effectiveStartIso });
        } else if (account.last_sync_checkpoint) {
            effectiveStartIso = account.last_sync_checkpoint;
            logger.info('Using last_sync_checkpoint', { effectiveStartIso });
        }

        let filter = '';
        if (effectiveStartIso) {
            // Use 'ge' (>=) instead of 'gt' (>) to ensure we don't miss emails at exact checkpoint
            // The duplicate check in processMessage() will skip already-processed emails
            filter = `receivedDateTime ge ${effectiveStartIso}`;
            logger.info('Final Outlook filter', { filter });
        }

        if (eventLogger) await eventLogger.info('Fetching', 'Fetching emails from Outlook (oldest first)', { filter, batchSize });

        // Outlook API now returns messages sorted by receivedDateTime ascending (oldest first)
        // This ensures checkpoint-based pagination works correctly
        const { messages, hasMore } = await this.microsoftService.fetchMessages(account, {
            top: batchSize,
            filter: filter || undefined,
        });

        if (eventLogger) {
            await eventLogger.info('Fetching', `Fetched ${messages.length} emails (oldest first)${hasMore ? ', more available' : ''}`);
        }

        // Messages are already sorted oldest-first by the API
        let latestCheckpoint = effectiveStartIso;

        for (const message of messages) {
            try {
                const processResult = await this.processMessage(account, message, rules, settings, result, eventLogger);

                if (processResult && (!latestCheckpoint || processResult.date > latestCheckpoint)) {
                    latestCheckpoint = processResult.date;
                }
            } catch (error) {
                logger.error('Failed to process Outlook message', error, { messageId: message.id });
                if (eventLogger) await eventLogger.error('Error', error);
                result.errors++;
            }
        }

        // Update checkpoint once at the end of the batch
        if (latestCheckpoint && latestCheckpoint !== account.last_sync_checkpoint) {
            logger.debug('Updating Outlook checkpoint at end of batch', { accountId: account.id, checkpoint: latestCheckpoint });
            const { error: updateError } = await this.supabase
                .from('email_accounts')
                .update({ last_sync_checkpoint: latestCheckpoint })
                .eq('id', account.id);

            if (updateError) {
                logger.error('Failed to update Outlook checkpoint', updateError);
            }
        }
    }

    private async processMessage(
        account: EmailAccount,
        message: GmailMessage | OutlookMessage,
        rules: Rule[],
        settings: any,
        result: ProcessingResult,
        eventLogger: EventLogger | null
    ): Promise<{ date: string } | void> {
        // Check if already processed
        const { data: existing } = await this.supabase
            .from('emails')
            .select('id')
            .eq('account_id', account.id)
            .eq('external_id', message.id)
            .single();

        if (existing) {
            logger.debug('Message already processed', { messageId: message.id });
            if (eventLogger) await eventLogger.info('Skipped', `Already processed ID: ${message.id}`);
            
            // Still need to return the date for checkpointing even if skipped
            const rawMime = 'raw' in message 
                ? (account.provider === 'gmail' 
                    ? Buffer.from(message.raw, 'base64').toString('utf-8') 
                    : message.raw)
                : '';
            if (rawMime) {
                const parsed = await simpleParser(rawMime);
                return { date: parsed.date ? parsed.date.toISOString() : new Date().toISOString() };
            }
            return;
        }
        
        // Extract raw content string (Gmail is base64url, Outlook is raw text from $value)
        const rawMime = 'raw' in message 
            ? (account.provider === 'gmail' 
                ? Buffer.from(message.raw, 'base64').toString('utf-8') 
                : message.raw)
            : '';

        if (!rawMime) {
            throw new Error(`No raw MIME content found for message ${message.id}`);
        }

        // 1. Extract metadata from raw MIME using mailparser for the DB record
        const parsed = await simpleParser(rawMime);
        const subject = parsed.subject || 'No Subject';
        const sender = parsed.from?.text || 'Unknown';
        const recipient = parsed.to ? (Array.isArray(parsed.to) ? parsed.to[0].text : parsed.to.text) : '';
        const date = parsed.date ? parsed.date.toISOString() : new Date().toISOString();
        const bodySnippet = (parsed.text || parsed.textAsHtml || '').substring(0, 500);

        if (eventLogger) await eventLogger.info('Ingesting', `Ingesting email: ${subject}`);

        // 2. Save raw content to local storage (.eml format)
        let filePath = '';
        try {
            const filename = `${account.id}_${message.id}.eml`.replace(/[^a-z0-9._-]/gi, '_');
            filePath = await this.storageService.saveEmail(rawMime, filename, settings?.storage_path);
        } catch (storageError) {
            logger.error('Failed to save raw email content', storageError);
            if (eventLogger) await eventLogger.error('Storage Error', storageError);
            throw storageError;
        }

        // 3. Create a "Skeleton" record with 'pending' status
        const emailData: Partial<Email> = {
            account_id: account.id,
            external_id: message.id,
            subject,
            sender,
            recipient,
            date,
            body_snippet: bodySnippet,
            file_path: filePath,
            processing_status: 'pending',
        };

        const { data: savedEmail, error: saveError } = await this.supabase
            .from('emails')
            .insert(emailData)
            .select()
            .single();

        if (saveError || !savedEmail) {
            logger.error('Failed to create initial email record', saveError);
            if (eventLogger) await eventLogger.error('Database Error', saveError);
            return { date };
        }

        result.processed++;
        
        // Trigger background processing (async)
        this.processQueue(account.user_id, settings).catch(err => 
            logger.error('Background processing trigger failed', err)
        );

        return { date };
    }

    /**
     * Background Worker: Processes pending emails for a user.
     */
    async processQueue(userId: string, settings: any): Promise<void> {
        // Fetch up to 5 pending emails for this user
        const { data: pendingEmails, error } = await this.supabase
            .from('emails')
            .select('*, email_accounts!inner(id, user_id, provider)')
            .eq('email_accounts.user_id', userId)
            .eq('processing_status', 'pending')
            .limit(5);

        if (error || !pendingEmails || pendingEmails.length === 0) return;

        for (const email of pendingEmails) {
            await this.processPendingEmail(email, settings);
        }
    }

    private async processPendingEmail(email: Email, settings: any): Promise<void> {
        const eventLogger = null; // We might want to link this to the original run_id if possible

        try {
            // 1. Mark as processing
            await this.supabase
                .from('emails')
                .update({ processing_status: 'processing' })
                .eq('id', email.id);

            // 2. Read content from disk and parse with mailparser
            if (!email.file_path) throw new Error('No file path found for email');
            const rawMime = await this.storageService.readEmail(email.file_path);
            const parsed = await simpleParser(rawMime);
            const cleanContent = parsed.text || parsed.textAsHtml || '';

            // 3. Analyze with AI
            const intelligenceService = getIntelligenceService(
                settings?.llm_model || settings?.llm_base_url || settings?.llm_api_key
                    ? {
                        model: settings.llm_model,
                        baseUrl: settings.llm_base_url,
                        apiKey: settings.llm_api_key,
                    }
                    : undefined
            );

            const analysis = await intelligenceService.analyzeEmail(cleanContent, {
                subject: email.subject || '',
                sender: email.sender || '',
                date: email.date || '',
                userPreferences: {
                    autoTrashSpam: settings?.auto_trash_spam,
                    smartDrafts: settings?.smart_drafts,
                },
            }, undefined, email.id);

            if (!analysis) {
                throw new Error('AI analysis returned no result');
            }

            // 4. Update the email record with results
            await this.supabase
                .from('emails')
                .update({
                    category: analysis.category,
                    is_useless: analysis.is_useless,
                    ai_analysis: analysis as any,
                    suggested_actions: analysis.suggested_actions || [],
                    suggested_action: analysis.suggested_actions?.[0] || 'none',
                    processing_status: 'completed'
                })
                .eq('id', email.id);

            // 5. Execute automation rules
            // Fetch account and rules needed for execution
            const { data: account } = await this.supabase
                .from('email_accounts')
                .select('*')
                .eq('id', email.account_id)
                .single();

            const { data: rules } = await this.supabase
                .from('rules')
                .select('*')
                .eq('user_id', email.email_accounts!.user_id)
                .eq('is_enabled', true);

            if (account && rules) {
                const tempResult = { processed: 0, deleted: 0, drafted: 0, errors: 0 };
                await this.executeRules(account, { ...email, ...analysis } as any, analysis, rules, settings, tempResult, null);
            }

        } catch (error) {
            logger.error('Failed to process pending email', error, { emailId: email.id });
            
            await this.supabase
                .from('emails')
                .update({ 
                    processing_status: 'failed',
                    processing_error: error instanceof Error ? error.message : String(error),
                    retry_count: (email.retry_count || 0) + 1
                })
                .eq('id', email.id);
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
        // User-defined and System rules (Unified)
        for (const rule of rules) {
            if (this.matchesCondition(email, analysis, rule.condition as any)) {
                // Get actions array (fallback to single action for backward compatibility)
                const actions = rule.actions && rule.actions.length > 0
                    ? rule.actions
                    : (rule.action ? [rule.action] : []);

                if (eventLogger && actions.length > 1) {
                    await eventLogger.info('Multi-Action', `Executing ${actions.length} actions for rule: ${rule.name}`, { actions }, email.id);
                }

                // Execute each action in the rule
                for (const action of actions) {
                    let draftContent = undefined;

                    // If the action is to draft, and it has specific instructions, generate it now
                    if (action === 'draft' && rule.instructions) {
                        if (eventLogger) await eventLogger.info('Thinking', `Generating customized draft based on rule: ${rule.name}`, undefined, email.id);

                        const intelligenceService = getIntelligenceService(
                            settings?.llm_model || settings?.llm_base_url || settings?.llm_api_key
                                ? {
                                    model: settings.llm_model,
                                    baseUrl: settings.llm_base_url,
                                    apiKey: settings.llm_api_key,
                                }
                                : undefined
                        );

                        const customizedDraft = await intelligenceService.generateDraftReply({
                            subject: email.subject || '',
                            sender: email.sender || '',
                            body: email.body_snippet || ''
                        }, rule.instructions);

                        if (customizedDraft) {
                            draftContent = customizedDraft;
                        }
                    }

                    await this.executeAction(account, email, action, draftContent, eventLogger, `Rule: ${rule.name}`, rule.attachments);

                    if (action === 'delete') result.deleted++;
                    else if (action === 'draft') result.drafted++;
                }
            }
        }
    }

    private matchesCondition(email: Partial<Email>, analysis: EmailAnalysis, condition: Record<string, unknown>): boolean {
        if (!analysis) return false;
        
        for (const [key, value] of Object.entries(condition)) {
            const val = value as string;
            
            switch (key) {
                case 'sender_email':
                    if (email.sender?.toLowerCase() !== val.toLowerCase()) return false;
                    break;
                case 'sender_domain':
                    // Check if sender ends with domain (e.g. @gmail.com)
                    const domain = val.startsWith('@') ? val : `@${val}`;
                    if (!email.sender?.toLowerCase().endsWith(domain.toLowerCase())) return false;
                    break;
                case 'sender_contains':
                    if (!email.sender?.toLowerCase().includes(val.toLowerCase())) return false;
                    break;
                case 'subject_contains':
                    if (!email.subject?.toLowerCase().includes(val.toLowerCase())) return false;
                    break;
                case 'body_contains':
                    if (!email.body_snippet?.toLowerCase().includes(val.toLowerCase())) return false;
                    break;
                case 'older_than_days':
                    if (!email.date) return false;
                    const ageInMs = Date.now() - new Date(email.date).getTime();
                    const ageInDays = ageInMs / (1000 * 60 * 60 * 24);
                    if (ageInDays < (value as number)) return false;
                    break;
                case 'category':
                    if (analysis.category !== value) return false;
                    break;
                case 'priority':
                    if (analysis.priority !== value) return false;
                    break;
                case 'sentiment':
                    if (analysis.sentiment !== value) return false;
                    break;
                case 'is_useless':
                    if (analysis.is_useless !== value) return false;
                    break;
                case 'suggested_actions':
                    // Handle array membership check (e.g. if condition expects "reply" to be in actions)
                    const requiredActions = Array.isArray(value) ? value : [value];
                    const hasAllActions = requiredActions.every(req => 
                        analysis.suggested_actions?.includes(req as any)
                    );
                    if (!hasAllActions) return false;
                    break;
                default:
                    // Fallback for any other keys that might be in analysis
                    if ((analysis as any)[key] !== value) return false;
            }
        }
        return true;
    }

    /**
     * Scans already processed emails and applies rules that have a time-based condition (retention).
     */
    private async runRetentionRules(
        account: EmailAccount,
        rules: Rule[],
        settings: any,
        result: ProcessingResult,
        eventLogger: EventLogger | null
    ): Promise<void> {
        // Find rules that have an age condition
        const retentionRules = rules.filter(r => (r.condition as any).older_than_days !== undefined);
        if (retentionRules.length === 0) return;

        if (eventLogger) await eventLogger.info('Retention', `Checking retention rules for ${retentionRules.length} policies`);

        // Fetch emails for this account that have been analyzed but haven't had an action taken yet
        const { data: processedEmails, error } = await this.supabase
            .from('emails')
            .select('*')
            .eq('account_id', account.id)
            .is('action_taken', null)
            .not('ai_analysis', 'is', null)
            .order('date', { ascending: true });

        if (error || !processedEmails) return;

        for (const email of processedEmails) {
            for (const rule of retentionRules) {
                if (this.matchesCondition(email, email.ai_analysis as any, rule.condition as any)) {
                    if (eventLogger) await eventLogger.info('Retention', `Applying retention rule: ${rule.name} to ${email.subject}`);

                    // Get actions array (fallback to single action for backward compatibility)
                    const actions = rule.actions && rule.actions.length > 0
                        ? rule.actions
                        : (rule.action ? [rule.action] : []);

                    // Execute each action
                    for (const action of actions) {
                        await this.executeAction(account, email, action, undefined, eventLogger, `Retention Rule: ${rule.name}`);

                        if (action === 'delete') result.deleted++;
                        else if (action === 'draft') result.drafted++;
                    }

                    break; // Only one rule per email
                }
            }
        }
    }

    private async executeAction(
        account: EmailAccount,
        email: Email,
        action: 'delete' | 'archive' | 'draft' | 'read' | 'star',
        draftContent?: string,
        eventLogger?: EventLogger | null,
        reason?: string,
        attachments?: any[]
    ): Promise<void> {
        try {
            if (eventLogger) {
                await eventLogger.info('Acting', `Executing action: ${action}`, { reason, hasAttachments: !!attachments?.length }, email.id);
            }

            if (account.provider === 'gmail') {
                if (action === 'delete') {
                    await this.gmailService.trashMessage(account, email.external_id);
                    if (email.file_path) {
                        await this.storageService.deleteEmail(email.file_path);
                    }
                } else if (action === 'archive') {
                    await this.gmailService.archiveMessage(account, email.external_id);
                } else if (action === 'draft' && draftContent) {
                    const draftId = await this.gmailService.createDraft(account, email.external_id, draftContent, this.supabase, attachments);
                    if (eventLogger) {
                        await eventLogger.info('Drafted', `Draft created successfully. ID: ${draftId}`, { draftId }, email.id);
                    }
                } else if (action === 'read') {
                    await this.gmailService.markAsRead(account, email.external_id);
                } else if (action === 'star') {
                    await this.gmailService.starMessage(account, email.external_id);
                }
            } else if (account.provider === 'outlook') {
                if (action === 'delete') {
                    await this.microsoftService.trashMessage(account, email.external_id);
                    if (email.file_path) {
                        await this.storageService.deleteEmail(email.file_path);
                    }
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

            // Update email record using atomic array concatenation to prevent race conditions
            await this.supabase.rpc('append_email_action', {
                p_email_id: email.id,
                p_action: action
            });

            // Fallback for legacy column
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
                const errMsg = error instanceof Error ? error.message : String(error);
                await eventLogger.error('Action Failed', { error: errMsg, action }, email.id);
            }
            // Do NOT throw here - we want to continue with other emails/actions
        }
    }
}
