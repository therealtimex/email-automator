-- Migration: Add Rule Pack Support
-- Description: Add columns to support rule packs and user role preferences

-- =====================================================
-- 1. Extend rules table for rule pack metadata
-- =====================================================

-- Add pack metadata columns to rules table
ALTER TABLE rules
ADD COLUMN IF NOT EXISTS pack VARCHAR(50),
ADD COLUMN IF NOT EXISTS rule_template_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS is_system_managed BOOLEAN DEFAULT false;

-- Add index for querying rules by pack
CREATE INDEX IF NOT EXISTS idx_rules_pack ON rules(pack) WHERE pack IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rules_template ON rules(rule_template_id) WHERE rule_template_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rules_system_managed ON rules(is_system_managed) WHERE is_system_managed = true;

-- Add comment for documentation
COMMENT ON COLUMN rules.pack IS 'Rule pack identifier (e.g., universal, executive, developer, sales, operations)';
COMMENT ON COLUMN rules.rule_template_id IS 'Template identifier for system-created rules (e.g., universal-newsletters)';
COMMENT ON COLUMN rules.is_system_managed IS 'If true, rule is part of a pack and can be disabled but not deleted by user';

-- =====================================================
-- 2. Extend user_settings table for role preferences
-- =====================================================

-- Add user role and onboarding columns
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS user_role VARCHAR(50),
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Add index for querying by role
CREATE INDEX IF NOT EXISTS idx_user_settings_role ON user_settings(user_role) WHERE user_role IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN user_settings.user_role IS 'User role selection (executive, developer, sales, operations, other) for personalized rule packs';
COMMENT ON COLUMN user_settings.onboarding_completed IS 'Whether user has completed the role selection onboarding';

-- =====================================================
-- 3. Create pack_installations tracking table
-- =====================================================

-- Track which packs are installed for which users
CREATE TABLE IF NOT EXISTS pack_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pack_id VARCHAR(50) NOT NULL,
  installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uninstalled_at TIMESTAMP WITH TIME ZONE,
  source VARCHAR(50) DEFAULT 'manual', -- 'onboarding', 'manual', 'auto'

  -- Ensure user can't install same pack twice (unless uninstalled)
  UNIQUE(user_id, pack_id)
);

-- Enable RLS for pack_installations
ALTER TABLE pack_installations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own pack installations
CREATE POLICY "Users can view own pack installations"
  ON pack_installations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own pack installations"
  ON pack_installations FOR ALL
  USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_pack_installations_user ON pack_installations(user_id);
CREATE INDEX IF NOT EXISTS idx_pack_installations_pack ON pack_installations(pack_id);
CREATE INDEX IF NOT EXISTS idx_pack_installations_active ON pack_installations(user_id, pack_id) WHERE uninstalled_at IS NULL;

-- Add comment for documentation
COMMENT ON TABLE pack_installations IS 'Tracks which rule packs are installed for each user';

-- =====================================================
-- 4. Create rule_metrics tracking table
-- =====================================================

-- Track rule effectiveness metrics
CREATE TABLE IF NOT EXISTS rule_metrics (
  rule_id UUID NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  times_triggered INT DEFAULT 0,
  times_undone INT DEFAULT 0,
  times_edited INT DEFAULT 0,
  enabled BOOLEAN DEFAULT true,

  PRIMARY KEY (rule_id, date)
);

-- Enable RLS for rule_metrics
ALTER TABLE rule_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view metrics for their own rules
CREATE POLICY "Users can view own rule metrics"
  ON rule_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rules
      WHERE rules.id = rule_metrics.rule_id
      AND rules.user_id = auth.uid()
    )
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_rule_metrics_date ON rule_metrics(date DESC);
CREATE INDEX IF NOT EXISTS idx_rule_metrics_rule ON rule_metrics(rule_id);

-- Add comment for documentation
COMMENT ON TABLE rule_metrics IS 'Daily metrics for rule effectiveness tracking';

-- =====================================================
-- 5. Create action_history tracking table
-- =====================================================

-- Track all automated actions for undo capability
CREATE TABLE IF NOT EXISTS action_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES rules(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  sync_id UUID, -- Group actions by sync session
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  undone BOOLEAN DEFAULT false,
  undone_at TIMESTAMP WITH TIME ZONE,

  -- Store metadata about the action for debugging
  metadata JSONB
);

-- Enable RLS for action_history
ALTER TABLE action_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view actions on their own emails
CREATE POLICY "Users can view own action history"
  ON action_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM emails
      JOIN email_accounts ON emails.account_id = email_accounts.id
      WHERE emails.id = action_history.email_id
      AND email_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can undo own actions"
  ON action_history FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM emails
      JOIN email_accounts ON emails.account_id = email_accounts.id
      WHERE emails.id = action_history.email_id
      AND email_accounts.user_id = auth.uid()
    )
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_action_history_email ON action_history(email_id);
CREATE INDEX IF NOT EXISTS idx_action_history_rule ON action_history(rule_id);
CREATE INDEX IF NOT EXISTS idx_action_history_sync ON action_history(sync_id);
CREATE INDEX IF NOT EXISTS idx_action_history_executed ON action_history(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_action_history_undone ON action_history(undone) WHERE undone = false;

-- Add comment for documentation
COMMENT ON TABLE action_history IS 'Tracks all automated actions for undo capability and metrics';

-- =====================================================
-- 6. Grant permissions
-- =====================================================

-- Grant access to authenticated users
GRANT ALL ON pack_installations TO authenticated;
GRANT ALL ON rule_metrics TO authenticated;
GRANT ALL ON action_history TO authenticated;
