/**
 * Auto-Pilot Dashboard Component
 *
 * Simplified dashboard showing all rules organized by category
 */

import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import { RulesListGrouped } from './RulesListGrouped';
import { api } from '../../lib/api';

interface Rule {
  id: string;
  name: string;
  intent?: string;
  is_enabled: boolean;
  is_system_managed?: boolean;
  category?: string;
  actions?: string[];
}

export function AutoPilotDashboard() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const rulesResponse = await api.getRules();
      if (rulesResponse.error) {
        throw new Error(typeof rulesResponse.error === 'string'
          ? rulesResponse.error
          : rulesResponse.error.message
        );
      }

      setRules(rulesResponse.data?.rules || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rules');
      console.error('Error fetching rules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      const response = await api.updateRule(ruleId, { is_enabled: enabled });
      if (response.error) {
        throw new Error(typeof response.error === 'string'
          ? response.error
          : response.error.message
        );
      }

      // Update local state
      setRules(prev => prev.map(r =>
        r.id === ruleId ? { ...r, is_enabled: enabled } : r
      ));
    } catch (err) {
      console.error('Error toggling rule:', err);
      // Revert optimistic update
      await fetchData();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading rules...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="ml-4"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const systemRules = rules.filter(r => r.is_system_managed);
  const customRules = rules.filter(r => !r.is_system_managed);
  const enabledCount = systemRules.filter(r => r.is_enabled).length;

  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <Sparkles className="w-16 h-16 text-gray-300 dark:text-gray-700 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Rules Yet</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-md mb-4">
          Rules will be automatically created when you sign up or connect your first email account.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-blue-500" />
            Auto-Pilot Rules
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {enabledCount} of {systemRules.length} rules enabled
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Info Alert */}
      {systemRules.length > 0 && (
        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertDescription>
            Auto-Pilot rules use AI to automatically organize your inbox.
            Toggle any rule on or off to customize behavior.
          </AlertDescription>
        </Alert>
      )}

      {/* System-Managed Rules (Grouped by Category) */}
      {systemRules.length > 0 && (
        <RulesListGrouped
          rules={systemRules}
          onToggleRule={handleToggleRule}
        />
      )}

      {/* Custom Rules Section */}
      {customRules.length > 0 && (
        <div className="space-y-4 pt-4 border-t">
          <div>
            <h3 className="text-lg font-semibold">Custom Rules</h3>
            <p className="text-sm text-muted-foreground">
              Rules you've created manually
            </p>
          </div>
          <div className="space-y-2">
            {customRules.map(rule => (
              <div
                key={rule.id}
                className="flex items-center justify-between py-3 px-4 rounded-lg bg-secondary/30"
              >
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{rule.name}</h4>
                  {rule.intent && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {rule.intent}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleRule(rule.id, !rule.is_enabled)}
                >
                  {rule.is_enabled ? 'Disable' : 'Enable'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
