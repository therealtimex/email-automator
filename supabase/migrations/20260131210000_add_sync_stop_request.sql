-- Add sync_stop_requested to user_settings
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS sync_stop_requested BOOLEAN DEFAULT false;
