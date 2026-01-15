import { SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';
import { createLogger } from '../utils/logger.js';
import { EmailProcessorService } from './processor.js';
import { getServerSupabase } from './supabase.js';

const logger = createLogger('Scheduler');

interface ScheduledJob {
    id: string;
    name: string;
    interval: number;
    lastRun: Date | null;
    isRunning: boolean;
    timer: NodeJS.Timeout | null;
}

class SyncScheduler {
    private jobs: Map<string, ScheduledJob> = new Map();
    private supabase: SupabaseClient | null = null;

    constructor() {
        this.supabase = getServerSupabase();
    }

    async start(): Promise<void> {
        if (!this.supabase) {
            logger.warn('Supabase not configured, scheduler disabled');
            return;
        }

        logger.info('Starting sync scheduler');

        // Schedule periodic sync for all active accounts
        this.scheduleGlobalSync();

        // Schedule cleanup job
        this.scheduleCleanup();
    }

    stop(): void {
        logger.info('Stopping sync scheduler');
        for (const job of this.jobs.values()) {
            if (job.timer) {
                clearInterval(job.timer);
            }
        }
        this.jobs.clear();
    }

    private scheduleGlobalSync(): void {
        const jobId = 'global-sync';
        const interval = config.processing.syncIntervalMs;

        const job: ScheduledJob = {
            id: jobId,
            name: 'Global Email Sync',
            interval,
            lastRun: null,
            isRunning: false,
            timer: null,
        };

        job.timer = setInterval(async () => {
            if (job.isRunning) {
                logger.debug('Global sync already running, skipping');
                return;
            }

            job.isRunning = true;
            try {
                await this.runGlobalSync();
                job.lastRun = new Date();
            } catch (error) {
                logger.error('Global sync failed', error);
            } finally {
                job.isRunning = false;
            }
        }, interval);

        this.jobs.set(jobId, job);
        logger.info(`Scheduled global sync every ${interval / 1000}s`);
    }

    private async runGlobalSync(): Promise<void> {
        if (!this.supabase) return;

        // Get all active accounts with their user settings
        const { data: accounts, error } = await this.supabase
            .from('email_accounts')
            .select(`
                id,
                user_id,
                provider,
                is_active
            `)
            .eq('is_active', true);

        if (error) {
            logger.error('Failed to fetch accounts for sync', error);
            return;
        }

        if (!accounts || accounts.length === 0) {
            logger.debug('No active accounts to sync');
            return;
        }

        logger.info(`Running global sync for ${accounts.length} accounts`);

        // Group by user to check their sync interval settings
        const userAccounts = new Map<string, typeof accounts>();
        for (const account of accounts) {
            const existing = userAccounts.get(account.user_id) || [];
            existing.push(account);
            userAccounts.set(account.user_id, existing);
        }

        // Process each user's accounts
        for (const [userId, userAccountList] of userAccounts) {
            // Check user's sync interval preference
            const { data: settings } = await this.supabase
                .from('user_settings')
                .select('sync_interval_minutes')
                .eq('user_id', userId)
                .single();

            const syncIntervalMs = (settings?.sync_interval_minutes || 5) * 60 * 1000;

            // Check last sync time
            const { data: lastLog } = await this.supabase
                .from('processing_logs')
                .select('started_at')
                .eq('user_id', userId)
                .eq('status', 'success')
                .order('started_at', { ascending: false })
                .limit(1)
                .single();

            if (lastLog) {
                const lastSyncTime = new Date(lastLog.started_at).getTime();
                const now = Date.now();
                if (now - lastSyncTime < syncIntervalMs) {
                    logger.debug(`Skipping sync for user ${userId}, last sync was recent`);
                    continue;
                }
            }

            // Sync each account
            const processor = new EmailProcessorService(this.supabase);
            for (const account of userAccountList) {
                try {
                    await processor.syncAccount(account.id, userId);
                } catch (error) {
                    logger.error('Account sync failed', error, { accountId: account.id });
                }
            }
        }
    }

    private scheduleCleanup(): void {
        const jobId = 'cleanup';
        const interval = 24 * 60 * 60 * 1000; // Daily

        const job: ScheduledJob = {
            id: jobId,
            name: 'Data Cleanup',
            interval,
            lastRun: null,
            isRunning: false,
            timer: null,
        };

        job.timer = setInterval(async () => {
            if (job.isRunning) return;

            job.isRunning = true;
            try {
                await this.runCleanup();
                job.lastRun = new Date();
            } catch (error) {
                logger.error('Cleanup failed', error);
            } finally {
                job.isRunning = false;
            }
        }, interval);

        this.jobs.set(jobId, job);
        logger.info('Scheduled daily cleanup');
    }

    private async runCleanup(): Promise<void> {
        if (!this.supabase) return;

        logger.info('Running cleanup job');

        // Delete old processing logs (older than 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { error: logsError } = await this.supabase
            .from('processing_logs')
            .delete()
            .lt('started_at', thirtyDaysAgo.toISOString());

        if (logsError) {
            logger.error('Failed to cleanup old logs', logsError);
        }

        // Delete emails that were trashed more than 7 days ago
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { error: emailsError } = await this.supabase
            .from('emails')
            .delete()
            .eq('action_taken', 'delete')
            .lt('created_at', sevenDaysAgo.toISOString());

        if (emailsError) {
            logger.error('Failed to cleanup old emails', emailsError);
        }

        logger.info('Cleanup completed');
    }

    getJobStatus(): Array<{ id: string; name: string; lastRun: Date | null; isRunning: boolean }> {
        return Array.from(this.jobs.values()).map(job => ({
            id: job.id,
            name: job.name,
            lastRun: job.lastRun,
            isRunning: job.isRunning,
        }));
    }
}

// Singleton
let schedulerInstance: SyncScheduler | null = null;

export function getScheduler(): SyncScheduler {
    if (!schedulerInstance) {
        schedulerInstance = new SyncScheduler();
    }
    return schedulerInstance;
}

export function startScheduler(): void {
    getScheduler().start();
}

export function stopScheduler(): void {
    if (schedulerInstance) {
        schedulerInstance.stop();
    }
}
