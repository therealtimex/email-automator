-- Migration: Create user_feedback table
-- timestamp: 20260202000002

CREATE TABLE IF NOT EXISTS user_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email_id UUID REFERENCES emails(id) ON DELETE SET NULL,
    account_id UUID REFERENCES email_accounts(id) ON DELETE SET NULL,
    
    -- Type of feedback: 'analysis' (category/priority), 'draft' (content/tone), 'general'
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('analysis', 'draft', 'general', 'implicit_edit')),
    
    -- Snapshot of what the AI did/thought
    original_data JSONB, 
    -- Example: {"category": "newsletter", "priority": "low"}
    
    -- What the user says it should be
    corrected_data JSONB,
    -- Example: {"category": "important", "priority": "high"}
    
    -- Who sent the email (for learning patterns)
    sender_pattern TEXT, 
    -- Example: "notifications@github.com" or "@linkedin.com"
    
    -- User comments
    reasoning TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_for_learning BOOLEAN DEFAULT FALSE
);

-- Indexes for performance
CREATE INDEX idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX idx_user_feedback_email_id ON user_feedback(email_id);
CREATE INDEX idx_user_feedback_type ON user_feedback(feedback_type);
CREATE INDEX idx_user_feedback_learning ON user_feedback(processed_for_learning) WHERE processed_for_learning = FALSE;

-- RLS Policies
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own feedback" 
    ON user_feedback FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feedback" 
    ON user_feedback FOR SELECT 
    USING (auth.uid() = user_id);

-- Comment
COMMENT ON TABLE user_feedback IS 'Stores user corrections to AI decisions for adaptive learning';
