-- Create integrations table for storing provider credentials
CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    credentials JSONB NOT NULL DEFAULT '{}',
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

-- Enable RLS
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can only access their own integrations" ON integrations
    FOR ALL USING (auth.uid() = user_id);

-- Add updated_at trigger for integrations
CREATE TRIGGER update_integrations_updated_at
    BEFORE UPDATE ON integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Refactor user_settings to remove plain text credentials
ALTER TABLE user_settings
DROP COLUMN IF EXISTS google_client_id,
DROP COLUMN IF EXISTS google_client_secret,
DROP COLUMN IF EXISTS microsoft_client_id,
DROP COLUMN IF EXISTS microsoft_client_secret,
DROP COLUMN IF EXISTS microsoft_tenant_id;

-- Add preferences column for future extensibility (optional but good practice)
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';
