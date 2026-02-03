/**
 * Default Rule Service
 *
 * Handles seeding of default system rules for users.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '../utils/logger.js';
import { ALL_DEFAULT_RULES } from './defaultRules/index.js';

const logger = createLogger('DefaultRuleService');

export class DefaultRuleService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Ensure all default rules are seeded for the user
   * Called during sync or onboarding
   */
  async ensureDefaultRules(userId: string): Promise<{ success: boolean; installed: boolean }> {
    try {
      // Check if user has already been seeded (check if any system-managed rules exist)
      const { data: existingRules } = await this.supabase
        .from('rules')
        .select('id')
        .eq('user_id', userId)
        .eq('is_system_managed', true)
        .limit(1);

      if (existingRules && existingRules.length > 0) {
        return { success: true, installed: false };
      }

      logger.info(`Seeding default rules for user ${userId}`);

      let totalRulesCreated = 0;

      for (const rule of ALL_DEFAULT_RULES) {
        // Check if rule already exists (by rule_template_id)
        const { data: existingRule } = await this.supabase
          .from('rules')
          .select('id')
          .eq('user_id', userId)
          .eq('rule_template_id', rule.id)
          .single();

        if (existingRule) continue;

        const { error } = await this.supabase
          .from('rules')
          .insert({
            user_id: userId,
            name: rule.name,
            description: rule.description,
            intent: rule.intent,
            priority: rule.priority,
            condition: rule.condition as any,
            actions: rule.actions as any,
            instructions: rule.instructions,
            is_enabled: rule.is_enabled_by_default, // Default enable state from rule
            category: rule.category,
            rule_template_id: rule.id,
            is_system_managed: true
          });

        if (error) {
          logger.error(`Failed to create rule '${rule.id}'`, error);
          // Continue with other rules instead of failing entirely
        } else {
          totalRulesCreated++;
        }
      }

      logger.info(`Successfully seeded ${totalRulesCreated} default rules for user ${userId}`);
      return { success: true, installed: true };

    } catch (error: any) {
      logger.error('Failed to seed default rules', error);
      return { success: false, installed: false };
    }
  }
}

/**
 * Get singleton instance (convenience)
 */
let defaultInstance: DefaultRuleService | null = null;

export function getDefaultRuleService(supabase: SupabaseClient): DefaultRuleService {
  if (!defaultInstance) {
    defaultInstance = new DefaultRuleService(supabase);
  }
  return defaultInstance;
}

// Export legacy name for backward compatibility during transition
export const RulePackService = DefaultRuleService;
export const getRulePackService = getDefaultRuleService;
