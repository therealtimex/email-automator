-- Initial Schema for Email Automator

-- 1. Email Accounts (Gmail/M365)
CREATE TABLE IF NOT EXISTS email_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook')),
    email_address TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    scopes TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, email_address)
);

-- 2. Emails
CREATE TABLE IF NOT EXISTS emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL, -- Message-ID or provider's internal ID
    subject TEXT,
    sender TEXT,
    recipient TEXT,
    date TIMESTAMP WITH TIME ZONE,
    body_snippet TEXT,
    category TEXT, -- spam, newsletter, support, client, internal, personal
    is_useless BOOLEAN DEFAULT false,
    ai_analysis JSONB, -- full analysis result
    suggested_action TEXT,
    action_taken TEXT, -- archived, deleted, drafted, none
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(account_id, external_id)
);

-- 3. Automation Rules
CREATE TABLE IF NOT EXISTS rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    condition JSONB NOT NULL, -- e.g., { "category": "spam" }
    action TEXT NOT NULL CHECK (action IN ('delete', 'archive', 'draft')),
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Processing Logs
CREATE TABLE IF NOT EXISTS processing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL, -- success, failed, running
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    emails_processed INTEGER DEFAULT 0,
    emails_deleted INTEGER DEFAULT 0,
    emails_drafted INTEGER DEFAULT 0,
    error_message TEXT
);

-- Enable RLS
ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_logs ENABLE ROW LEVEL SECURITY;

-- Simple RLS Policies (User can only see their own data)
CREATE POLICY "Users can only access their own email accounts" ON email_accounts
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access emails from their accounts" ON emails
    FOR ALL USING (EXISTS (
        SELECT 1 FROM email_accounts WHERE email_accounts.id = emails.account_id AND email_accounts.user_id = auth.uid()
    ));

CREATE POLICY "Users can only access their own rules" ON rules
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own processing logs" ON processing_logs
    FOR ALL USING (auth.uid() = user_id);
