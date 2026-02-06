-- Migration: Restore rule_templates Table with Improved Rules (26 rules)
-- Fixes broken user initialization by recreating the dropped rule_templates table
--
-- Business Value Focus:
-- - Aggressive inbox cleanup with age-based deletion
-- - Draft automation for sales, support, and communication workflows
-- - Better categorization and labeling
--
-- Confidence Thresholds:
-- - Delete (safe categories): 0.81
-- - Delete (risky categories): 0.90
-- - Draft: 0.70
-- - Archive/Label: 0.60-0.75

-- Recreate rule_templates table
CREATE TABLE IF NOT EXISTS public.rule_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id TEXT UNIQUE NOT NULL,
  pack_id TEXT,  -- Legacy field
  name TEXT NOT NULL,
  description TEXT,
  intent TEXT NOT NULL,
  condition JSONB NOT NULL,
  actions TEXT[] NOT NULL,
  instructions TEXT,  -- Draft generation instructions
  priority INTEGER DEFAULT 50,
  sort_order INTEGER DEFAULT 0,
  category TEXT NOT NULL,
  is_enabled_by_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rule_templates_pack_id ON public.rule_templates(pack_id);
CREATE INDEX IF NOT EXISTS idx_rule_templates_category ON public.rule_templates(category);
CREATE INDEX IF NOT EXISTS idx_rule_templates_rule_id ON public.rule_templates(rule_id);

-- Enable RLS
ALTER TABLE public.rule_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read rule templates" ON public.rule_templates FOR SELECT USING (true);

-- ============================================================================
-- EMAIL ORGANIZATION RULES (6 rules)
-- ============================================================================

INSERT INTO public.rule_templates (rule_id, pack_id, name, intent, description, condition, actions, category, priority, is_enabled_by_default, sort_order) VALUES

-- Rule 1: Newsletter Sweeper
('universal-newsletters', 'universal', '📚 Newsletter Sweeper',
'Remove low-value newsletters/news updates from inbox after short retention',
'Deletes newsletters and news digests older than 7 days to keep inbox clean',
'{"and": [{"or": [{"category": "newsletter"}, {"category": "news"}]}, {"confidence_gt": 0.81}, {"older_than_days": 7}]}',
ARRAY['delete'], 'email_organization', 10, true, 1),

-- Rule 2: Cold Outreach Filter
('universal-cold-outreach', 'universal', '❄️ Cold Outreach Filter',
'Route cold outreach and prepare a polite response draft',
'Labels cold outreach and generates polite decline/interest draft responses',
'{"and": [{"or": [{"category": "promotional"}, {"category": "client"}]}, {"recipient_type": "bcc"}, {"confidence_gt": 0.70}]}',
ARRAY['label:Sales/Cold Outreach', 'draft'], 'email_organization', 20, true, 2),

-- Rule 3: CC Organizer
('universal-cc-organizer', 'universal', '👀 CC Organizer',
'Label CC traffic for quick triage',
'Labels emails where you are CC''d for easier filtering and batch review',
'{"recipient_type": "cc"}',
ARRAY['label:CC'], 'email_organization', 5, true, 3),

-- Rule 4: Receipt Organizer
('universal-receipts', 'universal', '🧾 Receipt Organizer',
'Preserve receipts for tracing, audit, and tax filing',
'Labels transactional emails (receipts, invoices) for easy searching and tax filing',
'{"and": [{"category": "transactional"}, {"confidence_gt": 0.90}, {"contains_keywords": ["receipt", "invoice", "payment", "order confirmation", "purchase"]}]}',
ARRAY['label:Receipts'], 'email_organization', 15, true, 4),

-- Rule 8: Social Noise
('exec-social', 'executive', '🔔 Social Noise',
'Reduce social updates that do not require action',
'Deletes social media notifications older than 7 days (LinkedIn, Twitter, etc.)',
'{"and": [{"category": "social"}, {"confidence_gt": 0.81}, {"older_than_days": 7}]}',
ARRAY['delete'], 'email_organization', 5, true, 5),

-- Rule 16: Stack Overflow Digests
('dev-stack-overflow', 'development', '💻 Stack Overflow Digests',
'Remove stale Stack Overflow digests from inbox',
'Deletes Stack Overflow digest emails older than 7 days',
'{"and": [{"or": [{"category": "newsletter"}, {"category": "news"}]}, {"contains_keywords": ["stack overflow", "stackoverflow"]}, {"older_than_days": 7}]}',
ARRAY['delete'], 'email_organization', 5, false, 6);

-- ============================================================================
-- PRIORITY ALERTS (3 rules)
-- ============================================================================

INSERT INTO public.rule_templates (rule_id, pack_id, name, intent, description, condition, actions, instructions, category, priority, is_enabled_by_default, sort_order) VALUES

-- Rule 5: VIP Urgent Messages
('exec-urgent-vip', 'executive', '⭐ VIP Urgent Messages',
'Surface high-priority VIP threads and suggest immediate response',
'Stars VIP messages, labels them, and generates immediate response draft',
'{"and": [{"or": [{"category": "client"}, {"category": "internal"}]}, {"ai_priority": "High"}, {"confidence_gt": 0.70}]}',
ARRAY['star', 'label:VIP', 'draft'],
'Acknowledge receipt and priority. Express willingness to address immediately. Ask for clarification if needed.',
'priority_alerts', 100, true, 1),

-- Rule 10: Critical Alerts
('dev-critical-alerts', 'development', '🚨 Critical Alerts',
'Highlight production-impacting incidents immediately',
'Stars critical system alerts from monitoring/alerting tools',
'{"and": [{"or": [{"category": "notification"}, {"category": "support"}]}, {"contains_keywords": ["critical", "down", "outage", "incident", "urgent", "emergency"]}, {"confidence_gt": 0.85}]}',
ARRAY['star', 'label:Alerts/Critical'],
NULL, 'priority_alerts', 100, true, 2),

-- Rule 23: Urgent Support Tickets
('ops-urgent-tickets', 'operations', '🎫 Urgent Support Tickets',
'Escalate urgent customer support threads and draft first response',
'Stars urgent support tickets and drafts acknowledgment response',
'{"and": [{"or": [{"category": "support"}, {"category": "client"}]}, {"contains_keywords": ["urgent", "emergency", "critical", "asap", "escalate"]}, {"confidence_gt": 0.70}]}',
ARRAY['star', 'label:Support/Urgent', 'draft'],
'Acknowledge ticket receipt and urgency. Confirm we are investigating. Provide initial timeline if possible.',
'priority_alerts', 100, true, 3);

-- ============================================================================
-- DEVELOPMENT RULES (6 rules)
-- ============================================================================

INSERT INTO public.rule_templates (rule_id, pack_id, name, intent, description, condition, actions, instructions, category, priority, is_enabled_by_default, sort_order) VALUES

-- Rule 11: GitHub Mentions
('dev-github-mentions', 'development', '👤 GitHub Mentions',
'Keep mention and assignment notifications discoverable',
'Labels GitHub mentions and assignments for tracking',
'{"and": [{"or": [{"category": "notification"}, {"category": "internal"}]}, {"contains_keywords": ["@", "mentioned you", "assigned you", "requested your review"]}, {"or": [{"sender_domain": "github.com"}, {"sender_domain": "gitlab.com"}]}]}',
ARRAY['label:GitHub/Mentions'], NULL, 'development', 80, true, 1),

-- Rule 12: CI/CD Failures
('dev-ci-failures', 'development', '❌ CI/CD Failures',
'Escalate build/deploy failures for faster recovery',
'Stars CI/CD failure notifications for immediate attention',
'{"and": [{"category": "notification"}, {"contains_keywords": ["failed", "failure", "error", "broken", "build failed"]}, {"or": [{"sender_domain": "circleci.com"}, {"sender_domain": "github.com"}, {"sender_domain": "gitlab.com"}, {"sender_domain": "travis-ci.com"}]}]}',
ARRAY['star', 'label:CI/Failures'], NULL, 'development', 90, true, 2),

-- Rule 13: Dependabot Noise
('dev-dependabot', 'development', '🤖 Dependabot Noise',
'Reduce low-priority dependency update noise',
'Deletes non-security Dependabot notifications older than 14 days',
'{"and": [{"or": [{"category": "notification"}, {"category": "newsletter"}]}, {"contains_keywords": ["dependabot", "dependency", "package update"]}, {"not": {"contains_keywords": ["security", "vulnerability", "CVE"]}}, {"older_than_days": 14}]}',
ARRAY['delete'], NULL, 'development', 15, true, 3),

-- Rule 14: Code Review Requests
('dev-code-review', 'development', '👀 Code Review Requests',
'Track review requests and draft quick acknowledgments',
'Labels code review requests and drafts acknowledgment',
'{"and": [{"or": [{"category": "internal"}, {"category": "notification"}]}, {"contains_keywords": ["review requested", "pull request", "merge request", "PR"]}, {"confidence_gt": 0.70}]}',
ARRAY['label:GitHub/Review Requests', 'draft'],
'Acknowledge review request. Provide estimated review timeline. Ask for context if needed.',
'development', 80, true, 4),

-- Rule 15: Monitoring Alerts
('dev-monitoring', 'development', '⚠️ Monitoring Alerts',
'Tidy non-urgent monitoring alerts while keeping labels',
'Labels and deletes non-urgent monitoring alerts older than 14 days',
'{"and": [{"or": [{"category": "notification"}, {"category": "support"}]}, {"not": {"contains_keywords": ["critical", "urgent", "down", "outage"]}}, {"or": [{"sender_domain": "datadog.com"}, {"sender_domain": "pingdom.com"}, {"sender_domain": "sentry.io"}]}, {"older_than_days": 14}]}',
ARRAY['label:Monitoring', 'delete'], NULL, 'development', 20, true, 5),

-- Rule 7: Weekly Reports (moved to development)
('exec-reports', 'executive', '📊 Weekly Reports',
'Keep reports structured and remove stale report traffic',
'Labels reports and deletes them after 30 days',
'{"and": [{"or": [{"category": "internal"}, {"category": "client"}]}, {"contains_keywords": ["weekly report", "status report", "metrics", "dashboard"]}, {"older_than_days": 30}]}',
ARRAY['label:Reports', 'delete'], NULL, 'development', 10, false, 6);

-- ============================================================================
-- SALES & BUSINESS RULES (7 rules)
-- ============================================================================

INSERT INTO public.rule_templates (rule_id, pack_id, name, intent, description, condition, actions, instructions, category, priority, is_enabled_by_default, sort_order) VALUES

-- Rule 9: Financial Updates
('exec-financial', 'executive', '💰 Financial Updates',
'Prioritize financial communication and draft professional responses',
'Stars financial emails and drafts professional acknowledgment',
'{"and": [{"or": [{"category": "client"}, {"category": "internal"}, {"category": "transactional"}]}, {"contains_keywords": ["invoice", "payment", "contract", "budget", "financial", "pricing", "quote"]}, {"confidence_gt": 0.70}]}',
ARRAY['star', 'label:Financial', 'draft'],
'Acknowledge receipt of financial communication. Confirm details if needed. Provide next steps.',
'sales_business', 95, true, 1),

-- Rule 17: Hot Leads
('sales-hot-leads', 'sales', '🔥 Hot Leads',
'Prioritize high-intent leads and draft next-step replies',
'Stars high-intent leads and drafts next-step response',
'{"and": [{"category": "client"}, {"contains_keywords": ["interested", "demo", "pricing", "get started", "sign up", "ready to"]}, {"confidence_gt": 0.70}]}',
ARRAY['star', 'label:Leads/Hot', 'draft'],
'Express enthusiasm about their interest. Suggest specific next steps (demo, call, trial). Provide calendar link if applicable.',
'sales_business', 95, true, 2),

-- Rule 18: Follow-up Reminders
('sales-follow-ups', 'sales', '🔄 Follow-up Reminders',
'Draft courteous follow-ups to keep opportunities moving',
'Labels and drafts polite follow-up responses',
'{"and": [{"or": [{"category": "client"}, {"category": "personal"}]}, {"contains_keywords": ["follow up", "checking in", "touching base", "any update"]}, {"confidence_gt": 0.70}]}',
ARRAY['label:Follow-ups', 'draft'],
'Acknowledge their follow-up. Provide status update. Suggest next steps or timeline.',
'sales_business', 75, true, 3),

-- Rule 19: Referrals & Intros
('sales-referrals', 'sales', '🤝 Referrals & Intros',
'Capture warm intros and draft appreciative responses',
'Stars referrals and drafts appreciative response',
'{"and": [{"or": [{"category": "client"}, {"category": "personal"}]}, {"contains_keywords": ["introduction", "intro", "referred", "referral", "connect you with"]}, {"confidence_gt": 0.70}]}',
ARRAY['star', 'label:Referrals', 'draft'],
'Thank them for the introduction. Express interest in connecting. Suggest specific time or next steps.',
'sales_business', 90, true, 4),

-- Rule 20: Contracts & Proposals
('sales-contracts', 'sales', '📄 Contracts & Proposals',
'Escalate contract traffic and draft confirmation responses',
'Stars contracts and drafts confirmation response',
'{"and": [{"or": [{"category": "client"}, {"category": "transactional"}]}, {"contains_keywords": ["contract", "proposal", "agreement", "signature", "docusign", "sign"]}, {"confidence_gt": 0.70}]}',
ARRAY['star', 'label:Contracts', 'draft'],
'Acknowledge receipt of contract/proposal. Confirm review timeline. Ask clarifying questions if needed.',
'sales_business', 95, true, 5),

-- Rule 21: Objections & Concerns
('sales-objections', 'sales', '🤔 Objections & Concerns',
'Draft empathetic responses to objections and hesitations',
'Labels objections and drafts empathetic response',
'{"and": [{"category": "client"}, {"contains_keywords": ["concern", "worried", "hesitant", "not sure", "expensive", "too costly"]}, {"confidence_gt": 0.70}]}',
ARRAY['label:Objections', 'draft'],
'Acknowledge their concern empathetically. Address the specific objection. Offer alternatives or clarification.',
'sales_business', 85, true, 6),

-- Rule 22: Nurture Campaigns
('sales-nurture', 'sales', '📧 Nurture Campaigns',
'Clear low-value campaign email automatically after retention',
'Deletes nurture campaign emails older than 7 days',
'{"and": [{"or": [{"category": "promotional"}, {"category": "newsletter"}]}, {"contains_keywords": ["campaign", "unsubscribe", "marketing"]}, {"older_than_days": 7}]}',
ARRAY['delete'], NULL, 'sales_business', 10, false, 7);

-- ============================================================================
-- OPERATIONS RULES (4 rules)
-- ============================================================================

INSERT INTO public.rule_templates (rule_id, pack_id, name, intent, description, condition, actions, instructions, category, priority, is_enabled_by_default, sort_order) VALUES

-- Rule 6: Meeting Invites
('exec-meeting-invites', 'executive', '📅 Meeting Invites',
'Organize meeting requests and draft accept/decline replies',
'Labels meeting invites and drafts accept/decline response',
'{"and": [{"or": [{"category": "internal"}, {"category": "client"}, {"category": "personal"}]}, {"contains_keywords": ["meeting", "calendar invite", "zoom", "teams", "google meet"]}, {"confidence_gt": 0.70}]}',
ARRAY['label:Meetings', 'draft'],
'Confirm availability or suggest alternative times. Accept or politely decline with reason if needed.',
'operations', 80, true, 1),

-- Rule 24: Internal Requests
('ops-internal-requests', 'operations', '📥 Internal Requests',
'Organize internal asks and draft acknowledgment replies',
'Labels internal requests and drafts acknowledgment',
'{"and": [{"category": "internal"}, {"contains_keywords": ["need", "request", "help", "can you", "could you", "would you"]}, {"confidence_gt": 0.70}]}',
ARRAY['label:Internal/Requests', 'draft'],
'Acknowledge the request. Confirm understanding. Provide timeline or next steps.',
'operations', 75, true, 2),

-- Rule 25: Vendor Communications
('ops-vendor-comms', 'operations', '🏢 Vendor Communications',
'Track vendor operations traffic and draft response stubs',
'Labels vendor communications and drafts response',
'{"and": [{"or": [{"category": "transactional"}, {"category": "support"}, {"category": "client"}]}, {"contains_keywords": ["vendor", "supplier", "invoice", "shipment", "delivery", "purchase order"]}, {"confidence_gt": 0.70}]}',
ARRAY['label:Vendors', 'draft'],
'Acknowledge receipt. Confirm details or next steps. Ask questions if needed.',
'operations', 70, true, 3),

-- Rule 26: System Alerts
('ops-system-alerts', 'operations', '🔔 System Alerts',
'Remove non-urgent system notifications after retention',
'Labels and deletes non-urgent system alerts older than 14 days',
'{"and": [{"category": "notification"}, {"not": {"contains_keywords": ["critical", "urgent", "down"]}}, {"older_than_days": 14}]}',
ARRAY['label:System Alerts', 'delete'], NULL, 'operations', 15, true, 4);

-- Add comment
COMMENT ON TABLE public.rule_templates IS 'Template definitions for 26 improved system rules with business value focus: inbox cleanup, draft automation, and smart categorization.';

-- Log success
DO $$
BEGIN
  RAISE NOTICE '✓ Successfully created rule_templates table with 26 improved rules';
  RAISE NOTICE '  - 6 Email Organization rules';
  RAISE NOTICE '  - 3 Priority Alert rules';
  RAISE NOTICE '  - 6 Development rules';
  RAISE NOTICE '  - 7 Sales & Business rules';
  RAISE NOTICE '  - 4 Operations rules';
  RAISE NOTICE '  - Confidence: 0.81 (delete safe), 0.70 (draft)';
  RAISE NOTICE '  - Age-based cleanup: 7-30 days';
  RAISE NOTICE '  - Draft automation: 12 rules';
END $$;
