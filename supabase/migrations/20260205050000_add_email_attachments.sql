-- Add attachments column to emails table for storing file attachment metadata
-- Format: [{ id, name, path, size, type, uploaded_at }]

ALTER TABLE emails
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN emails.attachments IS 'Array of attachment metadata: [{ id, name, path, size, type, uploaded_at }]';

-- Create storage bucket for email attachments (run manually via Supabase Dashboard or CLI)
-- Bucket name: email-attachments
-- Public: false (requires authentication)
-- File size limit: 10MB per file
-- Allowed MIME types: Any

-- RLS Policy for email-attachments bucket will be:
-- SELECT: Users can read their own attachments
-- INSERT: Users can upload to their own email drafts
-- DELETE: Users can delete their own attachments

-- Note: Storage bucket creation must be done via Supabase Dashboard or CLI:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create new bucket: "email-attachments"
-- 3. Set to Private (not public)
-- 4. Add RLS policies for user access
