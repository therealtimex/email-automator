-- Migration: Add comprehensive TTS settings and rename auto_speak_enabled
-- timestamp: 20260203000002

-- Rename auto_speak_enabled to tts_auto_play for consistency
ALTER TABLE user_settings
RENAME COLUMN auto_speak_enabled TO tts_auto_play;

-- Add TTS provider setting (piper_local, supertonic_local, etc.)
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS tts_provider TEXT DEFAULT 'piper_local';

-- Add TTS voice setting (specific to provider)
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS tts_voice TEXT DEFAULT NULL;

-- Add TTS speed setting (0.5 to 2.0, stored as numeric)
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS tts_speed NUMERIC DEFAULT 1.0;

-- Add TTS quality setting (1 to 20, stored as integer)
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS tts_quality INTEGER DEFAULT 10;

-- Add comments for documentation
COMMENT ON COLUMN user_settings.tts_auto_play IS 'Automatically read AI responses aloud using text-to-speech';
COMMENT ON COLUMN user_settings.tts_provider IS 'TTS provider (piper_local, supertonic_local, etc.)';
COMMENT ON COLUMN user_settings.tts_voice IS 'Voice ID specific to the selected provider';
COMMENT ON COLUMN user_settings.tts_speed IS 'Speech speed (0.5x to 2.0x)';
COMMENT ON COLUMN user_settings.tts_quality IS 'Audio quality/bitrate (1-20, higher = better quality)';
