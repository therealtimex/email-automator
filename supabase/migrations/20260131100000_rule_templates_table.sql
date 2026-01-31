-- Migration: Rule Templates Table
-- Stores rule templates in database for easy management and auto-installation

-- Create rule_templates table
CREATE TABLE IF NOT EXISTS public.rule_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id VARCHAR(50) NOT NULL,
  rule_id VARCHAR(100) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  intent TEXT,
  condition JSONB NOT NULL,
  actions TEXT[] NOT NULL,
  is_enabled_by_default BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster pack lookups
CREATE INDEX idx_rule_templates_pack_id ON public.rule_templates(pack_id);
CREATE INDEX idx_rule_templates_rule_id ON public.rule_templates(rule_id);

-- RLS Policies (templates are public read-only)
ALTER TABLE public.rule_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rule templates are viewable by everyone"
  ON public.rule_templates FOR SELECT
  USING (true);

-- ============================================================================
-- SEED RULE TEMPLATES
-- ============================================================================

-- Universal Pack (4 rules)
INSERT INTO public.rule_templates (pack_id, rule_id, name, intent, condition, actions, is_enabled_by_default, sort_order) VALUES
('universal', 'universal-newsletters', 'Newsletter Sweeper', 'Auto-archive newsletters and marketing emails',
  '{"or": [{"category": "newsletter", "confidence_gt": 0.7}, {"category": "marketing", "confidence_gt": 0.7}]}'::jsonb,
  ARRAY['archive', 'read'], true, 1),

('universal', 'universal-cold-outreach', 'Cold Outreach Filter', 'Move cold sales emails to a separate folder',
  '{"and": [{"category": "sales", "confidence_gt": 0.8}, {"recipient_type": "bcc"}]}'::jsonb,
  ARRAY['label:Sales/Cold Outreach', 'read'], true, 2),

('universal', 'universal-cc-organizer', 'CC Organizer', 'Label emails where you are CC''d for quick triage',
  '{"recipient_type": "cc"}'::jsonb,
  ARRAY['label:CC'], true, 3),

('universal', 'universal-receipts', 'Receipt Organizer', 'Auto-file receipts and confirmations',
  '{"or": [{"category": "receipt", "confidence_gt": 0.8}, {"category": "order_confirmation", "confidence_gt": 0.8}]}'::jsonb,
  ARRAY['label:Receipts', 'archive'], true, 4);

-- Executive Pack (5 rules)
INSERT INTO public.rule_templates (pack_id, rule_id, name, intent, condition, actions, is_enabled_by_default, sort_order) VALUES
('executive', 'exec-urgent-vip', 'VIP Urgent Messages', 'Star urgent messages from key stakeholders',
  '{"and": [{"priority": "high"}, {"or": [{"contains_keywords": ["CEO", "CFO", "CTO", "Board"]}, {"sentiment": "urgent"}]}]}'::jsonb,
  ARRAY['star', 'label:VIP'], true, 1),

('executive', 'exec-meeting-invites', 'Meeting Invites', 'Organize calendar invites separately',
  '{"category": "calendar", "confidence_gt": 0.8}'::jsonb,
  ARRAY['label:Meetings', 'read'], true, 2),

('executive', 'exec-reports', 'Weekly Reports', 'Auto-file regular status reports',
  '{"and": [{"contains_keywords": ["weekly report", "status update", "progress report"]}, {"category": "work"}]}'::jsonb,
  ARRAY['label:Reports', 'archive'], true, 3),

('executive', 'exec-social', 'Social Noise', 'Minimize LinkedIn and social network notifications',
  '{"category": "social", "confidence_gt": 0.7}'::jsonb,
  ARRAY['archive', 'read'], true, 4),

('executive', 'exec-financial', 'Financial Updates', 'Keep financial reports easily accessible',
  '{"and": [{"contains_keywords": ["revenue", "quarterly", "financial", "budget"]}, {"category": "work"}]}'::jsonb,
  ARRAY['star', 'label:Financial'], true, 5);

-- Developer Pack (7 rules)
INSERT INTO public.rule_templates (pack_id, rule_id, name, intent, condition, actions, is_enabled_by_default, sort_order) VALUES
('developer', 'dev-critical-alerts', 'Critical Alerts', 'Surface production incidents and critical alerts',
  '{"and": [{"or": [{"contains_keywords": ["CRITICAL", "P0", "DOWN", "INCIDENT", "OUTAGE"]}, {"sentiment": "urgent"}]}, {"category": "notification"}]}'::jsonb,
  ARRAY['star', 'label:Alerts/Critical'], true, 1),

('developer', 'dev-github-mentions', 'GitHub Mentions', 'Track when you are mentioned in PRs/Issues',
  '{"and": [{"contains_keywords": ["@", "mentioned you", "assigned you"]}, {"or": [{"category": "github"}, {"contains_keywords": ["github.com", "pull request", "issue"]}]}]}'::jsonb,
  ARRAY['label:GitHub/Mentions'], true, 2),

('developer', 'dev-ci-failures', 'CI/CD Failures', 'Highlight build and deployment failures',
  '{"and": [{"contains_keywords": ["failed", "failure", "error", "broken"]}, {"or": [{"contains_keywords": ["CI", "build", "deploy", "pipeline", "CircleCI", "Jenkins", "GitHub Actions"]}, {"category": "notification"}]}]}'::jsonb,
  ARRAY['star', 'label:CI/Failures'], true, 3),

('developer', 'dev-dependabot', 'Dependabot Noise', 'Auto-archive low-priority dependency updates',
  '{"and": [{"contains_keywords": ["dependabot", "dependencies", "npm audit"]}, {"not": {"contains_keywords": ["security", "critical", "high"]}}]}'::jsonb,
  ARRAY['archive', 'read'], true, 4),

('developer', 'dev-code-review', 'Code Review Requests', 'Organize code review requests',
  '{"and": [{"contains_keywords": ["review requested", "review request", "requested your review"]}, {"category": "github"}]}'::jsonb,
  ARRAY['label:GitHub/Review Requests'], true, 5),

('developer', 'dev-monitoring', 'Monitoring Alerts', 'Organize monitoring and logging alerts',
  '{"and": [{"or": [{"contains_keywords": ["DataDog", "Sentry", "New Relic", "CloudWatch", "Grafana"]}, {"category": "notification"}]}, {"not": {"sentiment": "urgent"}}]}'::jsonb,
  ARRAY['label:Monitoring', 'read'], true, 6),

('developer', 'dev-stack-overflow', 'Stack Overflow Digests', 'Auto-archive SO digests unless urgent',
  '{"contains_keywords": ["Stack Overflow", "stackoverflow.com"]}'::jsonb,
  ARRAY['archive', 'read'], true, 7);

-- Sales Pack (6 rules)
INSERT INTO public.rule_templates (pack_id, rule_id, name, intent, condition, actions, is_enabled_by_default, sort_order) VALUES
('sales', 'sales-hot-leads', 'Hot Leads', 'Prioritize high-intent prospect replies',
  '{"and": [{"or": [{"sentiment": "positive"}, {"contains_keywords": ["interested", "demo", "pricing", "call", "meeting"]}]}, {"category": "personal"}]}'::jsonb,
  ARRAY['star', 'label:Leads/Hot'], true, 1),

('sales', 'sales-follow-ups', 'Follow-up Reminders', 'Track prospect responses needing follow-up',
  '{"and": [{"contains_keywords": ["following up", "checking in", "any update", "still interested"]}, {"category": "personal"}]}'::jsonb,
  ARRAY['label:Follow-ups'], true, 2),

('sales', 'sales-referrals', 'Referrals & Intros', 'Never miss a warm introduction',
  '{"and": [{"or": [{"contains_keywords": ["introduction", "intro", "meet", "connect you with", "referred"]}, {"contains_keywords": ["CC", "cc:"]}]}, {"category": "personal"}]}'::jsonb,
  ARRAY['star', 'label:Referrals'], true, 3),

('sales', 'sales-contracts', 'Contracts & Proposals', 'Track important contract communications',
  '{"and": [{"contains_keywords": ["contract", "proposal", "SOW", "agreement", "terms"]}, {"category": "work"}]}'::jsonb,
  ARRAY['star', 'label:Contracts'], true, 4),

('sales', 'sales-objections', 'Objections & Concerns', 'Flag emails with concerns or hesitation',
  '{"and": [{"or": [{"sentiment": "negative"}, {"contains_keywords": ["concern", "hesitant", "not sure", "expensive", "budget"]}]}, {"category": "personal"}]}'::jsonb,
  ARRAY['label:Objections'], true, 5),

('sales', 'sales-nurture', 'Nurture Campaigns', 'Archive automated drip campaign emails',
  '{"and": [{"category": "marketing"}, {"contains_keywords": ["unsubscribe", "automated", "campaign"]}]}'::jsonb,
  ARRAY['archive', 'read'], true, 6);

-- Operations Pack (4 rules)
INSERT INTO public.rule_templates (pack_id, rule_id, name, intent, condition, actions, is_enabled_by_default, sort_order) VALUES
('operations', 'ops-urgent-tickets', 'Urgent Support Tickets', 'Surface high-priority customer issues',
  '{"and": [{"or": [{"priority": "high"}, {"contains_keywords": ["urgent", "ASAP", "critical", "escalation"]}]}, {"or": [{"category": "support"}, {"contains_keywords": ["ticket", "issue", "customer"]}]}]}'::jsonb,
  ARRAY['star', 'label:Support/Urgent'], true, 1),

('operations', 'ops-internal-requests', 'Internal Requests', 'Organize cross-team requests and asks',
  '{"and": [{"contains_keywords": ["can you", "could you", "need help", "request"]}, {"category": "work"}]}'::jsonb,
  ARRAY['label:Internal/Requests'], true, 2),

('operations', 'ops-vendor-comms', 'Vendor Communications', 'Track vendor and supplier emails',
  '{"and": [{"contains_keywords": ["invoice", "order", "shipment", "delivery", "vendor"]}, {"category": "work"}]}'::jsonb,
  ARRAY['label:Vendors'], true, 3),

('operations', 'ops-system-alerts', 'System Alerts', 'Organize infrastructure and system notifications',
  '{"and": [{"category": "notification"}, {"not": {"sentiment": "urgent"}}]}'::jsonb,
  ARRAY['label:System Alerts', 'read'], true, 4);

-- Comments
COMMENT ON TABLE public.rule_templates IS 'Stores automation rule templates for all packs';
COMMENT ON COLUMN public.rule_templates.pack_id IS 'Which rule pack this template belongs to';
COMMENT ON COLUMN public.rule_templates.rule_id IS 'Unique identifier for the rule template';
COMMENT ON COLUMN public.rule_templates.condition IS 'AI-powered condition with logical operators (AND/OR/NOT)';
COMMENT ON COLUMN public.rule_templates.actions IS 'Array of actions to execute (archive, label:X, star, etc)';
COMMENT ON COLUMN public.rule_templates.is_enabled_by_default IS 'Whether rule should be enabled when installed';
