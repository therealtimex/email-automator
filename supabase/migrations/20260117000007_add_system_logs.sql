-- Create system_logs table for technical logging
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
    source TEXT NOT NULL, -- e.g., 'API', 'Processor', 'GmailService'
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see logs they generated (if associated with a user)
CREATE POLICY "Users can view their own system logs" ON system_logs
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- Enable Realtime
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'system_logs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE system_logs;
  END IF;
END
$$;
