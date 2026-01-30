-- Update any existing settings using the old default or null to the new standard
UPDATE user_settings 
SET 
  llm_model = 'gpt-4o-mini',
  llm_provider = 'realtimexai'
WHERE 
  llm_model = 'gpt-4.1-mini' 
  OR llm_model IS NULL 
  OR llm_provider IS NULL;

-- Ensure future defaults are also correct
ALTER TABLE user_settings 
ALTER COLUMN llm_provider SET DEFAULT 'realtimexai',
ALTER COLUMN llm_model SET DEFAULT 'gpt-4o-mini';
