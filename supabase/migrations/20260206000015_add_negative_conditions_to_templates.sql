-- Migration: Add negative conditions to rule templates for better zero-config UX
-- Purpose: Prevent common false positives by adding smart exclusion logic to default rules
--
-- Key Improvements:
-- 1. Financial Updates - exclude automated newsletters (fixes Google Alert problem)
-- 2. Newsletter Sweeper - exclude VIP/personal communications
-- 3. Cold Outreach Filter - exclude reply threads and VIP senders
-- 4. Social Noise - exclude VIP senders
-- 5. Nurture Campaigns - exclude replies and personal emails
-- 6. Stack Overflow Digests - exclude mentions/assignments

-- Add negative_condition column to rule_templates
ALTER TABLE rule_templates ADD COLUMN IF NOT EXISTS negative_condition JSONB;

-- 1. Newsletter Sweeper - Don't delete VIP or personal communications
UPDATE rule_templates
SET negative_condition = '{"or": [{"category": "client"}, {"category": "personal"}, {"ai_priority": "High"}]}'::jsonb
WHERE rule_id = 'universal-newsletters';

-- 2. Cold Outreach Filter - Don't draft replies to ongoing conversations or VIP emails
UPDATE rule_templates
SET negative_condition = '{"or": [{"is_reply": true}, {"ai_priority": "High"}]}'::jsonb
WHERE rule_id = 'universal-cold-outreach';

-- 3. Social Noise - Don't delete VIP social mentions
UPDATE rule_templates
SET negative_condition = '{"ai_priority": "High"}'::jsonb
WHERE rule_id = 'exec-social';

-- 4. Stack Overflow Digests - Don't delete if you're mentioned or assigned
UPDATE rule_templates
SET negative_condition = '{"contains_keywords": ["@", "mentioned you", "assigned"]}'::jsonb
WHERE rule_id = 'dev-stack-overflow';

-- 5. Financial Updates - Don't match automated newsletters (CRITICAL: fixes Google Alert problem)
-- Exclude emails that are automated/bulk emails with unsubscribe headers
UPDATE rule_templates
SET negative_condition = '{"or": [{"is_automated": true}, {"has_unsubscribe": true}, {"category": "newsletter"}, {"category": "news"}]}'::jsonb
WHERE rule_id = 'exec-financial';

-- 6. Nurture Campaigns - Don't delete replies or personal communications
UPDATE rule_templates
SET negative_condition = '{"or": [{"is_reply": true}, {"category": "personal"}, {"category": "client"}]}'::jsonb
WHERE rule_id = 'sales-nurture';

-- 7. Monitoring Alerts - Don't delete if part of reply thread (ongoing incident)
UPDATE rule_templates
SET negative_condition = '{"is_reply": true}'::jsonb
WHERE rule_id = 'dev-monitoring';

-- 8. System Alerts - Don't delete if part of reply thread
UPDATE rule_templates
SET negative_condition = '{"is_reply": true}'::jsonb
WHERE rule_id = 'ops-system-alerts';

-- Add comment
COMMENT ON COLUMN rule_templates.negative_condition IS 'JSONB condition that excludes emails from matching this rule (exclusion logic). Prevents false positives.';

-- Log success
DO $$
BEGIN
  RAISE NOTICE '✓ Successfully added negative conditions to 8 rule templates';
  RAISE NOTICE '  - Newsletter Sweeper: exclude VIP/personal/client emails';
  RAISE NOTICE '  - Cold Outreach: exclude replies and VIP senders';
  RAISE NOTICE '  - Social Noise: exclude VIP senders';
  RAISE NOTICE '  - Stack Overflow: exclude mentions/assignments';
  RAISE NOTICE '  - Financial Updates: exclude automated/newsletter emails (fixes Google Alert problem)';
  RAISE NOTICE '  - Nurture Campaigns: exclude replies and personal/client emails';
  RAISE NOTICE '  - Monitoring Alerts: exclude reply threads';
  RAISE NOTICE '  - System Alerts: exclude reply threads';
  RAISE NOTICE '  ';
  RAISE NOTICE '🎯 Zero-Config UX: Users get smart exclusion logic out-of-the-box!';
END $$;
