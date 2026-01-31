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
import { RulePack, UserRole } from './types.js';

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

/**
 * Get packs that should be installed for a specific user role
 */
export function getPacksForRole(role?: UserRole | string): RulePack[] {
  const packs: RulePack[] = [
    UNIVERSAL_PACK  // Always include universal pack
  ];

  // Add role-specific pack
  if (role === 'executive') packs.push(EXECUTIVE_PACK);
  if (role === 'developer') packs.push(DEVELOPER_PACK);
  if (role === 'sales') packs.push(SALES_PACK);
  if (role === 'operations') packs.push(OPERATIONS_PACK);

  return packs;
}

/**
 * Get a specific pack by ID
 */
export function getPackById(packId: string): RulePack | undefined {
  return ALL_PACKS[packId];
}

/**
 * Get all available packs
 */
export function getAllPacks(): RulePack[] {
  return Object.values(ALL_PACKS);
}
