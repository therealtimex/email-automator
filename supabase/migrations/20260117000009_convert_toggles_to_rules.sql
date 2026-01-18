-- Migration to move global toggles into the rules table
-- This makes the system more consistent and fixes persistence issues.

-- 1. Create 'Auto-Trash Spam' rule for users who had it enabled
INSERT INTO rules (user_id, name, condition, action, is_enabled)
SELECT 
    user_id, 
    'Auto-Trash Spam', 
    '{"category": "spam", "is_useless": true}'::jsonb, 
    'delete', 
    COALESCE(auto_trash_spam, false)
FROM user_settings
ON CONFLICT DO NOTHING;

-- 2. Create 'Smart Drafts' rule for users who had it enabled
INSERT INTO rules (user_id, name, condition, action, is_enabled)
SELECT 
    user_id, 
    'Smart Drafts', 
    '{"suggested_actions": ["reply"]}'::jsonb, 
    'draft', 
    COALESCE(smart_drafts, false)
FROM user_settings
ON CONFLICT DO NOTHING;

-- 3. Clean up the user_settings table
ALTER TABLE user_settings DROP COLUMN IF EXISTS auto_trash_spam;
ALTER TABLE user_settings DROP COLUMN IF EXISTS smart_drafts;
