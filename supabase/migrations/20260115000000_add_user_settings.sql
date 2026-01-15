-- User Settings table for storing user preferences
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    llm_model TEXT,
    llm_base_url TEXT,
    auto_trash_spam BOOLEAN DEFAULT false,
    smart_drafts BOOLEAN DEFAULT false,
    sync_interval_minutes INTEGER DEFAULT 5 CHECK (sync_interval_minutes >= 1 AND sync_interval_minutes <= 60),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can only access their own settings" ON user_settings
    FOR ALL USING (auth.uid() = user_id);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_emails_account_id ON emails(account_id);
CREATE INDEX IF NOT EXISTS idx_emails_date ON emails(date DESC);
CREATE INDEX IF NOT EXISTS idx_emails_category ON emails(category);
CREATE INDEX IF NOT EXISTS idx_email_accounts_user_id ON email_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_rules_user_id ON rules(user_id);
CREATE INDEX IF NOT EXISTS idx_processing_logs_user_id ON processing_logs(user_id);

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_email_accounts_updated_at ON email_accounts;
CREATE TRIGGER update_email_accounts_updated_at
    BEFORE UPDATE ON email_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
