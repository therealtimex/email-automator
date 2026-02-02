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
        logger.debug('Supabase not configured or invalid URL - skipping client initialization');
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
        logger.debug('Service role Supabase not configured or invalid URL');
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
export interface EmailAccount {
    id: string;
    user_id: string;
    provider: 'gmail' | 'outlook';
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
}

export interface Email {
    id: string;
    account_id: string;
    external_id: string;
    subject: string | null;
    sender: string | null;
    recipient: string | null;
    date: string | null;
    body_snippet: string | null;
    category: string | null;
    is_useless: boolean;
    ai_analysis: Record<string, unknown> | null;
    suggested_action: string | null; // Deprecated
    suggested_actions?: string[];
    action_taken: string | null; // Deprecated
    actions_taken?: string[];
    created_at: string;
    email_accounts?: EmailAccount;
    // ETL fields
    file_path?: string | null;
    processing_status: 'pending' | 'processing' | 'completed' | 'failed';
    processing_error?: string | null;
    retry_count: number;
    // Draft fields
    draft_status?: 'pending' | 'sent' | 'dismissed' | null;
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
    // Rule Pack Support (Zero-Config UX)
    pack?: string | null;              // Pack identifier (e.g., 'universal', 'executive', 'developer')
    rule_template_id?: string | null;  // Template ID (e.g., 'universal-newsletters')
    is_system_managed?: boolean;       // If true, part of a pack - can be disabled but not deleted
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
    // Zero-Config UX Support
    user_role?: string | null;           // User role (executive, developer, sales, operations, other)
    onboarding_completed?: boolean;      // Whether user completed role selection onboarding
}

// Zero-Config UX: Pack Installation Tracking
export interface PackInstallation {
    id: string;
    user_id: string;
    pack_id: string;
    installed_at: string;
    uninstalled_at: string | null;
    source: 'onboarding' | 'manual' | 'auto';
}

// Zero-Config UX: Rule Effectiveness Metrics
export interface RuleMetrics {
    rule_id: string;
    date: string;
    times_triggered: number;
    times_undone: number;
    times_edited: number;
    enabled: boolean;
}

// Zero-Config UX: Action History for Undo Capability
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
