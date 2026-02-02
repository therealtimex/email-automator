import { SupabaseClient } from '@supabase/supabase-js';
import { simpleParser } from 'mailparser';
import { createLogger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { getGmailService, GmailMessage } from './gmail.js';
import { getMicrosoftService, OutlookMessage } from './microsoft.js';
import { getIntelligenceService, EmailAnalysis, ContextAwareAnalysis, RuleContext } from './intelligence.js';
import { getStorageService } from './storage.js';
import { generateEmailFilename } from '../utils/filename.js';
import { EmailAccount, Email, Rule, ProcessingLog } from './supabase.js';
import { EventLogger } from './eventLogger.js';
import { RulePackService } from './RulePackService.js';
import { processDraftWithNames } from '../utils/nameExtraction.js';
import { shouldSkipDraft } from '../utils/senderValidation.js';

const logger = createLogger('Processor');

export interface ProcessingResult {
    processed: number;
    deleted: number;
    drafted: number;
    errors: number;
}

/**
 * Action classification for conflict resolution
 */
const ACTION_TYPES = {
    // Exclusive: Only one can apply (highest priority wins)
    EXCLUSIVE: ['delete', 'archive'] as const,

    // Additive: All can apply (accumulate across rules)
    ADDITIVE: ['star', 'unstar', 'important', 'pin'] as const,

    // Semi-Exclusive: Only one makes sense, but non-conflicting
    SEMI_EXCLUSIVE: ['draft'] as const
};

interface ResolvedActions {
    exclusive?: string;  // The winning exclusive action (delete or archive)
    labels: string[];    // All labels to apply
    additive: string[];  // Star, important, etc
    draft?: {
        content: string;
        instructions: string;
        attachments?: any[];
    };
}

/**
 * Resolves conflicts between multiple matching rules
 *
 * Strategy:
 * - EXCLUSIVE actions (delete, archive): Highest priority rule wins
 * - ADDITIVE actions (labels, star): Apply ALL from ALL matching rules
 * - SEMI-EXCLUSIVE (draft): Highest priority rule wins
 * - If DELETE wins, skip all other actions (email is gone anyway)
 *
 * @param matchedRules - Rules sorted by priority (descending)
 * @param allRules - Full rule objects for looking up actions
 * @returns Resolved action set to execute
 */
function resolveRuleConflicts(
    matchedRules: Array<{ rule_id: string; confidence: number }>,
    allRules: Rule[]
): ResolvedActions {
    const resolved: ResolvedActions = {
        labels: [],
        additive: []
    };

    // Process rules in priority order (already sorted)
    for (const match of matchedRules) {
        const rule = allRules.find(r => r.id === match.rule_id);
        if (!rule) continue;

        const actions = rule.actions || [];

        for (const action of actions) {
            // Handle label actions (always additive)
            if (action.startsWith('label:')) {
                const label = action.substring(6); // Remove 'label:' prefix
                if (!resolved.labels.includes(label)) {
                    resolved.labels.push(label);
                }
                continue;
            }

            // Handle exclusive actions (delete/archive)
            if (ACTION_TYPES.EXCLUSIVE.includes(action as any)) {
                // Only set if not already set by higher priority rule
                if (!resolved.exclusive) {
                    resolved.exclusive = action;
                }
                continue;
            }

            // Handle additive actions (star, important, etc)
            if (ACTION_TYPES.ADDITIVE.includes(action as any)) {
                if (!resolved.additive.includes(action)) {
                    resolved.additive.push(action);
                }
                continue;
            }

            // Handle draft (semi-exclusive)
            if (action === 'draft' && !resolved.draft) {
                resolved.draft = {
                    content: '', // Will be generated later
                    instructions: rule.instructions || '',
                    attachments: rule.attachments
                };
                continue;
            }
        }
    }

    // Nuclear option: If DELETE wins, discard everything else
    if (resolved.exclusive === 'delete') {
        return {
            exclusive: 'delete',
            labels: [],
            additive: []
        };
    }

    return resolved;
}

export class EmailProcessorService {
    private supabase: SupabaseClient;
    private gmailService = getGmailService();
    private microsoftService = getMicrosoftService();
    private storageService = getStorageService();
    private lastStopCheck: number = 0;

    constructor(supabase: SupabaseClient) {
        this.supabase = supabase;
    }

    async syncAccount(accountId: string, userId: string): Promise<ProcessingResult> {
        const result: ProcessingResult = { processed: 0, deleted: 0, drafted: 0, errors: 0 };

        // Reset stop request flag at the start of a manual sync
        await this.resetStopRequest(userId);

        // Zero-Config UX: Auto-install Universal Pack for new users (self-healing)
        try {
            const rulePackService = new RulePackService(this.supabase);
            const { installed } = await rulePackService.ensureUniversalPack(userId);
            if (installed) {
                logger.info(`Auto-installed Universal Pack for user ${userId}`);
            }
        } catch (error) {
            // Don't fail sync if pack installation fails
            logger.error('Failed to auto-install Universal Pack', error);
        }

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

            logger.info('Retrieved account settings', {
                accountId: account.id,
                sync_start_date: account.sync_start_date,
                last_sync_checkpoint: account.last_sync_checkpoint
            });

            // Refresh token if needed
            let refreshedAccount = account;
            if (account.provider === 'gmail') {
                refreshedAccount = await this.gmailService.refreshTokenIfNeeded(this.supabase, account);
            } else if (account.provider === 'outlook') {
                refreshedAccount = await this.microsoftService.refreshTokenIfNeeded(this.supabase, account);
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

            // --- STOP CHECK ---
            if (await this.checkStopRequested(userId, eventLogger)) return result;

            // Process based on provider
            try {
                if (refreshedAccount.provider === 'gmail') {
                    await this.processGmailAccount(refreshedAccount, rules || [], settings, result, eventLogger);
                } else if (refreshedAccount.provider === 'outlook') {
                    await this.processOutlookAccount(refreshedAccount, rules || [], settings, result, eventLogger);
                }
            } catch (providerError) {
                const providerName = refreshedAccount.provider === 'gmail' ? 'Gmail' : 'Outlook';
                throw new Error(`${providerName} Sync Error: ${providerError instanceof Error ? providerError.message : String(providerError)}`);
            }

            // After processing new emails, run retention rules for this account
            if (await this.checkStopRequested(userId, eventLogger)) return result;
            await this.runRetentionRules(refreshedAccount, rules || [], settings, result, eventLogger);

            // Wait for background worker to process the queue (ensure sync is fully complete before event)
            await this.processQueue(userId, settings, result).catch(err =>
                logger.error('Background worker failed', err)
            );

            // Update log and account on success
            if (log) {
                if (eventLogger) {
                    await eventLogger.success('Finished', 'Sync run completed', {
                        total_processed: result.processed,
                        deleted: result.deleted,
                        drafted: result.drafted,
                        errors: result.errors
                    });
                }

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
                    last_sync_error: null,
                    sync_start_date: null // Clear manual override once used successfully
                })
                .eq('id', accountId);

            logger.info('Sync completed and override cleared', { accountId, ...result });
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

        // Construct query: Use a sliding window for efficiency and determinism
        let effectiveStartMs = 0;
        if (account.sync_start_date) {
            effectiveStartMs = new Date(account.sync_start_date).getTime();
            logger.info('Using sync_start_date override', { effectiveStartMs, date: new Date(effectiveStartMs).toISOString() });
        } else if (account.last_sync_checkpoint) {
            effectiveStartMs = parseInt(account.last_sync_checkpoint);
            logger.info('Using last_sync_checkpoint', { effectiveStartMs, date: new Date(effectiveStartMs).toISOString() });
        }

        // Use a 7-day sliding window. If empty, skip forward (up to 10 weeks per run)
        const windowSizeMs = 7 * 24 * 60 * 60 * 1000;
        const nowMs = Date.now();
        const tomorrowMs = nowMs + (24 * 60 * 60 * 1000);

        let currentStartMs = effectiveStartMs;
        let messages: GmailMessage[] = [];
        let hasMore = false;
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts && currentStartMs < nowMs) {
            let effectiveEndMs = currentStartMs + windowSizeMs;
            if (effectiveEndMs > tomorrowMs) effectiveEndMs = tomorrowMs;

            const startSec = Math.floor(currentStartMs / 1000) - 1;
            const endSec = Math.floor(effectiveEndMs / 1000);
            const query = `after:${startSec} before:${endSec}`;

            logger.info('Gmail window attempt', { attempt: attempts + 1, query });

            const result = await this.gmailService.fetchMessagesOldestFirst(account, {
                limit: batchSize,
                query,
            });

            if (result.messages.length > 0) {
                messages = result.messages;
                hasMore = result.hasMore;
                break; // Found emails, stop skipping
            }

            // No emails found in this week, move to next week
            logger.info('No emails in 7-day window, skipping forward', { start: new Date(currentStartMs).toISOString() });
            currentStartMs = effectiveEndMs;
            attempts++;

            if (eventLogger && attempts % 3 === 0) {
                await eventLogger.info('Sync', `Scanning history... reached ${new Date(currentStartMs).toLocaleDateString()}`);
            }
        }

        if (eventLogger && messages.length > 0) {
            await eventLogger.info('Fetching', `Fetched ${messages.length} emails in window${hasMore ? ', more available' : ''}`);
        }

        // Initialize max tracking with the point we reached
        let maxInternalDate = currentStartMs;

        for (const message of messages) {
            // --- STOP CHECK ---
            if (await this.checkStopRequested(account.user_id, eventLogger)) break;

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

        // Update checkpoint once at the end of the batch if we made progress
        if (maxInternalDate > effectiveStartMs) {
            logger.info('Updating Gmail checkpoint', {
                accountId: account.id,
                oldCheckpoint: account.last_sync_checkpoint,
                newCheckpoint: maxInternalDate.toString()
            });

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
            // --- STOP CHECK ---
            if (await this.checkStopRequested(account.user_id, eventLogger)) break;

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

        // Update checkpoint once at the end of the batch if we made progress
        if (latestCheckpoint && latestCheckpoint !== effectiveStartIso) {
            logger.info('Updating Outlook checkpoint', {
                accountId: account.id,
                oldCheckpoint: account.last_sync_checkpoint,
                newCheckpoint: latestCheckpoint
            });

            const { error: updateError } = await this.supabase
                .from('email_accounts')
                .update({ last_sync_checkpoint: latestCheckpoint })
                .eq('id', account.id);

            if (updateError) {
                logger.error('Failed to update Outlook checkpoint', updateError);
            }
        } else {
            logger.info('Outlook checkpoint not updated (no newer emails found in this batch)', {
                latestCheckpoint,
                effectiveStartIso
            });
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
            const filename = generateEmailFilename({
                subject,
                date: parsed.date || new Date(),
                externalId: message.id,
                intelligentRename: settings?.intelligent_rename || config.intelligentRename
            });
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

        // Log successful ingestion linked to email ID
        if (eventLogger) await eventLogger.info('Ingested', `Successfully ingested email: ${subject}`, { filePath }, savedEmail.id);

        result.processed++;

        return { date };
    }

    /**
     * Background Worker: Processes pending emails for a user recursively until empty.
     */
    async processQueue(userId: string, settings: any, result?: ProcessingResult): Promise<void> {
        logger.info('Worker: Checking queue', { userId });

        // Fetch up to 5 pending emails for this user
        const { data: pendingEmails, error } = await this.supabase
            .from('emails')
            .select('*, email_accounts!inner(id, user_id, provider)')
            .eq('email_accounts.user_id', userId)
            .eq('processing_status', 'pending')
            .limit(5);

        if (error) {
            logger.error('Worker: Failed to fetch queue', error);
            return;
        }

        if (!pendingEmails || pendingEmails.length === 0) {
            logger.info('Worker: Queue empty', { userId });
            return;
        }

        logger.info('Worker: Processing batch', { userId, count: pendingEmails.length });

        for (const email of pendingEmails) {
            // --- STOP CHECK ---
            if (await this.checkStopRequested(userId)) break;

            await this.processPendingEmail(email, userId, settings, result);
        }

        // Slight delay to prevent hitting rate limits too fast, then check again
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.processQueue(userId, settings, result);
    }

    private async processPendingEmail(email: Email, userId: string, settings: any, result?: ProcessingResult): Promise<void> {
        // Create a real processing log entry for this background task to ensure RLS compliance
        const { data: log } = await this.supabase
            .from('processing_logs')
            .insert({
                user_id: userId,
                account_id: email.account_id,
                status: 'running',
            })
            .select()
            .single();

        const eventLogger = log ? new EventLogger(this.supabase, log.id) : null;

        try {
            // 1. Double-check status and mark as processing (Atomic-ish)
            const { data: current } = await this.supabase
                .from('emails')
                .select('processing_status')
                .eq('id', email.id)
                .single();

            if (current?.processing_status !== 'pending') {
                if (log) await this.supabase.from('processing_logs').delete().eq('id', log.id);
                return;
            }

            await this.supabase
                .from('emails')
                .update({ processing_status: 'processing' })
                .eq('id', email.id);

            if (eventLogger) await eventLogger.info('Processing', `Background processing: ${email.subject}`, undefined, email.id);

            // 2. Read content from disk and parse with mailparser
            if (!email.file_path) throw new Error('No file path found for email');
            const rawMime = await this.storageService.readEmail(email.file_path);
            const parsed = await simpleParser(rawMime);

            // Extract clean content (prioritize text)
            const cleanContent = parsed.text || parsed.textAsHtml || '';

            // Extract metadata signals from headers
            const metadata = {
                importance: parsed.headers.get('importance')?.toString() || parsed.headers.get('x-priority')?.toString(),
                listUnsubscribe: parsed.headers.get('list-unsubscribe')?.toString(),
                autoSubmitted: parsed.headers.get('auto-submitted')?.toString(),
                mailer: parsed.headers.get('x-mailer')?.toString()
            };

            // 3. Fetch account for action execution
            const { data: account } = await this.supabase
                .from('email_accounts')
                .select('*')
                .eq('id', email.account_id)
                .single();

            // 4. Fetch pre-compiled rule context (fast path - no loop/formatting)
            // Falls back to building context if not cached
            let compiledContext: string | null = settings?.compiled_rule_context || null;

            // Fetch rules for action execution (need attachments, instructions)
            const { data: rules } = await this.supabase
                .from('rules')
                .select('*')
                .eq('user_id', userId)
                .eq('is_enabled', true)
                .order('priority', { ascending: false });

            // Fallback: build context if not pre-compiled
            if (!compiledContext && rules && rules.length > 0) {
                compiledContext = rules.map((r, i) => {
                    // Build human-readable condition text
                    let conditionText = '';
                    if (r.condition) {
                        const cond = r.condition as any;

                        // Handle new simple condition format: {"category": "news"}
                        if (cond.category) {
                            conditionText = `When category is "${cond.category}"`;
                        }
                        if (cond.sentiment) {
                            conditionText += (conditionText ? ' AND ' : 'When ') + `sentiment is "${cond.sentiment}"`;
                        }
                        if (cond.priority) {
                            conditionText += (conditionText ? ' AND ' : 'When ') + `priority is "${cond.priority}"`;
                        }
                        if (cond.sender_email) {
                            conditionText += (conditionText ? ' AND ' : 'When ') + `sender is "${cond.sender_email}"`;
                        }
                        if (cond.sender_domain) {
                            conditionText += (conditionText ? ' AND ' : 'When ') + `sender domain is "${cond.sender_domain}"`;
                        }
                        if (cond.sender_contains) {
                            conditionText += (conditionText ? ' AND ' : 'When ') + `sender contains "${cond.sender_contains}"`;
                        }
                        if (cond.subject_contains) {
                            conditionText += (conditionText ? ' AND ' : 'When ') + `subject contains "${cond.subject_contains}"`;
                        }
                        if (cond.body_contains) {
                            conditionText += (conditionText ? ' AND ' : 'When ') + `body contains "${cond.body_contains}"`;
                        }

                        // Handle legacy format with field/operator/value
                        if (cond.field) {
                            conditionText += (conditionText ? ' AND ' : 'When ') + cond.field;
                            if (cond.operator === 'equals') {
                                conditionText += ` equals "${cond.value}"`;
                            } else if (cond.operator === 'contains') {
                                conditionText += ` contains "${cond.value}"`;
                            } else if (cond.operator === 'domain_equals') {
                                conditionText += ` domain equals "${cond.value}"`;
                            } else {
                                conditionText += ` ${cond.operator} "${cond.value}"`;
                            }
                        }

                        if (cond.is_useless === true) {
                            conditionText += (conditionText ? ' AND ' : 'When ') + 'email is useless/low-value';
                        }
                        if (cond.ai_priority) {
                            conditionText += (conditionText ? ' AND ' : 'When ') + `AI priority is "${cond.ai_priority}"`;
                        }
                        // Extract older_than_days from condition JSONB
                        if (cond.older_than_days) {
                            conditionText += (conditionText ? ' AND ' : 'When ') + `email is older than ${cond.older_than_days} days`;
                        }
                    }

                    return `Rule ${i + 1} [ID: ${r.id}]\n` +
                        `  Name: ${r.name}\n` +
                        (r.description ? `  Description: ${r.description}\n` : '') +
                        (r.intent ? `  Intent: ${r.intent}\n` : '') +
                        (conditionText ? `  Condition: ${conditionText}\n` : '') +
                        `  Actions: ${r.actions?.join(', ') || r.action || 'none'}\n` +
                        (r.instructions ? `  Draft Instructions: ${r.instructions}\n` : '') +
                        '\n';
                }).join('');
            }

            // 5. Context-Aware Analysis: AI evaluates email against user's rules
            const intelligenceService = getIntelligenceService();

            const analysis = await intelligenceService.analyzeEmailWithRules(
                cleanContent,
                {
                    subject: email.subject || '',
                    sender: email.sender || '',
                    date: email.date || '',
                    metadata,
                    userPreferences: {
                        autoTrashSpam: settings?.auto_trash_spam,
                        smartDrafts: settings?.smart_drafts,
                        categoryPatterns: settings?.category_patterns,
                        vipSenders: settings?.vip_senders,
                        preferredLength: settings?.preferred_length
                    },
                },
                compiledContext || '',  // Pre-compiled context (fast path)
                eventLogger || undefined,
                email.id,
                {
                    llm_provider: settings?.llm_provider,
                    llm_model: settings?.llm_model
                }
            );

            if (!analysis) {
                throw new Error('AI analysis returned no result');
            }

            // 6. Update the email record with context-aware results
            const primaryRule = analysis.matched_rules[0]; // Highest priority/confidence rule
            await this.supabase
                .from('emails')
                .update({
                    category: analysis.category,
                    ai_analysis: analysis as any,
                    suggested_actions: analysis.actions_to_execute || [],
                    suggested_action: analysis.actions_to_execute?.[0] || 'none',
                    matched_rule_id: primaryRule?.rule_id || null,
                    matched_rule_confidence: primaryRule?.confidence || 0,
                    processing_status: 'completed'
                })
                .eq('id', email.id);

            // 7. Execute actions with conflict resolution
            if (account && analysis.matched_rules.length > 0 && rules) {
                // Filter rules by minimum confidence threshold
                const highConfidenceMatches = analysis.matched_rules.filter(m => m.confidence >= 0.7);

                if (highConfidenceMatches.length > 0) {
                    // Sort matched rules by their priority (from rules table)
                    const sortedMatches = highConfidenceMatches
                        .map(match => ({
                            ...match,
                            priority: rules.find(r => r.id === match.rule_id)?.priority || 0
                        }))
                        .sort((a, b) => b.priority - a.priority);

                    // Log all matched rules
                    if (eventLogger) {
                        const matchSummary = sortedMatches.map(m =>
                            `"${m.rule_name}" (${(m.confidence * 100).toFixed(0)}%)`
                        ).join(', ');
                        await eventLogger.info('Rules Matched',
                            `${sortedMatches.length} rule(s) apply: ${matchSummary}`,
                            { rules: sortedMatches.map(m => ({ name: m.rule_name, confidence: m.confidence, reasoning: m.reasoning })) },
                            email.id
                        );
                    }

                    // Resolve conflicts between rules
                    const resolved = resolveRuleConflicts(sortedMatches, rules);

                    if (eventLogger) {
                        await eventLogger.info('Actions Resolved',
                            `After conflict resolution: ${[resolved.exclusive, ...resolved.labels.map(l => `label:${l}`), ...resolved.additive, resolved.draft ? 'draft' : null].filter(Boolean).join(', ')}`,
                            { resolved },
                            email.id
                        );
                    }

                    // Execute exclusive action (delete or archive)
                    if (resolved.exclusive) {
                        await this.executeAction(
                            account,
                            email,
                            resolved.exclusive as any,
                            undefined,
                            eventLogger,
                            `Rules: ${sortedMatches.map(m => m.rule_name).join(', ')}`
                        );

                        if (result) {
                            if (resolved.exclusive === 'delete') result.deleted++;
                        }
                    }

                    // If deleted, skip other actions (email is gone)
                    if (resolved.exclusive === 'delete') {
                        return;
                    }

                    // Execute label actions
                    for (const label of resolved.labels) {
                        await this.executeAction(
                            account,
                            email,
                            `label:${label}` as any,
                            undefined,
                            eventLogger,
                            `Rules: ${sortedMatches.map(m => m.rule_name).join(', ')}`
                        );
                    }

                    // Execute additive actions (star, important, etc)
                    for (const action of resolved.additive) {
                        await this.executeAction(
                            account,
                            email,
                            action as any,
                            undefined,
                            eventLogger,
                            `Rules: ${sortedMatches.map(m => m.rule_name).join(', ')}`
                        );
                    }

                    // Execute draft action
                    if (resolved.draft) {
                        // Build rich context for draft generation
                        const emailDomain = account.email_address?.split('@')[1] || undefined;
                        const richContext = {
                            myEmail: account.email_address,
                            myName: undefined,
                            myRole: settings?.user_role || undefined,
                            myCompany: emailDomain,
                            category: analysis?.category,
                            sentiment: analysis?.sentiment,
                            priority: analysis?.priority,
                            keyPoints: analysis?.key_points,
                            language: analysis?.language,
                            senderEmail: email.sender || undefined,
                            senderName: email.sender || undefined,
                            receivedDate: email.date ? new Date(email.date) : undefined
                        };

                        const draftContent = await intelligenceService.generateDraftReply({
                            subject: email.subject || '',
                            sender: email.sender || '',
                            body: email.body_snippet || ''
                        }, resolved.draft.instructions, {
                            llm_provider: settings?.llm_provider,
                            llm_model: settings?.llm_model
                        }, richContext);

                        if (draftContent) {
                            await this.executeAction(
                                account,
                                email,
                                'draft' as any,
                                draftContent,
                                eventLogger,
                                `Rules: ${sortedMatches.map(m => m.rule_name).join(', ')}`,
                                resolved.draft.attachments
                            );

                            if (result) result.drafted++;
                        }
                    }
                } else if (eventLogger) {
                    await eventLogger.info('Low Confidence',
                        `${analysis.matched_rules.length} rule(s) matched but below 0.7 confidence threshold`,
                        { rules: analysis.matched_rules },
                        email.id
                    );
                }
            } else if (eventLogger && rules && rules.length > 0) {
                await eventLogger.info('No Match',
                    'No rules matched this email',
                    { category: analysis.category },
                    email.id
                );
            }

            // Mark log as success
            if (log) {
                await this.supabase
                    .from('processing_logs')
                    .update({
                        status: 'success',
                        completed_at: new Date().toISOString(),
                        emails_processed: 1
                    })
                    .eq('id', log.id);
            }

        } catch (error) {
            logger.error('Failed to process pending email', error, { emailId: email.id });
            if (eventLogger) await eventLogger.error('Processing Failed', error, email.id);

            // Mark log as failed
            if (log) {
                await this.supabase
                    .from('processing_logs')
                    .update({
                        status: 'failed',
                        completed_at: new Date().toISOString(),
                        error_message: error instanceof Error ? error.message : String(error)
                    })
                    .eq('id', log.id);
            }

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
                        // CRITICAL: Check if sender is noreply/automated BEFORE generating draft
                        if (shouldSkipDraft(email.sender || '')) {
                            logger.info('Skipping draft for noreply sender', {
                                emailId: email.id,
                                sender: email.sender,
                                rule: rule.name
                            });
                            if (eventLogger) {
                                await eventLogger.info('Skipped Draft',
                                    'Sender is noreply/automated address - no draft needed',
                                    { sender: email.sender },
                                    email.id
                                );
                            }
                            // Skip this action, continue to next
                            continue;
                        }

                        if (eventLogger) await eventLogger.info('Thinking', `Generating customized draft based on rule: ${rule.name}`, undefined, email.id);

                        const intelligenceService = getIntelligenceService();

                        // Build rich context for better drafts
                        const emailDomain = account.email_address?.split('@')[1] || undefined;
                        const richContext = {
                            myEmail: account.email_address,
                            myName: settings?.full_name || undefined,
                            myRole: settings?.role || settings?.user_role || undefined,
                            myCompany: settings?.company || emailDomain,
                            myIndustry: settings?.industry || undefined,
                            workStyle: settings?.work_style || undefined,
                            communicationStyle: {
                                tone: settings?.preferred_tone,
                                length: settings?.preferred_length,
                                signature: settings?.signature,
                                commonPhrases: settings?.common_phrases
                            },
                            primaryGoal: settings?.primary_goal || undefined,
                            category: analysis?.category,
                            sentiment: analysis?.sentiment,
                            priority: analysis?.priority,
                            keyPoints: analysis?.key_points,
                            language: analysis?.language, // Multi-language support
                            senderEmail: email.sender || undefined,
                            senderName: email.sender || undefined,
                            receivedDate: email.date ? new Date(email.date) : undefined
                        };

                        const customizedDraft = await intelligenceService.generateDraftReply({
                            subject: email.subject || '',
                            sender: email.sender || '',
                            body: email.body_snippet || ''
                        }, rule.instructions, {
                            llm_provider: settings?.llm_provider,
                            llm_model: settings?.llm_model
                        }, richContext);

                        if (customizedDraft) {
                            draftContent = customizedDraft;
                        }
                    }

                    // CRITICAL: Replace placeholders before executing draft action
                    if (action === 'draft' && draftContent) {
                        try {
                            draftContent = await processDraftWithNames(
                                draftContent,
                                email.sender || '',
                                account.user_id,
                                this.supabase
                            );
                        } catch (error) {
                            logger.error('Failed to process draft names', error, { emailId: email.id });
                            if (eventLogger) {
                                await eventLogger.error('Draft Processing Failed', {
                                    error: error instanceof Error ? error.message : String(error)
                                }, email.id);
                            }
                            // Skip draft action if placeholder replacement fails
                            continue;
                        }
                    }

                    // TRANSACTION SAFETY: Wrap draft creation in try-catch with rollback
                    try {
                        // Step 1: Save draft content to database (ONLY if we have content)
                        if (draftContent && action === 'draft') {
                            const { error: updateError } = await this.supabase
                                .from('emails')
                                .update({
                                    draft_content: draftContent,
                                    draft_status: 'pending',
                                    draft_created_at: new Date().toISOString()
                                })
                                .eq('id', email.id);

                            if (updateError) {
                                throw new Error(`Failed to save draft content: ${updateError.message}`);
                            }

                            // Update local object so executeAction uses it if needed
                            email.draft_content = draftContent;
                        } else if (action === 'draft' && !draftContent) {
                            // Skip draft action if no content generated
                            logger.warn('Skipping draft action - no content generated', {
                                emailId: email.id,
                                ruleName: rule.name
                            });
                            if (eventLogger) {
                                await eventLogger.info(
                                    'Draft Skipped',
                                    `No draft content generated for rule: ${rule.name}`,
                                    {},
                                    email.id
                                );
                            }
                            continue; // Skip to next rule/email
                        }

                        // Step 2: Execute action (creates draft in email provider)
                        const resultId = await this.executeAction(account, email, action, draftContent, eventLogger, `Rule: ${rule.name}`, rule.attachments);

                        // Step 3: Update counters
                        if (action === 'delete') result.deleted++;
                        else if (action === 'draft') result.drafted++;

                        // Step 4: Save draft ID if action was draft
                        if (action === 'draft' && resultId) {
                            const { error: draftIdError } = await this.supabase
                                .from('emails')
                                .update({ draft_id: resultId })
                                .eq('id', email.id);

                            if (draftIdError) {
                                // Log error but don't fail - draft was created successfully in provider
                                logger.error('Failed to save draft_id, but draft was created', new Error(draftIdError.message));
                            }
                        }
                    } catch (actionError) {
                        // ROLLBACK: Clear draft status if action failed
                        logger.error('Action execution failed, rolling back draft status', actionError as Error);

                        await this.supabase
                            .from('emails')
                            .update({
                                draft_status: null,
                                draft_created_at: null,
                                processing_error: actionError instanceof Error ? actionError.message : String(actionError)
                            })
                            .eq('id', email.id);

                        // Log to event logger if available
                        if (eventLogger) {
                            await eventLogger.error(
                                'Action Failed',
                                `Failed to execute ${action}: ${actionError instanceof Error ? actionError.message : String(actionError)}`,
                                email.id
                            );
                        }

                        // Continue to next email instead of crashing
                        continue;
                    }
                }
            }
        }
    }

    /**
     * Enhanced condition matching with support for AI-powered rules
     * Supports logical operators (AND/OR/NOT) and new condition types
     */
    private matchesCondition(email: Partial<Email>, analysis: EmailAnalysis | null, condition: Record<string, unknown>): boolean {
        // Logical operators (evaluated recursively)
        if ('and' in condition) {
            const subConditions = condition.and as Record<string, unknown>[];
            return subConditions.every(subCond => this.matchesCondition(email, analysis, subCond));
        }

        if ('or' in condition) {
            const subConditions = condition.or as Record<string, unknown>[];
            return subConditions.some(subCond => this.matchesCondition(email, analysis, subCond));
        }

        if ('not' in condition) {
            const subCondition = condition.not as Record<string, unknown>;
            return !this.matchesCondition(email, analysis, subCondition);
        }

        // Standard condition matching
        for (const [key, value] of Object.entries(condition)) {
            const val = value as string;

            switch (key) {
                // === Legacy field-based matching ===
                case 'sender_email':
                    if (email.sender?.toLowerCase() !== val.toLowerCase()) return false;
                    break;

                case 'sender_domain':
                    // Support both "gmail.com" and "@gmail.com" formats
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

                // === AI-powered conditions ===
                case 'category':
                    if (!analysis || analysis.category !== value) return false;
                    break;

                case 'priority':
                    if (!analysis || analysis.priority !== value) return false;
                    break;

                case 'ai_priority':  // Alias for priority
                    if (!analysis || analysis.priority !== value) return false;
                    break;

                case 'sentiment':
                    if (!analysis || analysis.sentiment !== value) return false;
                    break;

                case 'is_useless':
                    if (!analysis || analysis.is_useless !== value) return false;
                    break;

                case 'confidence_gt':
                    // Check if AI confidence is above threshold
                    // Note: We'd need to store confidence in analysis, for now skip
                    // TODO: Add confidence tracking to EmailAnalysis
                    break;

                case 'suggested_actions':
                    if (!analysis) return false;
                    // Handle array membership check
                    const requiredActions = Array.isArray(value) ? value : [value];
                    const actualActions = analysis.suggested_actions || [];
                    const hasAllActions = requiredActions.every(req =>
                        actualActions.includes(req as any)
                    );
                    if (!hasAllActions) return false;
                    break;

                // === Content matching ===
                case 'contains_keywords':
                    if (!Array.isArray(value)) return false;
                    const keywords = value as string[];
                    const searchText = `${email.subject || ''} ${email.body_snippet || ''}`.toLowerCase();
                    // Match if ANY keyword is found
                    const hasKeyword = keywords.some(kw => searchText.includes(kw.toLowerCase()));
                    if (!hasKeyword) return false;
                    break;

                case 'matches_pattern':
                    if (typeof value !== 'string') return false;
                    try {
                        const regex = new RegExp(value, 'i');
                        const searchText = `${email.subject || ''} ${email.body_snippet || ''}`;
                        if (!regex.test(searchText)) return false;
                    } catch (e) {
                        // Invalid regex, treat as no match
                        return false;
                    }
                    break;

                // === Recipient analysis ===
                case 'recipient_type':
                    // Check if user is in to/cc/bcc
                    // Note: This requires parsing the recipient field
                    // For now, simple heuristic: if recipient field exists and matches pattern
                    // TODO: Implement proper recipient parsing
                    break;

                case 'recipient_count_gt':
                    // Count number of recipients
                    // Note: This requires parsing recipient lists
                    // TODO: Implement recipient counting
                    break;

                case 'is_first_contact':
                    // Check if no prior thread with sender
                    // Note: This requires thread tracking
                    // TODO: Implement thread tracking
                    break;

                // === Sender analysis ===
                case 'sender_is_vip':
                    // Check against VIP list
                    // Note: This requires VIP management feature
                    // TODO: Implement VIP list
                    break;

                case 'sender_in_contacts':
                    // Check if sender is in contacts
                    // Note: This requires contact list integration
                    // TODO: Implement contact list
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
        action: string,  // Changed to string to support 'label:*' and other future actions
        draftContent?: string,
        eventLogger?: EventLogger | null,
        reason?: string,
        attachments?: any[]
    ): Promise<string | void> {
        try {
            if (eventLogger) {
                await eventLogger.info('Acting', `Executing action: ${action}`, { reason, hasAttachments: !!attachments?.length }, email.id);
            }

            // Parse label actions (e.g., "label:Finance/Receipts")
            if (action.startsWith('label:')) {
                const labelName = action.substring(6); // Remove "label:" prefix
                if (account.provider === 'gmail') {
                    await this.gmailService.applyLabelByName(account, email.external_id, labelName);
                } else if (account.provider === 'outlook') {
                    await this.microsoftService.moveToFolderByPath(account, email.external_id, labelName);
                }
                logger.debug('Label/folder action executed', { emailId: email.id, labelName });
                return;
            }

            // Standard actions
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
                    return draftId;
                } else if (action === 'star') {
                    await this.gmailService.starMessage(account, email.external_id);
                } else if (action === 'important') {
                    await this.gmailService.addLabel(account, email.external_id, ['IMPORTANT']);
                } else if (action === 'unstar') {
                    await this.gmailService.removeLabel(account, email.external_id, ['STARRED']);
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
                    const draftId = await this.microsoftService.createDraft(account, email.external_id, draftContent);
                    return draftId;
                } else if (action === 'star' || action === 'important') {
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
    private async checkStopRequested(userId: string, eventLogger?: EventLogger | null): Promise<boolean> {
        // Throttle check to once per second
        if (Date.now() - this.lastStopCheck < 1000) {
            return false;
        }
        this.lastStopCheck = Date.now();

        try {
            const { data: settings } = await this.supabase
                .from('user_settings')
                .select('sync_stop_requested')
                .eq('user_id', userId)
                .single();

            if (settings?.sync_stop_requested) {
                logger.info('Stop sync requested by user', { userId });
                if (eventLogger) {
                    await eventLogger.info('Stopped', 'Sync interrupted by user.', undefined);
                }
                return true;
            }
        } catch (err) {
            logger.warn('Failed to check stop request status', { error: err, userId });
        }
        return false;
    }

    private async resetStopRequest(userId: string): Promise<void> {
        try {
            await this.supabase
                .from('user_settings')
                .update({ sync_stop_requested: false })
                .eq('user_id', userId);
        } catch (err) {
            logger.warn('Failed to reset stop request status', { error: err, userId });
        }
    }
}
