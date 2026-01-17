-- Add attachments support to rules
ALTER TABLE rules ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

-- Comment for clarity
COMMENT ON COLUMN rules.attachments IS 'Array of attachment objects: [{ name: string, path: string, type: string, size: number }]';

-- Update types/constraints if necessary (JSONB is flexible for conditions)
