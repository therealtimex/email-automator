-- Create processing_events table for granular logging
CREATE TABLE IF NOT EXISTS processing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES processing_logs(id) ON DELETE CASCADE,
    email_id UUID REFERENCES emails(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('info', 'analysis', 'action', 'error')),
    agent_state TEXT, -- e.g., 'Fetching', 'Analyzing', 'Deciding', 'Acting'
    details JSONB, -- Stores LLM inputs/outputs, reasoning, confidence
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE processing_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can access events if they own the parent run log
CREATE POLICY "Users can access their own processing events" ON processing_events
    FOR ALL USING (EXISTS (
        SELECT 1 FROM processing_logs 
        WHERE processing_logs.id = processing_events.run_id 
        AND processing_logs.user_id = auth.uid()
    ));

-- Enable Realtime for this table (standard Supabase publication)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'processing_events') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE processing_events;
  END IF;
END
$$;
