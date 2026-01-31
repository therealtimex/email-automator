/**
 * Grouped Rules List Component
 *
 * Displays all rules organized by category with simple toggle switches
 */

import React from 'react';
import { Switch } from '../ui/switch';
import { Mail, AlertCircle, Code, Briefcase, Settings } from 'lucide-react';

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
}

const CATEGORY_CONFIG = {
  email_organization: {
    label: 'Email Organization',
    icon: Mail,
    emoji: '📧',
    description: 'Automatically organize common email types'
  },
  priority_alerts: {
    label: 'Priority & Alerts',
    icon: AlertCircle,
    emoji: '🚨',
    description: 'Surface urgent and important messages'
  },
  development: {
    label: 'Development',
    icon: Code,
    emoji: '💻',
    description: 'GitHub, CI/CD, and dev tool notifications'
  },
  sales_business: {
    label: 'Sales & Business',
    icon: Briefcase,
    emoji: '💼',
    description: 'Lead management and business communications'
  },
  operations: {
    label: 'Operations',
    icon: Settings,
    emoji: '⚙️',
    description: 'Support, internal requests, and system alerts'
  }
};

export function RulesListGrouped({ rules, onToggleRule }: RulesListGroupedProps) {
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
        const IconComponent = config.icon;

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
                      ({stats.enabled}/{stats.total} enabled)
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
                          Auto-Pilot
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

                  <div className="ml-4 shrink-0">
                    <Switch
                      checked={rule.is_enabled}
                      onCheckedChange={(checked) => onToggleRule(rule.id, checked)}
                    />
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
