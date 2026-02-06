-- Add negative_condition column to rules table for exclusion logic
-- This allows rules to specify conditions that should EXCLUDE emails from matching

-- Add negative_condition column
ALTER TABLE rules
ADD COLUMN negative_condition JSONB;

-- Add comment for documentation
COMMENT ON COLUMN rules.negative_condition IS 'JSONB condition that excludes emails from matching this rule. If an email matches both condition (positive) and negative_condition, it will NOT match the rule. Uses same structure as condition column.';

-- Example negative_condition structures:
-- Exclude newsletters: { "or": [{ "is_automated": true }, { "has_unsubscribe": true }] }
-- Exclude specific category: { "category": "newsletter" }
-- Exclude specific sender: { "sender_domain": "googlealerts.com" }
-- Multiple exclusions: { "or": [{ "category": "news" }, { "is_automated": true }] }
