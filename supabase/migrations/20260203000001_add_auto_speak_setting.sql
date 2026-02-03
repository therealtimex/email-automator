-- Migration: Add auto-speak setting for AI responses
-- timestamp: 20260203000001

-- Add auto_speak_enabled column to user_settings
-- This controls whether AI responses are automatically read aloud via TTS
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS auto_speak_enabled BOOLEAN DEFAULT true;

-- Add comment
COMMENT ON COLUMN user_settings.auto_speak_enabled IS 'Automatically read AI responses aloud using text-to-speech';
