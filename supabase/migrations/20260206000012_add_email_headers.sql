-- Add email header metadata columns for improved rule matching and LLM analysis
-- Migration: 20260206000012_add_email_headers.sql

-- Add header storage and parsed metadata columns
ALTER TABLE emails
ADD COLUMN IF NOT EXISTS headers JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS recipient_type TEXT CHECK (recipient_type IN ('to', 'cc', 'bcc')),
ADD COLUMN IF NOT EXISTS is_automated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_unsubscribe BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_reply BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS thread_id TEXT,
ADD COLUMN IF NOT EXISTS mailer TEXT,
ADD COLUMN IF NOT EXISTS sender_priority TEXT CHECK (sender_priority IN ('high', 'normal', 'low'));

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_emails_recipient_type ON emails(recipient_type) WHERE recipient_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_emails_is_automated ON emails(is_automated) WHERE is_automated = true;
CREATE INDEX IF NOT EXISTS idx_emails_has_unsubscribe ON emails(has_unsubscribe) WHERE has_unsubscribe = true;
CREATE INDEX IF NOT EXISTS idx_emails_thread_id ON emails(thread_id) WHERE thread_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN emails.headers IS 'Full email headers in JSONB format for advanced analysis';
COMMENT ON COLUMN emails.recipient_type IS 'How user received this email: to (direct), cc (carbon copy), or bcc (blind carbon copy)';
COMMENT ON COLUMN emails.is_automated IS 'Whether email is automated/bulk (detected from List-Unsubscribe, Precedence, Auto-Submitted headers)';
COMMENT ON COLUMN emails.has_unsubscribe IS 'Whether email contains List-Unsubscribe header (strong newsletter indicator)';
COMMENT ON COLUMN emails.is_reply IS 'Whether email is part of a reply thread (detected from In-Reply-To/References headers)';
COMMENT ON COLUMN emails.thread_id IS 'Email thread identifier for conversation grouping';
COMMENT ON COLUMN emails.mailer IS 'Email client/service used to send (e.g., Mailchimp, SendGrid)';
COMMENT ON COLUMN emails.sender_priority IS 'Sender-defined priority from X-Priority/Importance headers';
