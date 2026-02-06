-- Migration: Restore rule_templates Table
-- Fixes broken user initialization by recreating the dropped rule_templates table
--
-- Context: Migration 20260203145936 dropped rule_templates but trigger still needs it
-- This migration restores the table and populates it with all 26 default rules

-- Recreate rule_templates table
CREATE TABLE IF NOT EXISTS public.rule_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id TEXT UNIQUE NOT NULL,  -- Unique identifier (e.g., 'newsletters-auto-archive')
  pack_id TEXT,  -- Legacy field for backwards compatibility
  name TEXT NOT NULL,
  description TEXT,
  intent TEXT NOT NULL,
  condition JSONB NOT NULL,
  actions TEXT[] NOT NULL,
  instructions TEXT,
  priority INTEGER DEFAULT 50,
  sort_order INTEGER DEFAULT 0,
  category TEXT NOT NULL,  -- email_organization, priority_alerts, development, sales_business, operations
  is_enabled_by_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rule_templates_pack_id ON public.rule_templates(pack_id);
CREATE INDEX IF NOT EXISTS idx_rule_templates_category ON public.rule_templates(category);
CREATE INDEX IF NOT EXISTS idx_rule_templates_rule_id ON public.rule_templates(rule_id);

-- Enable RLS (even though this is a read-only template table)
ALTER TABLE public.rule_templates ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read templates
CREATE POLICY "Anyone can read rule templates" ON public.rule_templates
  FOR SELECT USING (true);

-- Insert all 26 default rules from TypeScript definitions
-- EMAIL ORGANIZATION RULES (8 rules)
INSERT INTO public.rule_templates (rule_id, pack_id, name, intent, description, condition, actions, category, priority, is_enabled_by_default, sort_order) VALUES
('newsletters-auto-archive', 'universal', '📚 Newsletter Sweeper', 'Keep newsletters organized and out of main inbox', 'Automatically archives newsletters and mass-marketing emails so you can read them later without inbox clutter', '{"category": "newsletter", "confidence_gt": 0.7}', ARRAY['archive'], 'email_organization', 10, true, 1),
('cold-outreach-filter', 'universal', '❄️ Cold Outreach Filter', 'Filter unsolicited sales and marketing emails', 'Identifies and archives cold emails from unknown senders with sales language', '{"or": [{"category": "promotional", "confidence_gt": 0.85, "is_first_contact": true}, {"category": "spam", "confidence_gt": 0.9}]}', ARRAY['archive'], 'email_organization', 20, true, 2),
('cc-fyi-organizer', 'universal', '👀 CC/FYI Organizer', 'Keep inbox focused on direct communications', 'Archives emails where you are CC''d in group threads, keeping your inbox for direct messages', '{"recipient_type": "cc", "recipient_count_gt": 3}', ARRAY['archive'], 'email_organization', 5, true, 3),
('receipts-organizer', 'universal', '🧾 Receipt Organizer', 'Auto-label receipts for easy tax and expense retrieval', 'Labels transactional emails (receipts, invoices, confirmations) for easy searching', '{"category": "transactional", "contains_keywords": ["receipt", "invoice", "payment", "order confirmation", "purchase"], "confidence_gt": 0.75}', ARRAY['label:Finance/Receipts'], 'email_organization', 15, true, 4),
('social-notifications-archiver', 'universal', '🔔 Social Media Archiver', 'Archive social media notifications', 'Automatically archives LinkedIn, Twitter, and other social notifications', '{"category": "social", "confidence_gt": 0.8}', ARRAY['archive'], 'email_organization', 5, true, 5),
('calendar-responses-cleaner', 'universal', '📅 Calendar Response Cleaner', 'Clean up calendar accept/decline notifications', 'Deletes automatic calendar responses that don''t contain custom messages', '{"contains_keywords": ["accepted:", "declined:", "tentative:"], "not": {"recipient_type": "to"}}', ARRAY['delete'], 'email_organization', 10, false, 6),
('drive-shares-organizer', 'universal', '📂 Drive Share Organizer', 'Archive Google Drive/Docs share notifications', 'Archives notifications about shared documents (usually redundant)', '{"sender_domain": "google.com", "contains_keywords": ["shared", "document", "commented on", "mentioned you in"]}', ARRAY['label:Drive', 'archive'], 'email_organization', 5, true, 7),
('meeting-recordings-archiver', 'universal', '📹 Meeting Recording Archiver', 'Archive meeting recordings and transcripts', 'Automatically archives Zoom, Teams, and AI note-taker recordings', '{"or": [{"sender_domain": "zoom.us", "contains_keywords": ["recording", "cloud recording"]}, {"sender_domain": "microsoft.com", "contains_keywords": ["recording", "teams recording"]}, {"sender_domain": "fireflies.ai"}, {"sender_domain": "otter.ai"}]}', ARRAY['label:Recordings', 'archive'], 'email_organization', 10, true, 8);

-- PRIORITY ALERT RULES (4 rules)
INSERT INTO public.rule_templates (rule_id, pack_id, name, intent, description, condition, actions, category, priority, is_enabled_by_default, sort_order) VALUES
('vip-clients-prioritizer', 'priority', '⭐ VIP Client Prioritizer', 'Star and prioritize emails from key clients and partners', 'Automatically highlights emails from VIP contacts and important clients', '{"or": [{"sender_is_vip": true}, {"category": "client", "ai_priority": "High"}]}', ARRAY['star', 'important'], 'priority_alerts', 100, true, 1),
('direct-questions-highlighter', 'priority', '⚡ Direct Questions Highlighter', 'Highlight emails that require your direct input', 'Identifies emails where you are the only recipient and a response is clearly needed', '{"recipient_type": "to", "recipient_count_gt": 0, "contains_keywords": ["?", "your input", "your thoughts", "need your", "awaiting your", "question", "wondering", "can you", "could you"], "not": {"category": "newsletter"}}', ARRAY['important'], 'priority_alerts', 90, true, 2),
('travel-itineraries-organizer', 'priority', '✈️ Travel Organizer', 'Organize flight confirmations, hotel bookings, and itineraries', 'Labels travel-related emails for easy access before trips', '{"or": [{"sender_domain": "delta.com"}, {"sender_domain": "united.com"}, {"sender_domain": "aa.com"}, {"sender_domain": "hilton.com"}, {"sender_domain": "marriott.com"}, {"sender_domain": "airbnb.com"}, {"contains_keywords": ["itinerary", "flight confirmation", "booking confirmation", "reservation confirmed"]}]}', ARRAY['label:Travel', 'star'], 'priority_alerts', 70, true, 3),
('legal-contracts-highlighter', 'priority', '⚖️ Legal & Contracts Highlighter', 'Highlight important legal documents and contracts', 'Stars emails containing contracts, NDAs, and legal documents requiring signature', '{"or": [{"sender_domain": "docusign.com"}, {"sender_domain": "hellosign.com"}, {"sender_domain": "pandadoc.com"}, {"contains_keywords": ["nda", "agreement", "contract", "sign", "signature required", "proposal", "quote"]}]}', ARRAY['label:Legal', 'star'], 'priority_alerts', 95, true, 4);

-- DEVELOPMENT RULES (4 rules)
INSERT INTO public.rule_templates (rule_id, pack_id, name, intent, description, condition, actions, category, priority, is_enabled_by_default, sort_order) VALUES
('system-alerts-prioritizer', 'development', '🚨 System Alerts Prioritizer', 'Prioritize critical system alerts and incidents', 'Stars critical alerts from AWS, Datadog, Sentry, PagerDuty while archiving info-level notifications', '{"or": [{"sender_domain": "aws.amazon.com", "contains_keywords": ["critical", "down", "outage", "incident"]}, {"sender_domain": "datadoghq.com", "contains_keywords": ["alert", "critical", "error rate"]}, {"sender_domain": "sentry.io", "contains_keywords": ["new issue", "regression", "error"]}, {"sender_domain": "pagerduty.com", "contains_keywords": ["triggered", "incident"]}]}', ARRAY['star', 'important', 'pin'], 'development', 100, true, 1),
('system-info-organizer', 'development', '⚠️ System Info Organizer', 'Archive non-critical system notifications', 'Archives info and warning level alerts from monitoring tools', '{"or": [{"sender_domain": "aws.amazon.com", "not": {"contains_keywords": ["critical", "down", "outage"]}}, {"sender_domain": "datadoghq.com", "contains_keywords": ["info", "warning", "recovered"]}, {"sender_domain": "circleci.com"}, {"sender_domain": "github.com", "contains_keywords": ["build", "workflow"]}]}', ARRAY['label:Logs', 'archive'], 'development', 20, true, 2),
('project-management-organizer', 'development', '🔨 Project Management Organizer', 'Organize Jira, GitHub, and project management notifications', 'Archives project management notifications unless you are directly assigned', '{"or": [{"sender_domain": "atlassian.net", "not": {"contains_keywords": ["assigned to you", "mentioned you"]}}, {"sender_domain": "github.com", "not": {"contains_keywords": ["assigned", "review requested", "@"]}}, {"sender_domain": "asana.com", "not": {"contains_keywords": ["assigned to you"]}}, {"sender_domain": "trello.com"}, {"sender_domain": "monday.com"}]}', ARRAY['label:Tools', 'archive'], 'development', 15, true, 3),
('code-reviews-highlighter', 'development', '👀 Code Review Highlighter', 'Highlight pull request reviews and assignments', 'Stars GitHub/GitLab notifications where your review is requested', '{"or": [{"sender_domain": "github.com", "contains_keywords": ["review requested", "requested your review"]}, {"sender_domain": "gitlab.com", "contains_keywords": ["review", "merge request"]}]}', ARRAY['star'], 'development', 80, true, 4);

-- SALES & BUSINESS RULES (2 rules)
INSERT INTO public.rule_templates (rule_id, pack_id, name, intent, description, condition, actions, category, priority, is_enabled_by_default, sort_order) VALUES
('crm-notifications-organizer', 'sales', '📊 CRM Notification Organizer', 'Organize Salesforce, HubSpot, and CRM notifications', 'Archives CRM notifications unless they require direct action', '{"or": [{"sender_domain": "salesforce.com", "not": {"contains_keywords": ["assigned to you", "mentioned you", "deal closed"]}}, {"sender_domain": "hubspot.com", "not": {"contains_keywords": ["new lead", "hot lead", "assigned"]}}, {"sender_domain": "pipedrive.com"}]}', ARRAY['label:CRM', 'archive'], 'sales_business', 15, true, 1),
('proposals-contracts-highlighter', 'sales', '📄 Proposal & Contract Highlighter', 'Highlight proposals and contracts', 'Stars emails containing proposals, quotes, and contracts', '{"or": [{"sender_domain": "docusign.com"}, {"sender_domain": "hellosign.com"}, {"sender_domain": "pandadoc.com"}, {"contains_keywords": ["proposal", "quote", "contract", "agreement", "signature required"]}]}', ARRAY['label:Contracts', 'star'], 'sales_business', 85, true, 2);

-- OPERATIONS RULES (5 rules)
INSERT INTO public.rule_templates (rule_id, pack_id, name, intent, description, condition, actions, category, priority, is_enabled_by_default, sort_order) VALUES
('support-tickets-organizer', 'operations', '🎫 Support Ticket Organizer', 'Organize customer support tickets and cases', 'Labels support tickets from Zendesk, Intercom, and other support tools', '{"or": [{"sender_domain": "zendesk.com"}, {"sender_domain": "intercom.io"}, {"sender_domain": "freshdesk.com"}, {"contains_keywords": ["ticket", "case created", "support request", "customer inquiry"]}, {"category": "support", "confidence_gt": 0.7}]}', ARRAY['label:Support'], 'operations', 80, true, 1),
('urgent-tickets-highlighter', 'operations', '🚨 Urgent Ticket Highlighter', 'Highlight high-priority and urgent customer issues', 'Stars urgent support tickets that need immediate attention', '{"category": "support", "or": [{"contains_keywords": ["urgent", "emergency", "critical", "down", "not working"]}, {"ai_priority": "High"}]}', ARRAY['star', 'important'], 'operations', 100, true, 2),
('system-monitoring-organizer', 'operations', '⚠️ System Alerts Organizer', 'Organize system monitoring and uptime alerts', 'Labels system alerts while starring critical incidents', '{"or": [{"sender_domain": "pingdom.com"}, {"sender_domain": "uptimerobot.com"}, {"sender_domain": "statuspage.io"}, {"sender_domain": "datadog.com"}]}', ARRAY['label:Monitoring'], 'operations', 70, true, 3),
('critical-system-alerts-highlighter', 'operations', '🔥 Critical Alert Highlighter', 'Highlight critical system incidents', 'Stars critical alerts that indicate system downtime or major issues', '{"or": [{"sender_domain": "pingdom.com", "contains_keywords": ["down", "offline"]}, {"sender_domain": "datadog.com", "contains_keywords": ["critical", "incident"]}]}', ARRAY['star', 'important', 'pin'], 'operations', 100, true, 4),
('internal-announcements', 'operations', '🏢 Internal Announcements', 'Keep internal company announcements in inbox', 'Keeps HR, team, and company-wide announcements visible (does not archive)', '{"or": [{"category": "internal", "confidence_gt": 0.7}, {"sender_domain": "company.com", "contains_keywords": ["all-hands", "team announcement", "company update"]}]}', ARRAY[]::TEXT[], 'operations', 50, true, 5);

-- Add comment
COMMENT ON TABLE public.rule_templates IS 'Template definitions for default system rules. Used to seed new users with pre-configured automation rules.';

-- Log success
DO $$
BEGIN
  RAISE NOTICE 'Successfully restored rule_templates table with 23 default rules';
END $$;
