/**
 * Rule Packs - Zero-Configuration Email Automation
 *
 * This module provides pre-configured rule packs for different user roles.
 * Rule packs enable zero-configuration UX by providing smart defaults that
 * work out of the box.
 */

export * from './types.js';
export { UNIVERSAL_PACK } from './universal.js';
export { EXECUTIVE_PACK } from './executive.js';
export { DEVELOPER_PACK } from './developer.js';
export { SALES_PACK } from './sales.js';
export { OPERATIONS_PACK } from './operations.js';

import { UNIVERSAL_PACK } from './universal.js';
import { EXECUTIVE_PACK } from './executive.js';
import { DEVELOPER_PACK } from './developer.js';
import { SALES_PACK } from './sales.js';
import { OPERATIONS_PACK } from './operations.js';
import { RulePack } from './types.js';

/**
 * All available rule packs
 */
export const ALL_PACKS: Record<string, RulePack> = {
  universal: UNIVERSAL_PACK,
  executive: EXECUTIVE_PACK,
  developer: DEVELOPER_PACK,
  sales: SALES_PACK,
  operations: OPERATIONS_PACK,
};
