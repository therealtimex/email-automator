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
        logger.warn('Supabase not configured or invalid URL - skipping client initialization');
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
        logger.warn('Service role Supabase not configured or invalid URL');
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
    llm_model: string | null;
    llm_base_url: string | null;
    llm_api_key: string | null;
    auto_trash_spam: boolean;
    smart_drafts: boolean;
    sync_interval_minutes: number;
    created_at: string;
    updated_at: string;
}
