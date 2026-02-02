-- Migration: Add User Persona fields to user_settings (Correction)
-- timestamp: 20260202000001

-- Extend user_settings table with persona fields
-- This unifies settings and persona in one table for easier fetching
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS work_style TEXT CHECK (work_style IN ('corporate', 'startup', 'creative', 'academic'));

-- Communication preferences
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS preferred_tone TEXT DEFAULT 'professional';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS preferred_length TEXT DEFAULT 'medium';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS signature TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS common_phrases JSONB DEFAULT '[]';

-- Goals and Settings
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS primary_goal TEXT CHECK (primary_goal IN ('inbox_zero', 'respond_faster', 'focus', 'reduce_time'));
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS time_budget_minutes INTEGER DEFAULT 30;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS automation_level INTEGER DEFAULT 5;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS never_automate_categories JSONB DEFAULT '["legal", "hr", "financial"]';

-- VIP and Domain Lists
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS vip_senders JSONB DEFAULT '[]';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS trusted_domains JSONB DEFAULT '[]';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS blocked_domains JSONB DEFAULT '[]';

-- Onboarding Status
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS persona_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS persona_completed_at TIMESTAMPTZ;

-- Add comment
COMMENT ON TABLE user_settings IS 'Stores user settings, preferences, and persona for AI personalization';
