/**
 * Default Rule Service
 *
 * Handles seeding of default system rules for users.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '../utils/logger.js';
import { ALL_PACKS } from './rulePacks/index.js';

const logger = createLogger('DefaultRuleService');

export class RulePackService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Ensure all default rules are seeded for the user
   * Called during sync or onboarding
   */
  async ensureUniversalPack(userId: string): Promise<{ success: boolean; installed: boolean }> {
    try {
      // Check if user has already been seeded (using universal pack as a marker)
      const { data: existing } = await this.supabase
        .from('pack_installations')
        .select('*')
        .eq('user_id', userId)
        .eq('pack_id', 'seeded_all')
        .single();

      if (existing) {
        return { success: true, installed: false };
      }

      logger.info(`Seeding default rules for user ${userId}`);

      let totalRulesCreated = 0;
      const allPacks = Object.values(ALL_PACKS);

      for (const pack of allPacks) {
        for (const template of pack.rules) {
          // Check if rule already exists (by rule_template_id)
          const { data: existingRule } = await this.supabase
            .from('rules')
            .select('id')
            .eq('user_id', userId)
            .eq('rule_template_id', template.id)
            .single();

          if (existingRule) continue;

          const { error } = await this.supabase
            .from('rules')
            .insert({
              user_id: userId,
              name: template.name,
              description: template.description,
              intent: template.intent,
              priority: template.priority,
              condition: template.condition as any,
              actions: template.actions as any,
              instructions: template.instructions,
              is_enabled: template.is_enabled_by_default, // Default enable state from template
              pack: pack.id,
              rule_template_id: template.id,
              is_system_managed: true
            });

          if (!error) totalRulesCreated++;
        }
      }

      // Mark as seeded
      await this.supabase
        .from('pack_installations')
        .insert({
          user_id: userId,
          pack_id: 'seeded_all',
          source: 'auto'
        });

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
let defaultInstance: RulePackService | null = null;

export function getRulePackService(supabase: SupabaseClient): RulePackService {
  if (!defaultInstance) {
    defaultInstance = new RulePackService(supabase);
  }
  return defaultInstance;
}
