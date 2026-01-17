// Database types
export interface EmailAccount {
    id: string;
    user_id: string;
    provider: 'gmail' | 'outlook';
    email_address: string;
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
    category: EmailCategory | null;
    is_useless: boolean;
    ai_analysis: EmailAnalysis | null;
    suggested_action: EmailAction | null;
    action_taken: EmailAction | null;
    created_at: string;
    email_accounts?: EmailAccount;
}

export interface Rule {
    id: string;
    user_id: string;
    name: string;
    condition: RuleCondition;
    action: 'delete' | 'archive' | 'draft' | 'read' | 'star';
    is_enabled: boolean;
    created_at: string;
}

export interface RuleCondition {
    category?: EmailCategory;
    is_useless?: boolean;
    sender_contains?: string;
    subject_contains?: string;
}

export interface UserSettings {
    id?: string;
    user_id?: string;
    llm_model: string | null;
    llm_base_url: string | null;
    llm_api_key: string | null;
    auto_trash_spam: boolean;
    smart_drafts: boolean;
    sync_interval_minutes: number;
    preferences?: Record<string, any>;
}

export interface Integration {
    id: string;
    user_id: string;
    provider: 'google' | 'microsoft' | 'openai';
    credentials: Record<string, any>;
    is_enabled: boolean;
    created_at: string;
    updated_at: string;
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

export interface ProcessingEvent {
    id: string;
    run_id: string;
    email_id?: string | null;
    event_type: 'info' | 'analysis' | 'action' | 'error';
    agent_state: string;
    details?: any;
    created_at: string;
}

// Enums
export type EmailCategory = 'spam' | 'newsletter' | 'support' | 'client' | 'internal' | 'personal' | 'other';
export type EmailAction = 'none' | 'delete' | 'archive' | 'reply' | 'flag' | 'draft';
export type Sentiment = 'Positive' | 'Neutral' | 'Negative';
export type Priority = 'High' | 'Medium' | 'Low';

// AI Analysis
export interface EmailAnalysis {
    summary: string;
    category: EmailCategory;
    sentiment: Sentiment;
    is_useless: boolean;
    suggested_action: EmailAction;
    draft_response?: string;
    priority: Priority;
    key_points?: string[];
    action_items?: string[];
}

// Stats
export interface Stats {
    totalEmails: number;
    categoryCounts: Record<string, number>;
    actionCounts: Record<string, number>;
    uselessCount: number;
    accountCount: number;
    accountsByProvider: Record<string, number>;
    recentSyncs: ProcessingLog[];
}

// API Response types
export interface ApiError {
    code: string;
    message: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    limit: number;
    offset: number;
}
