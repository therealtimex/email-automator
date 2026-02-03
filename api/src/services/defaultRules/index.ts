/**
 * Default Rules Index
 *
 * Exports all default rules organized by category.
 * Rules are now flat arrays grouped by category instead of packs.
 */

import { DefaultRule } from './types.js';
import { EMAIL_ORG_RULES } from './emailOrg.js';
import { PRIORITY_RULES } from './priority.js';
import { DEVELOPMENT_RULES } from './development.js';
import { SALES_BUSINESS_RULES } from './salesBusiness.js';
import { OPERATIONS_RULES } from './operations.js';

/**
 * All default rules available in the system.
 * This is a flat array that can be filtered/searched as needed.
 */
export const ALL_DEFAULT_RULES: DefaultRule[] = [
  ...EMAIL_ORG_RULES,
  ...PRIORITY_RULES,
  ...DEVELOPMENT_RULES,
  ...SALES_BUSINESS_RULES,
  ...OPERATIONS_RULES,
];

// Re-export types for convenience
export type { DefaultRule, RuleCategory, EmailCategory, EmailAction, EnhancedRuleCondition } from './types.js';
