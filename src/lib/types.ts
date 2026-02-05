// Database types
export interface Profile {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    avatar_url: string | null;
    is_admin: boolean;
    created_at: string;
    updated_at: string;
}

export interface EmailAccount {
    id: string;
    user_id: string;
    provider: 'gmail' | 'outlook' | 'imap';
    email_address: string;
    is_active: boolean;
    connection_type?: 'oauth' | 'imap' | null;
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
    suggested_action?: EmailAction | null; // Deprecated
    suggested_actions?: EmailAction[];
    action_taken?: EmailAction | null; // Deprecated
    actions_taken?: EmailAction[];
    created_at: string;
    email_accounts?: EmailAccount;
    // ETL fields
    file_path?: string | null;
    processing_status: 'pending' | 'processing' | 'completed' | 'failed';
    processing_error?: string | null;
    retry_count: number;
    // Draft tracking fields
    draft_id?: string | null;
    draft_content?: string | null;
    draft_status?: 'pending' | 'sent' | 'dismissed';
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
    condition: RuleCondition; // Legacy - kept for backwards compatibility
    action?: 'delete' | 'archive' | 'draft' | 'star'; // Legacy single action
    actions?: ('delete' | 'archive' | 'draft' | 'star')[]; // New multi-action array
    instructions?: string; // Draft generation instructions
    attachments?: RuleAttachment[];
    is_enabled: boolean;
    is_system?: boolean; // New flag for pre-defined rules
    category?: string | null; // Category for UI grouping
    rule_template_id?: string | null; // Template ID for system defaults
    is_system_managed?: boolean; // If true, system-managed rule
    created_at: string;
}

export interface RuleCondition {
    category?: EmailCategory;
    is_useless?: boolean;
    sender_contains?: string;
    sender_domain?: string;
    sender_email?: string;
    subject_contains?: string;
    body_contains?: string;
    older_than_days?: number;
    priority?: Priority;
    sentiment?: Sentiment;
    suggested_actions?: EmailAction[];
}

export interface RuleAttachment {
    name: string;
    path: string;
    type: string;
    size: number;
}

export interface UserSettings {
    id?: string;
    user_id?: string;
    llm_provider: string | null;
    llm_model: string | null;
    auto_trash_spam?: boolean;
    smart_drafts?: boolean;
    storage_path?: string | null;
    intelligent_rename?: boolean;
    sync_interval_minutes: number;
    preferences?: Record<string, any>;
    // TTS Settings
    tts_auto_play?: boolean;
    tts_provider?: string;
    tts_voice?: string | null;
    tts_speed?: number;
    tts_quality?: number;
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

// User Persona & Preferences
export interface UserPersona {
    // Professional Identity
    full_name?: string;
    role?: string;
    company?: string;
    industry?: string;
    work_style?: 'corporate' | 'startup' | 'creative' | 'academic';

    // Communication
    preferred_tone?: 'formal' | 'professional' | 'casual' | 'friendly';
    preferred_length?: 'brief' | 'medium' | 'detailed';
    signature?: string;
    common_phrases?: string[];

    // Relationships
    vip_senders?: string[];
    trusted_domains?: string[];
    blocked_domains?: string[];

    // Goals & Automation
    primary_goal?: 'inbox_zero' | 'respond_faster' | 'focus' | 'reduce_time';
    time_budget_minutes?: number;
    automation_level?: number; // 1-10
    never_automate_categories?: string[];

    // Adaptive Learning Fields (Phase 4)
    category_patterns?: Record<string, string>; // { "domain.com": "newsletter" }
    auto_archive_domains?: string[];
    never_draft_domains?: string[];

    // Metadata
    persona_completed?: boolean;
    persona_completed_at?: string;
}

export interface UserPreferences extends UserPersona {
    id: string;
    // ... kept for backward compatibility if needed, but UserSettings is the main one now
}

export interface UserSettings extends UserPersona {
    id?: string;
    user_id?: string;
    llm_provider: string | null;
    llm_model: string | null;
    auto_trash_spam?: boolean;
    smart_drafts?: boolean;
    storage_path?: string | null;
    intelligent_rename?: boolean;
    sync_interval_minutes: number;
    // Zero-Config UX
    user_role?: string | null;
    onboarding_completed?: boolean;
    // TTS Settings
    tts_auto_play?: boolean;
    tts_provider?: string;
    tts_voice?: string | null;
    tts_speed?: number;
    tts_quality?: number;
    // Embedding Settings (for RAG)
    embedding_provider?: string | null;
    embedding_model?: string | null;
    // Legacy
    preferences?: Record<string, any>;
}

export interface UserFeedback {
    id: string;
    user_id: string;
    email_id?: string;
    account_id?: string;
    feedback_type: 'analysis' | 'draft' | 'general' | 'implicit_edit';
    original_data: any;
    corrected_data: any;
    sender_pattern?: string;
    reasoning?: string;
    created_at: string;
    processed_for_learning: boolean;
}

// Enums
export type EmailCategory = 'spam' | 'newsletter' | 'news' | 'promotional' | 'transactional' | 'social' | 'support' | 'client' | 'internal' | 'personal' | 'notification' | 'other';
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
    language?: string; // ISO 639-1 code (en, vi, ja, etc.) or language name
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
