-- Migration: Remove pack concept, replace with category
-- This migration simplifies the rule system by removing the "pack" abstraction
-- and using simple "category" labels instead.

-- 1. Drop pack_installations table (no longer needed for tracking)
DROP TABLE IF EXISTS pack_installations CASCADE;

-- 2. Remove pack field from rules table (replaced by category)
ALTER TABLE rules DROP COLUMN IF EXISTS pack;

-- 3. Remove unused user_settings fields
ALTER TABLE user_settings DROP COLUMN IF EXISTS user_role;
ALTER TABLE user_settings DROP COLUMN IF EXISTS onboarding_completed;

-- 4. Drop rule_templates table (not currently used)
DROP TABLE IF EXISTS rule_templates CASCADE;

-- 5. Clean up indexes that referenced removed columns/tables
DROP INDEX IF EXISTS idx_rules_pack;
DROP INDEX IF EXISTS idx_pack_installations_user;
DROP INDEX IF EXISTS idx_pack_installations_pack;
DROP INDEX IF EXISTS idx_pack_installations_active;
DROP INDEX IF EXISTS idx_rule_templates_pack_id;
DROP INDEX IF EXISTS idx_user_settings_role;

-- Note: The following fields are preserved and still useful:
--   - rules.category (for UI grouping)
--   - rules.rule_template_id (to identify system defaults)
--   - rules.is_system_managed (to prevent deletion)
