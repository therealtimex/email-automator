-- Migration: Create Learning Metrics and Add Adaptive Preferences
-- timestamp: 20260203000000

-- 1. Add Adaptive Learning Fields to user_settings
-- These fields store learned behavior patterns
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS category_patterns JSONB DEFAULT '{}'; -- {"linkedin.com": "newsletter"}
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS auto_archive_domains JSONB DEFAULT '[]';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS never_draft_domains JSONB DEFAULT '[]';

-- 2. Create Learning Metrics Table
-- Tracks how well the AI is performing over time
CREATE TABLE IF NOT EXISTS learning_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Classification Stats
    total_classifications INTEGER DEFAULT 0,
    correct_classifications INTEGER DEFAULT 0,
    
    -- Draft Stats
    drafts_generated INTEGER DEFAULT 0,
    drafts_edited INTEGER DEFAULT 0,
    drafts_sent_unedited INTEGER DEFAULT 0,
    drafts_dismissed INTEGER DEFAULT 0,
    
    -- Specific accuracy tracking
    category_accuracy JSONB DEFAULT '{}', -- {"newsletter": 0.95, "important": 0.87}
    
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT learning_metrics_user_id_key UNIQUE (user_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_learning_metrics_user ON learning_metrics(user_id);

-- RLS Policies
ALTER TABLE learning_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own metrics"
    ON learning_metrics FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own metrics"
    ON learning_metrics FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own metrics"
    ON learning_metrics FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE learning_metrics IS 'Tracks AI accuracy and user learning interactions';
