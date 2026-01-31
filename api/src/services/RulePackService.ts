/**
 * Rule Pack Service - Zero-Configuration Email Automation
 *
 * Handles installation, management, and tracking of rule packs for users.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '../utils/logger.js';
import { getPackById, getPacksForRole, ALL_PACKS } from './rulePacks/index.js';
import type { RulePack, RuleTemplate, UserRole } from './rulePacks/types.js';
import type { Rule, PackInstallation } from './supabase.js';

const logger = createLogger('RulePackService');

export class RulePackService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Install a rule pack for a user
   * Creates all rules from the pack and tracks installation
   */
  async installPack(userId: string, packId: string): Promise<{ success: boolean; rulesCreated: number; error?: string }> {
    try {
      const pack = getPackById(packId);
      if (!pack) {
        return { success: false, rulesCreated: 0, error: `Pack '${packId}' not found` };
      }

      logger.info(`Installing pack '${packId}' for user ${userId}`);

      // Check if pack is already installed
      const { data: existing } = await this.supabase
        .from('pack_installations')
        .select('*')
        .eq('user_id', userId)
        .eq('pack_id', packId)
        .is('uninstalled_at', null)
        .single();

      if (existing) {
        logger.info(`Pack '${packId}' already installed for user ${userId}`);
        return { success: true, rulesCreated: 0 };  // Already installed, no-op
      }

      // Create all rules from the pack
      let rulesCreated = 0;
      for (const template of pack.rules) {
        // Check if rule already exists (by rule_template_id)
        const { data: existingRule } = await this.supabase
          .from('rules')
          .select('id')
          .eq('user_id', userId)
          .eq('rule_template_id', template.id)
          .single();

        if (existingRule) {
          logger.debug(`Rule '${template.id}' already exists, skipping`);
          continue;
        }

        // Create rule from template
        const { error: ruleError } = await this.supabase
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
            is_enabled: template.is_enabled_by_default,
            pack: packId,
            rule_template_id: template.id,
            is_system_managed: true
          });

        if (ruleError) {
          logger.error(`Failed to create rule '${template.id}'`, ruleError);
          continue;  // Continue with other rules even if one fails
        }

        rulesCreated++;
      }

      // Track pack installation
      const { error: installError } = await this.supabase
        .from('pack_installations')
        .insert({
          user_id: userId,
          pack_id: packId,
          source: 'manual'
        });

      if (installError) {
        logger.error(`Failed to track pack installation`, installError);
        // Don't fail the whole operation if tracking fails
      }

      logger.info(`Successfully installed pack '${packId}' with ${rulesCreated} rules`);
      return { success: true, rulesCreated };

    } catch (error: any) {
      logger.error(`Error installing pack '${packId}'`, error);
      return { success: false, rulesCreated: 0, error: error.message };
    }
  }

  /**
   * Uninstall a rule pack for a user
   * Disables all rules from the pack and marks it as uninstalled
   */
  async uninstallPack(userId: string, packId: string): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info(`Uninstalling pack '${packId}' for user ${userId}`);

      // Disable all rules from this pack
      const { error: disableError } = await this.supabase
        .from('rules')
        .update({ is_enabled: false })
        .eq('user_id', userId)
        .eq('pack', packId);

      if (disableError) {
        logger.error(`Failed to disable pack rules`, disableError);
        return { success: false, error: disableError.message };
      }

      // Mark pack as uninstalled
      const { error: uninstallError } = await this.supabase
        .from('pack_installations')
        .update({ uninstalled_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('pack_id', packId)
        .is('uninstalled_at', null);

      if (uninstallError) {
        logger.error(`Failed to mark pack as uninstalled`, uninstallError);
        return { success: false, error: uninstallError.message };
      }

      logger.info(`Successfully uninstalled pack '${packId}'`);
      return { success: true };

    } catch (error: any) {
      logger.error(`Error uninstalling pack '${packId}'`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all installed packs for a user
   */
  async getInstalledPacks(userId: string): Promise<PackInstallation[]> {
    const { data, error } = await this.supabase
      .from('pack_installations')
      .select('*')
      .eq('user_id', userId)
      .is('uninstalled_at', null)
      .order('installed_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch installed packs', error);
      return [];
    }

    return data || [];
  }

  /**
   * Update user role and install appropriate packs
   * This is the main entry point for onboarding
   */
  async updateUserRole(
    userId: string,
    role: UserRole,
    source: 'onboarding' | 'manual' = 'onboarding'
  ): Promise<{ success: boolean; packsInstalled: string[]; error?: string }> {
    try {
      logger.info(`Updating user role to '${role}' for user ${userId}`);

      // 1. Update user settings
      const { error: settingsError } = await this.supabase
        .from('user_settings')
        .update({
          user_role: role,
          onboarding_completed: true
        })
        .eq('user_id', userId);

      if (settingsError) {
        logger.error('Failed to update user settings', settingsError);
        return { success: false, packsInstalled: [], error: settingsError.message };
      }

      // 2. Get packs for this role
      const packs = getPacksForRole(role);
      const packsInstalled: string[] = [];

      // 3. Install each pack
      for (const pack of packs) {
        const result = await this.installPackWithSource(userId, pack.id, source);
        if (result.success) {
          packsInstalled.push(pack.id);
        }
      }

      logger.info(`Successfully set up ${packsInstalled.length} packs for role '${role}'`);
      return { success: true, packsInstalled };

    } catch (error: any) {
      logger.error(`Error updating user role`, error);
      return { success: false, packsInstalled: [], error: error.message };
    }
  }

  /**
   * Install a pack with a specific source tracking
   */
  private async installPackWithSource(
    userId: string,
    packId: string,
    source: 'onboarding' | 'manual' | 'auto'
  ): Promise<{ success: boolean; rulesCreated: number; error?: string }> {
    const pack = getPackById(packId);
    if (!pack) {
      return { success: false, rulesCreated: 0, error: `Pack '${packId}' not found` };
    }

    // Check if already installed
    const { data: existing } = await this.supabase
      .from('pack_installations')
      .select('*')
      .eq('user_id', userId)
      .eq('pack_id', packId)
      .is('uninstalled_at', null)
      .single();

    if (existing) {
      return { success: true, rulesCreated: 0 };  // Already installed
    }

    // Create rules
    let rulesCreated = 0;
    for (const template of pack.rules) {
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
          is_enabled: template.is_enabled_by_default,
          pack: packId,
          rule_template_id: template.id,
          is_system_managed: true
        });

      if (!error) rulesCreated++;
    }

    // Track installation
    await this.supabase
      .from('pack_installations')
      .insert({
        user_id: userId,
        pack_id: packId,
        source
      });

    return { success: true, rulesCreated };
  }

  /**
   * Get pack metrics (how many users have it installed, etc.)
   */
  async getPackMetrics(packId: string): Promise<{
    totalInstallations: number;
    activeInstallations: number;
    uninstallations: number;
  }> {
    const { data: all } = await this.supabase
      .from('pack_installations')
      .select('*')
      .eq('pack_id', packId);

    const total = all?.length || 0;
    const active = all?.filter(p => !p.uninstalled_at).length || 0;
    const uninstalled = all?.filter(p => p.uninstalled_at).length || 0;

    return {
      totalInstallations: total,
      activeInstallations: active,
      uninstallations: uninstalled
    };
  }

  /**
   * Auto-install universal pack for new users
   * Called during signup or first sync
   */
  async ensureUniversalPack(userId: string): Promise<{ success: boolean; installed: boolean }> {
    try {
      // Check if user already has universal pack
      const { data: existing } = await this.supabase
        .from('pack_installations')
        .select('*')
        .eq('user_id', userId)
        .eq('pack_id', 'universal')
        .is('uninstalled_at', null)
        .single();

      if (existing) {
        return { success: true, installed: false };  // Already has it
      }

      // Install universal pack
      const result = await this.installPackWithSource(userId, 'universal', 'auto');

      logger.info(`Auto-installed Universal Pack for new user ${userId}`);
      return { success: result.success, installed: true };

    } catch (error: any) {
      logger.error('Failed to ensure universal pack', error);
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
