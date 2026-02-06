-- Migration: Backfill negative_condition for existing users' rules
-- Purpose: Apply smart exclusion logic to rules that were created before negative_condition existed
--
-- This ensures existing users benefit from the improved zero-config UX
-- Only updates rules that match template rule_id and don't already have negative_condition

-- Backfill negative_condition for existing rules based on their template
-- Uses rule_template_id to match rules to templates

-- 1. Newsletter Sweeper
UPDATE rules r
SET negative_condition = rt.negative_condition
FROM rule_templates rt
WHERE r.rule_template_id = rt.rule_id
  AND rt.rule_id = 'universal-newsletters'
  AND r.negative_condition IS NULL
  AND rt.negative_condition IS NOT NULL;

-- 2. Cold Outreach Filter
UPDATE rules r
SET negative_condition = rt.negative_condition
FROM rule_templates rt
WHERE r.rule_template_id = rt.rule_id
  AND rt.rule_id = 'universal-cold-outreach'
  AND r.negative_condition IS NULL
  AND rt.negative_condition IS NOT NULL;

-- 3. Social Noise
UPDATE rules r
SET negative_condition = rt.negative_condition
FROM rule_templates rt
WHERE r.rule_template_id = rt.rule_id
  AND rt.rule_id = 'exec-social'
  AND r.negative_condition IS NULL
  AND rt.negative_condition IS NOT NULL;

-- 4. Stack Overflow Digests
UPDATE rules r
SET negative_condition = rt.negative_condition
FROM rule_templates rt
WHERE r.rule_template_id = rt.rule_id
  AND rt.rule_id = 'dev-stack-overflow'
  AND r.negative_condition IS NULL
  AND rt.negative_condition IS NOT NULL;

-- 5. Financial Updates (CRITICAL: fixes Google Alert problem for existing users)
UPDATE rules r
SET negative_condition = rt.negative_condition
FROM rule_templates rt
WHERE r.rule_template_id = rt.rule_id
  AND rt.rule_id = 'exec-financial'
  AND r.negative_condition IS NULL
  AND rt.negative_condition IS NOT NULL;

-- 6. Nurture Campaigns
UPDATE rules r
SET negative_condition = rt.negative_condition
FROM rule_templates rt
WHERE r.rule_template_id = rt.rule_id
  AND rt.rule_id = 'sales-nurture'
  AND r.negative_condition IS NULL
  AND rt.negative_condition IS NOT NULL;

-- 7. Monitoring Alerts
UPDATE rules r
SET negative_condition = rt.negative_condition
FROM rule_templates rt
WHERE r.rule_template_id = rt.rule_id
  AND rt.rule_id = 'dev-monitoring'
  AND r.negative_condition IS NULL
  AND rt.negative_condition IS NOT NULL;

-- 8. System Alerts
UPDATE rules r
SET negative_condition = rt.negative_condition
FROM rule_templates rt
WHERE r.rule_template_id = rt.rule_id
  AND rt.rule_id = 'ops-system-alerts'
  AND r.negative_condition IS NULL
  AND rt.negative_condition IS NOT NULL;

-- Invalidate compiled_rule_context cache for all users
-- Force rebuild to include new negative conditions in LLM prompts
UPDATE user_settings
SET compiled_rule_context = NULL
WHERE compiled_rule_context IS NOT NULL;

-- Log success
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO updated_count
  FROM rules r
  JOIN rule_templates rt ON r.rule_template_id = rt.rule_id
  WHERE rt.negative_condition IS NOT NULL
    AND r.negative_condition IS NOT NULL;

  RAISE NOTICE '✓ Successfully backfilled negative_condition for existing users';
  RAISE NOTICE '  - Updated rules that match 8 templates with negative conditions';
  RAISE NOTICE '  - Financial Updates now excludes automated newsletters (Google Alert fix)';
  RAISE NOTICE '  - Newsletter Sweeper excludes VIP/personal emails';
  RAISE NOTICE '  - Cold Outreach excludes replies and VIP senders';
  RAISE NOTICE '  - Invalidated compiled_rule_context cache for all users';
  RAISE NOTICE '  - Total rules with negative_condition: %', updated_count;
  RAISE NOTICE '  ';
  RAISE NOTICE '🎯 Existing users now have smart exclusion logic!';
END $$;
