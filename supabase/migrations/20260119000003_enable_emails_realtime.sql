-- Enable Realtime for emails table
-- This allows the frontend to receive INSERT/UPDATE/DELETE events

-- Set REPLICA IDENTITY to FULL so we get all column values in realtime events
ALTER TABLE emails REPLICA IDENTITY FULL;

-- Add emails table to the realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'emails'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE emails;
  END IF;
END $$;
