-- Create rule-attachments bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('rule-attachments', 'rule-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for rule-attachments bucket
-- Allow users to upload their own attachments
CREATE POLICY "Allow users to upload rule attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'rule-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own attachments
CREATE POLICY "Allow users to view their own rule attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'rule-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own attachments
CREATE POLICY "Allow users to delete their own rule attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'rule-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
