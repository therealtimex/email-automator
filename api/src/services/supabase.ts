import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('SupabaseService');

let serverClient: SupabaseClient | null = null;
let lastConfigHash = '';

export function isValidUrl(url: string): boolean {
    try {
        return url.startsWith('http://') || url.startsWith('https://');
    } catch {
        return false;
    }
}

function getConfigHash() {
    return `${config.supabase.url}_${config.supabase.anonKey}`;
}

export function getServerSupabase(forceRefresh = false): SupabaseClient | null {
    const currentHash = getConfigHash();

    if (serverClient && !forceRefresh && currentHash === lastConfigHash) {
        return serverClient;
    }

    const url = config.supabase.url;
    const key = config.supabase.anonKey;

    if (!url || !key || !isValidUrl(url)) {
        // BYOK mode: Supabase configured via UI, not .env - this is expected
        return null;
    }

    try {
        serverClient = createClient(url, key, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        lastConfigHash = currentHash;
        logger.info('Server Supabase client initialized/refreshed');
        return serverClient;
    } catch (error) {
        logger.error('Failed to initialize Supabase client', error);
        return null;
    }
}

export function getServiceRoleSupabase(): SupabaseClient | null {
    const url = config.supabase.url;
    const key = config.supabase.serviceRoleKey;

    if (!url || !key || !isValidUrl(url)) {
        // BYOK mode: Service role Supabase configured via UI, not .env - this is expected
        return null;
    }

    try {
        return createClient(url, key, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    } catch (error) {
        logger.error('Failed to initialize Service Role Supabase client', error);
        return null;
    }
}

// Database types (expand as needed)
// Enums for standardization
export type DraftStatus = 'pending' | 'sent' | 'dismissed';
export type EmailAction = 'reply' | 'draft' | 'archive' | 'trash' | 'mark_read' | 'label' | 'forward';

export interface EmailAccount {
    id: string;
    user_id: string;
    provider: 'gmail' | 'outlook' | 'imap';
    email_address: string;
    access_token: string | null;
    refresh_token: string | null;
    token_expires_at: string | null;
    scopes: string[];
    is_active: boolean;
    last_sync_checkpoint?: string | null;
    sync_start_date?: string | null;
    sync_max_emails_per_run?: number;
    last_sync_at?: string | null;
    last_sync_status?: 'idle' | 'syncing' | 'success' | 'error';
    last_sync_error?: string | null;
    created_at: string;
    updated_at: string;
    connection_type?: string | null; // 'oauth' (default) or 'imap'
    imap_config?: any | null; // JSONB with IMAP/SMTP details
}

export interface Email {
    id: string;
    account_id: string;
    created_at: string;

    // Core Email Fields
    external_id: string;
    subject: string | null;
    sender: string | null;
    recipient: string | null;
    date: string | null;
    body_snippet: string | null;
    category: string | null;
    is_useless: boolean;
    ai_analysis: Record<string, unknown> | null;

    // Email Header Metadata (for rule matching and LLM analysis)
    headers?: Record<string, any> | null;
    recipient_type?: 'to' | 'cc' | 'bcc' | null;
    is_automated?: boolean | null;
    has_unsubscribe?: boolean | null;
    is_reply?: boolean | null;
    thread_id?: string | null;
    mailer?: string | null;
    sender_priority?: 'high' | 'normal' | 'low' | null;

    // Action Fields
    suggested_action: string | null; // Deprecated
    suggested_actions?: string[];
    action_taken: string | null; // Deprecated
    actions_taken?: string[];
    email_accounts?: EmailAccount;
    // ETL fields
    file_path?: string | null;
    processing_status: 'pending' | 'processing' | 'completed' | 'failed';
    processing_error?: string | null;
    retry_count: number;
    // Draft fields
    draft_status?: DraftStatus | null;
    draft_content?: string | null;  // For persisting generated draft
    draft_id?: string | null;       // Gmail/Outlook draft ID
    draft_created_at?: string | null;
    draft_sent_at?: string | null;
    draft_dismissed_at?: string | null;
}

export interface Rule {
    id: string;
    user_id: string;
    name: string;
    description?: string;  // Semantic context for AI matching
    intent?: string;       // The intent behind the rule (e.g., "Politely decline sales pitches")
    priority?: number;     // Higher = evaluated first by AI
    condition: Record<string, unknown>; // Legacy - kept for backwards compatibility
    action?: 'delete' | 'archive' | 'draft' | 'star' | 'read'; // Legacy single action
    actions?: ('delete' | 'archive' | 'draft' | 'star' | 'read')[]; // New multi-action array
    instructions?: string; // Draft generation instructions
    attachments?: any[];
    is_enabled: boolean;
    created_at: string;
    // Rule categorization and templates
    category?: string | null;          // Category for UI grouping (e.g., 'email_organization', 'priority_alerts')
    rule_template_id?: string | null;  // Template ID to identify system defaults
    is_system_managed?: boolean;       // If true, system-managed - can be disabled but not deleted
}

export interface ProcessingLog {
    id: string;
    user_id: string;
    account_id: string | null;
    status: 'running' | 'success' | 'failed';
    started_at: string;
    completed_at: string | null;
    emails_processed: number;
    emails_deleted: number;
    emails_drafted: number;
    error_message: string | null;
}

export interface UserSettings {
    id: string;
    user_id: string;
    llm_provider: string | null;
    llm_model: string | null;
    auto_trash_spam: boolean;
    smart_drafts: boolean;
    sync_interval_minutes: number;
    created_at: string;
    updated_at: string;

    // Adaptive Learning Fields (JSONB)
    category_patterns?: Record<string, string>; // e.g. {"linkedin.com": "newsletter"}
    auto_archive_domains?: string[];
    never_draft_domains?: string[];

    // Persona Fields
    full_name?: string | null;
    role?: string | null;
    company?: string | null;
    industry?: string | null;
    work_style?: string | null;
    preferred_tone?: string | null;
    preferred_length?: number | null;
    signature?: string | null;
    common_phrases?: string[];
    vip_senders?: string[];
    trusted_domains?: string[];
    blocked_domains?: string[];
    primary_goal?: string | null;
    time_budget_minutes?: number | null;
    automation_level?: number | null;
    never_automate_categories?: string[];
    persona_completed?: boolean;
    persona_completed_at?: string | null;
}

export interface LearningMetrics {
    id: string;
    user_id: string;
    total_classifications: number;
    correct_classifications: number;
    drafts_generated: number;
    drafts_edited: number;
    drafts_sent_unedited: number;
    drafts_dismissed: number;
    category_accuracy: Record<string, number>;
    updated_at: string;
}

export interface UserFeedback {
    id: string;
    user_id: string;
    email_id: string;
    account_id?: string;
    feedback_type: 'analysis' | 'draft' | 'draft_edit';
    original_data: Record<string, unknown>;
    corrected_data: Record<string, unknown>;
    reasoning?: string | null;
    sender_pattern?: string | null;
    created_at: string;
    // Joined data from emails table
    emails?: {
        sender?: string;
    };
}

// Rule Effectiveness Metrics
export interface RuleMetrics {
    rule_id: string;
    date: string;
    times_triggered: number;
    times_undone: number;
    times_edited: number;
    enabled: boolean;
}

// Action History for Undo Capability
export interface ActionHistory {
    id: string;
    email_id: string;
    rule_id: string | null;
    action: string;
    sync_id: string | null;
    executed_at: string;
    undone: boolean;
    undone_at: string | null;
    metadata: Record<string, unknown> | null;
}
