/**
 * Pack Card Component
 *
 * Displays a rule pack with its rules and overall stats
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { ChevronDown, ChevronUp, Package, Power, PowerOff } from 'lucide-react';
import { RuleItem } from './RuleItem';
import { useLanguage } from '../../context/LanguageContext';

interface PackCardProps {
  pack: {
    id: string;
    name: string;
    description: string;
    icon?: string;
  };
  rules: Array<{
    id: string;
    name: string;
    intent?: string;
    is_enabled: boolean;
    is_system_managed?: boolean;
    pack?: string;
  }>;
  stats?: {
    totalTriggered: number;
    rulesActive: number;
    rulesTotal: number;
  };
  onToggleRule: (ruleId: string, enabled: boolean) => void;
  onConfigureRule?: (ruleId: string) => void;
  onTogglePack?: (packId: string, enabled: boolean) => void;
}

export function PackCard({ pack, rules, stats, onToggleRule, onConfigureRule, onTogglePack }: PackCardProps) {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(true);

  const packRules = rules.filter(r => r.pack === pack.id);
  const allEnabled = packRules.every(r => r.is_enabled);
  const someEnabled = packRules.some(r => r.is_enabled);

  const handleTogglePack = () => {
    if (onTogglePack) {
      // If all enabled, disable all. Otherwise, enable all.
      onTogglePack(pack.id, !allEnabled);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">{pack.icon || '📦'}</span>
              <span>{pack.name}</span>
              <span className={`ml-2 px-2 py-1 text-xs rounded-full ${allEnabled
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : someEnabled
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}>
                {allEnabled ? t('autopilot.pack.active') : someEnabled ? t('autopilot.pack.partial') : t('autopilot.pack.inactive')}
              </span>
            </CardTitle>
            <CardDescription>{pack.description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {onTogglePack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleTogglePack}
                title={allEnabled ? t('autopilot.pack.disableTooltip') : t('autopilot.pack.enableTooltip')}
              >
                {allEnabled ? (
                  <PowerOff className="w-4 h-4 text-gray-600" />
                ) : (
                  <Power className="w-4 h-4 text-green-600" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {stats && (
          <div className="flex gap-4 mt-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <Package className="w-4 h-4" />
              <span>{t('autopilot.pack.rulesActive').replace('{active}', stats.rulesActive.toString()).replace('{total}', stats.rulesTotal.toString())}</span>
            </div>
            {stats.totalTriggered > 0 && (
              <div>
                <span className="font-medium">{t('autopilot.pack.actionsToday').replace('{count}', stats.totalTriggered.toString())}</span>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-1">
            {packRules.length > 0 ? (
              packRules.map((rule) => (
                <RuleItem
                  key={rule.id}
                  rule={rule}
                  onToggle={onToggleRule}
                  onConfigure={onConfigureRule}
                />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t('autopilot.pack.noRules')}</p>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
