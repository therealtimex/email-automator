-- Add min_confidence column to rules table
-- Allows per-rule confidence threshold tuning

ALTER TABLE rules
ADD COLUMN min_confidence DECIMAL(3,2) DEFAULT 0.70;

-- Add constraint to ensure valid range (0.0 to 1.0)
ALTER TABLE rules
ADD CONSTRAINT rules_min_confidence_check CHECK (min_confidence >= 0.0 AND min_confidence <= 1.0);

-- Add comment for documentation
COMMENT ON COLUMN rules.min_confidence IS 'Minimum confidence threshold (0.0-1.0) required for LLM to match this rule. Lower values = more matches but more false positives. Higher values = fewer matches but more precision. Default: 0.70 (balanced). Recommended: 0.9 for critical rules, 0.7 for default, 0.5 for experimental/cleanup rules.';

-- Add index for filtering by confidence
CREATE INDEX idx_rules_min_confidence ON rules(min_confidence) WHERE is_enabled = true;
