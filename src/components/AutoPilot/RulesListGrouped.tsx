/**
 * Grouped Rules List Component
 *
 * Displays all rules organized by category with power buttons and edit controls
 */

import React from 'react';
import { Button } from '../ui/button';
import { Mail, AlertCircle, Code, Briefcase, Settings as SettingsIcon, Power, Edit2, Trash2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface Rule {
  id: string;
  name: string;
  intent?: string;
  is_enabled: boolean;
  is_system_managed?: boolean;
  category?: string;
  actions?: string[];
}

interface RulesListGroupedProps {
  rules: Rule[];
  onToggleRule: (ruleId: string, enabled: boolean) => void;
  onEditRule: (ruleId: string) => void;
  onDeleteRule?: (ruleId: string) => void;
}

export function RulesListGrouped({ rules, onToggleRule, onEditRule, onDeleteRule }: RulesListGroupedProps) {
  const { t } = useLanguage();

  const CATEGORY_CONFIG = {
    email_organization: {
      label: t('autopilot.category.email_organization.label'),
      icon: Mail,
      emoji: '📧',
      description: t('autopilot.category.email_organization.desc')
    },
    priority_alerts: {
      label: t('autopilot.category.priority_alerts.label'),
      icon: AlertCircle,
      emoji: '🚨',
      description: t('autopilot.category.priority_alerts.desc')
    },
    development: {
      label: t('autopilot.category.development.label'),
      icon: Code,
      emoji: '💻',
      description: t('autopilot.category.development.desc')
    },
    sales_business: {
      label: t('autopilot.category.sales_business.label'),
      icon: Briefcase,
      emoji: '💼',
      description: t('autopilot.category.sales_business.desc')
    },
    operations: {
      label: t('autopilot.category.operations.label'),
      icon: SettingsIcon,
      emoji: '⚙️',
      description: t('autopilot.category.operations.desc')
    }
  };

  // Group rules by category
  const groupedRules = rules.reduce((acc, rule) => {
    const category = rule.category || 'email_organization';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(rule);
    return acc;
  }, {} as Record<string, Rule[]>);

  // Calculate category stats
  const getCategoryStats = (categoryRules: Rule[]) => {
    const enabled = categoryRules.filter(r => r.is_enabled).length;
    const total = categoryRules.length;
    return { enabled, total };
  };

  // Format actions for display
  const formatActions = (actions?: string[]) => {
    if (!actions || actions.length === 0) return '';
    return actions
      .map(action => {
        if (action.startsWith('label:')) {
          return `label:${action.substring(6)}`;
        }
        return action;
      })
      .join(' + ');
  };

  return (
    <div className="space-y-8">
      {Object.entries(CATEGORY_CONFIG).map(([categoryKey, config]) => {
        const categoryRules = groupedRules[categoryKey] || [];
        if (categoryRules.length === 0) return null;

        const stats = getCategoryStats(categoryRules);

        return (
          <div key={categoryKey} className="space-y-3">
            {/* Category Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center">
                  <span className="text-xl">{config.emoji}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-base flex items-center gap-2">
                    {config.label}
                    <span className="text-xs font-normal text-muted-foreground">
                      {t('autopilot.enabledCount').replace('{enabled}', stats.enabled.toString()).replace('{total}', stats.total.toString())}
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {config.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Rules in Category */}
            <div className="space-y-1">
              {categoryRules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm truncate">{rule.name}</h4>
                      {rule.is_system_managed && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shrink-0">
                          {t('autopilot.badge')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {rule.intent && (
                        <p className="text-xs text-muted-foreground truncate">
                          {rule.intent}
                        </p>
                      )}
                      {rule.actions && rule.actions.length > 0 && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          → {formatActions(rule.actions)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    {/* Edit Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => onEditRule(rule.id)}
                      title={t('autopilot.editRuleTooltip')}
                    >
                      <Edit2 className="w-4 h-4 text-muted-foreground" />
                    </Button>

                    {/* Power Button (On/Off) */}
                    <Button
                      variant={rule.is_enabled ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onToggleRule(rule.id, !rule.is_enabled)}
                      className="h-8 px-3"
                    >
                      <Power className="w-4 h-4 mr-1" />
                      {rule.is_enabled ? t('common.on') : t('common.off')}
                    </Button>

                    {/* Delete Button (only for custom rules) */}
                    {!rule.is_system_managed && onDeleteRule && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => onDeleteRule(rule.id)}
                        title={t('autopilot.deleteRuleTooltip')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
