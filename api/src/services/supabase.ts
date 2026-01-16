import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('SupabaseService');

let serverClient: SupabaseClient | null = null;

export function getServerSupabase(): SupabaseClient | null {
    if (serverClient) return serverClient;

    if (!config.supabase.url || !config.supabase.anonKey) {
        logger.warn('Supabase not configured - URL or ANON_KEY missing');
        return null;
    }

    serverClient = createClient(config.supabase.url, config.supabase.anonKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    logger.info('Server Supabase client initialized');
    return serverClient;
}

export function getServiceRoleSupabase(): SupabaseClient | null {
    if (!config.supabase.url || !config.supabase.serviceRoleKey) {
        logger.warn('Service role Supabase not configured');
        return null;
    }

    return createClient(config.supabase.url, config.supabase.serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
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
    suggested_action: string | null;
    action_taken: string | null;
    created_at: string;
}

export interface Rule {
    id: string;
    user_id: string;
    name: string;
    condition: Record<string, unknown>;
    action: 'delete' | 'archive' | 'draft';
    is_enabled: boolean;
    created_at: string;
}

export interface ProcessingLog {
    id: string;
    user_id: string;
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
