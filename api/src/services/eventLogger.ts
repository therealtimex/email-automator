import { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('EventLogger');

/**
 * Sanitize objects for JSON serialization (prevent circular refs, too large strings, etc.)
 */
function sanitizeForJSON(obj: any, maxStringLength = 10000): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') return obj.length > maxStringLength ? obj.substring(0, maxStringLength) + '... [truncated]' : obj;
    if (typeof obj === 'number' || typeof obj === 'boolean') return obj;
    if (obj instanceof Date) return obj.toISOString();
    if (obj instanceof Error) return { message: obj.message, stack: obj.stack?.substring(0, 1000) };

    if (Array.isArray(obj)) {
        return obj.slice(0, 100).map(item => sanitizeForJSON(item, maxStringLength)); // Limit arrays to 100 items
    }

    if (typeof obj === 'object') {
        const seen = new WeakSet();
        const sanitize = (o: any, depth = 0): any => {
            if (depth > 5) return '[max depth]'; // Prevent deep nesting
            if (seen.has(o)) return '[circular]';
            seen.add(o);

            const result: any = {};
            let count = 0;
            for (const key in o) {
                if (count++ > 50) break; // Limit object properties
                if (o.hasOwnProperty(key)) {
                    result[key] = sanitizeForJSON(o[key], maxStringLength);
                }
            }
            return result;
        };
        return sanitize(obj);
    }

    return String(obj);
}

export class EventLogger {
    constructor(
        private supabase: SupabaseClient,
        private runId: string
    ) {}

    async log(
        eventType: 'info' | 'analysis' | 'action' | 'error',
        agentState: string,
        details?: any,
        emailId?: string
    ) {
        try {
            // Sanitize details to prevent JSON serialization issues
            const sanitizedDetails = sanitizeForJSON(details || {});

            const { error } = await this.supabase.from('processing_events').insert({
                run_id: this.runId,
                email_id: emailId || null,
                event_type: eventType,
                agent_state: agentState,
                details: sanitizedDetails,
                created_at: new Date().toISOString()
            });

            if (error) {
                console.error('[EventLogger] Supabase Insert Error:', error);
            }
        } catch (error) {
            // Non-blocking error logging - don't fail the job because logging failed
            logger.error('Failed to write processing event', error);
        }
    }

    async info(state: string, message: string, details?: any, emailId?: string) {
        await this.log('info', state, { message, ...details }, emailId);
    }

    async analysis(state: string, emailId: string, analysis: any) {
        await this.log('analysis', state, analysis, emailId);
    }

    async action(state: string, emailId: string, action: string, reason?: string) {
        await this.log('action', state, { action, reason }, emailId);
    }

    async success(state: string, message: string, details?: any) {
        await this.log('info', state, { message, ...details, is_completion: true });
    }

    async error(state: string, errorOrDetails: any, emailId?: string) {
        let details;
        if (errorOrDetails instanceof Error) {
            details = { error: errorOrDetails.message };
        } else if (typeof errorOrDetails === 'object' && errorOrDetails !== null) {
            details = errorOrDetails;
        } else {
            details = { error: String(errorOrDetails) };
        }
        await this.log('error', state, details, emailId);
    }
}
