/**
 * Rule Item Component
 *
 * Displays a single automation rule with stats and controls
 */

import React from 'react';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { Settings, TrendingUp } from 'lucide-react';

interface RuleItemProps {
  rule: {
    id: string;
    name: string;
    intent?: string;
    is_enabled: boolean;
    is_system_managed?: boolean;
  };
  stats?: {
    triggeredToday: number;
    trend?: 'up' | 'down' | 'stable';
  };
  onToggle: (ruleId: string, enabled: boolean) => void;
  onConfigure?: (ruleId: string) => void;
}

export function RuleItem({ rule, stats, onToggle, onConfigure }: RuleItemProps) {
  return (
    <div className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-sm">{rule.name}</h4>
          {rule.is_system_managed && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              Auto-Pilot
            </span>
          )}
        </div>
        {rule.intent && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
            {rule.intent}
          </p>
        )}
      </div>

      {stats && stats.triggeredToday > 0 && (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mr-4">
          <TrendingUp className="w-4 h-4" />
          <span>{stats.triggeredToday} today</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        {onConfigure && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onConfigure(rule.id)}
            className="h-8 w-8 p-0"
          >
            <Settings className="w-4 h-4" />
          </Button>
        )}
        <Switch
          checked={rule.is_enabled}
          onCheckedChange={(checked) => onToggle(rule.id, checked)}
        />
      </div>
    </div>
  );
}
