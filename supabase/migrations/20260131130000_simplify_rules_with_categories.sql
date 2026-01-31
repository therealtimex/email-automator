-- Migration: Simplify Rules - Add Categories and Remove Pack Concept
-- Simplifies the UX by showing all rules in grouped categories instead of packs

-- Add category column to rule_templates
ALTER TABLE public.rule_templates
ADD COLUMN IF NOT EXISTS category VARCHAR(50);

-- Update existing rules with categories
-- 📧 Email Organization
UPDATE public.rule_templates SET category = 'email_organization'
WHERE rule_id IN (
  'universal-newsletters',
  'universal-receipts',
  'universal-cc-organizer',
  'universal-cold-outreach',
  'exec-social',
  'dev-stack-overflow'
);

-- 🚨 Priority & Alerts
UPDATE public.rule_templates SET category = 'priority_alerts'
WHERE rule_id IN (
  'exec-urgent-vip',
  'dev-critical-alerts',
  'ops-urgent-tickets'
);

-- 💻 Development
UPDATE public.rule_templates SET category = 'development'
WHERE rule_id IN (
  'dev-github-mentions',
  'dev-ci-failures',
  'dev-code-review',
  'dev-dependabot',
  'dev-monitoring'
);

-- 💼 Sales & Business
UPDATE public.rule_templates SET category = 'sales_business'
WHERE rule_id IN (
  'sales-hot-leads',
  'sales-follow-ups',
  'sales-referrals',
  'sales-contracts',
  'sales-objections',
  'sales-nurture',
  'exec-financial'
);

-- ⚙️ Operations
UPDATE public.rule_templates SET category = 'operations'
WHERE rule_id IN (
  'ops-internal-requests',
  'ops-vendor-comms',
  'ops-system-alerts',
  'exec-meeting-invites',
  'exec-reports'
);

-- Set default enabled rules (4-5 universal rules)
UPDATE public.rule_templates
SET is_enabled_by_default = true
WHERE rule_id IN (
  'universal-newsletters',
  'universal-receipts',
  'universal-cc-organizer',
  'universal-cold-outreach',
  'exec-urgent-vip'
);

-- Set all other rules to disabled by default
UPDATE public.rule_templates
SET is_enabled_by_default = false
WHERE rule_id NOT IN (
  'universal-newsletters',
  'universal-receipts',
  'universal-cc-organizer',
  'universal-cold-outreach',
  'exec-urgent-vip'
);

-- Add index for category lookups
CREATE INDEX IF NOT EXISTS idx_rule_templates_category ON public.rule_templates(category);

-- Update comments
COMMENT ON COLUMN public.rule_templates.category IS 'Rule category for UI grouping: email_organization, priority_alerts, development, sales_business, operations';
COMMENT ON COLUMN public.rule_templates.pack_id IS 'Legacy field - kept for backwards compatibility but no longer used in UI';
