import { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '../utils/logger.js';
import { UserSettings, LearningMetrics, UserFeedback } from './supabase.js';

const logger = createLogger('LearningService');

export class LearningService {
    private supabase: SupabaseClient;

    constructor(supabase: SupabaseClient) {
        this.supabase = supabase;
    }

    /**
     * Main entry point: Process recent feedback to update learning models
     * Should be called periodically (e.g., daily)
     */
    async processFeedback(): Promise<void> {
        logger.info('Starting feedback processing cycle');

        try {
            // 1. Fetch recent feedback (last 24 hours) with email data for sender info
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { data: feedbackItems, error } = await this.supabase
                .from('user_feedback')
                .select(`
                    *,
                    emails!inner(sender)
                `)
                .gte('created_at', yesterday);

            if (error) throw error;
            if (!feedbackItems || feedbackItems.length === 0) {
                logger.info('No new feedback to process');
                return;
            }

            logger.info(`Processing ${feedbackItems.length} feedback items`);

            // Group feedback by user to minimize DB writes
            const userFeedbackMap = new Map<string, UserFeedback[]>();
            for (const item of feedbackItems) {
                const userId = item.user_id;
                if (!userFeedbackMap.has(userId)) {
                    userFeedbackMap.set(userId, []);
                }
                userFeedbackMap.get(userId)?.push(item as UserFeedback);
            }

            // Process per user
            for (const [userId, items] of userFeedbackMap.entries()) {
                await this.processUserFeedback(userId, items);
            }

        } catch (error) {
            logger.error('Failed to process feedback', error);
        }
    }

    private async processUserFeedback(userId: string, items: UserFeedback[]): Promise<void> {
        try {
            // Fetch current settings
            const { data: settings } = await this.supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (!settings) return;

            let updates: Partial<UserSettings> = {};
            let metricsUpdates: Partial<LearningMetrics> = {
                total_classifications: items.length
            };

            // 1. Learn Category Patterns
            // If user corrected categorization for a domain > X times
            const categoryCorrections = items.filter(i => {
                const sender = i.emails?.sender;
                const hasSender = !!sender && sender.includes('@');
                return i.feedback_type === 'analysis' &&
                    i.original_data?.category !== i.corrected_data?.category &&
                    hasSender;
            });

            if (categoryCorrections.length > 0) {
                const newPatterns = this.learnCategoryPatterns(
                    settings.category_patterns || {},
                    categoryCorrections
                );
                if (Object.keys(newPatterns).length > Object.keys(settings.category_patterns || {}).length) {
                    updates.category_patterns = newPatterns;
                }
            }

            // 2. Identify VIPs
            // If user marked as 'important' multiple times
            const vipCandidates = items.filter(i => {
                const sender = i.emails?.sender;
                return i.corrected_data?.priority === 'high' && sender;
            });

            if (vipCandidates.length > 0) {
                const newVips = this.learnVips(
                    settings.vip_senders || [],
                    vipCandidates
                );
                if (newVips.length > (settings.vip_senders || []).length) {
                    updates.vip_senders = newVips;
                }
            }

            // 3. Draft Style (Tone/Length)
            const draftEdits = items.filter(i => i.feedback_type === 'draft_edit');
            if (draftEdits.length > 0) {
                // TODO: Advanced text analysis to detect tone shift
                // For now, simpler metric: are we too verbose?
                const lengthMetric = this.analyzeLengthPreference(draftEdits);
                if (lengthMetric !== null) {
                    updates.preferred_length = lengthMetric;
                }
            }

            // Apply updates if any
            if (Object.keys(updates).length > 0) {
                await this.supabase
                    .from('user_settings')
                    .update(updates)
                    .eq('user_id', userId);

                logger.info('Applied learning updates for user', { userId, fields: Object.keys(updates) });
            }

            // Update Metrics (simplified for now)
            await this.updateMetrics(userId, items);

        } catch (error) {
            logger.error('Error processing user feedback', error as Error);
        }
    }

    private learnCategoryPatterns(
        currentPatterns: Record<string, string>,
        items: UserFeedback[]
    ): Record<string, string> {
        const newPatterns = { ...currentPatterns };

        // Count corrections per domain
        const domainCounts = new Map<string, Map<string, number>>(); // domain -> category -> count

        for (const item of items) {
            // Extract domain from email sender
            const sender = item.emails?.sender;
            if (!sender) continue;

            const domain = sender.includes('@') ? sender.split('@')[1] : null;
            const category = item.corrected_data?.category as string | undefined;

            if (!domain || !category || typeof category !== 'string') continue;

            if (!domainCounts.has(domain)) {
                domainCounts.set(domain, new Map());
            }
            const catMap = domainCounts.get(domain)!;
            catMap.set(category, (catMap.get(category) || 0) + 1);
        }

        // Apply rule if threshold met (e.g. 2 corrections)
        for (const [domain, catMap] of domainCounts.entries()) {
            for (const [category, count] of catMap.entries()) {
                if (count >= 2) {
                    newPatterns[domain] = category;
                    logger.debug(`Learned pattern: ${domain} -> ${category}`);
                }
            }
        }

        return newPatterns;
    }

    private learnVips(currentVips: string[], items: UserFeedback[]): string[] {
        const vips = new Set(currentVips);
        const priorityCount = new Map<string, number>();

        // Count high priority corrections per sender
        for (const item of items) {
            const sender = item.emails?.sender;
            if (sender && item.corrected_data?.priority === 'high') {
                priorityCount.set(sender, (priorityCount.get(sender) || 0) + 1);
            }
        }

        // Only add as VIP if 3+ high priority corrections (prevents false positives)
        for (const [email, count] of priorityCount.entries()) {
            if (count >= 3) {
                vips.add(email);
                logger.debug(`Learned VIP: ${email} (${count} high priority corrections)`);
            }
        }

        return Array.from(vips);
    }

    private analyzeLengthPreference(items: UserFeedback[]): number | null {
        // Simple heuristic: compare original length vs corrected length
        // If corrected is consistently shorter, decrease preferred_length
        let totalDelta = 0;
        let count = 0;

        for (const item of items) {
            const original = (item.original_data?.draft_content as string)?.length || 0;
            const corrected = (item.corrected_data?.draft_content as string)?.length || 0;
            if (original > 0 && corrected > 0) {
                totalDelta += (corrected - original);
                count++;
            }
        }

        if (count === 0) return null;

        const avgDelta = totalDelta / count;
        if (avgDelta < -50) return 1; // Prefer short
        if (avgDelta > 50) return 3;  // Prefer long
        return null; // No strong signal
    }

    private async updateMetrics(userId: string, items: UserFeedback[]): Promise<void> {
        try {
            // Separate positive feedback (correct) from corrections (incorrect)
            const positiveFeedback = items.filter(i =>
                i.feedback_type === 'analysis' && i.corrected_data?.is_correct === true
            );
            const corrections = items.filter(i =>
                i.feedback_type === 'analysis' && i.corrected_data?.is_correct !== true
            );
            const draftEdits = items.filter(i => i.feedback_type === 'draft_edit').length;

            // Fetch existing or create
            const { data: existing, error: fetchError } = await this.supabase
                .from('learning_metrics')
                .select('*')
                .eq('user_id', userId)
                .single();

            // PGRST116 is "not found" error code - it's OK if record doesn't exist yet
            if (fetchError && fetchError.code !== 'PGRST116') {
                throw fetchError;
            }

            if (existing) {
                const { error: updateError } = await this.supabase
                    .from('learning_metrics')
                    .update({
                        total_classifications: (existing.total_classifications || 0) + items.length,
                        correct_classifications: (existing.correct_classifications || 0) + positiveFeedback.length,
                        drafts_edited: (existing.drafts_edited || 0) + draftEdits,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id);

                if (updateError) throw updateError;
            } else {
                const { error: insertError } = await this.supabase
                    .from('learning_metrics')
                    .insert({
                        user_id: userId,
                        total_classifications: items.length,
                        correct_classifications: positiveFeedback.length,
                        drafts_edited: draftEdits
                    });

                if (insertError) throw insertError;
            }

            logger.info('Updated learning metrics', {
                userId,
                positive: positiveFeedback.length,
                corrections: corrections.length,
                total: items.length
            });
        } catch (error) {
            logger.error('Failed to update learning metrics', error as Error);
        }
    }
}
