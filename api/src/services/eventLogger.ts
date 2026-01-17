import { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('EventLogger');

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
            const { error } = await this.supabase.from('processing_events').insert({
                run_id: this.runId,
                email_id: emailId || null,
                event_type: eventType,
                agent_state: agentState,
                details: details || {},
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

    async info(state: string, message: string, details?: any) {
        await this.log('info', state, { message, ...details });
    }

    async analysis(state: string, emailId: string, analysis: any) {
        await this.log('analysis', state, analysis, emailId);
    }

    async action(state: string, emailId: string, action: string, reason?: string) {
        await this.log('action', state, { action, reason }, emailId);
    }

    async error(state: string, error: any, emailId?: string) {
        await this.log('error', state, { error: error.message || error }, emailId);
    }
}
