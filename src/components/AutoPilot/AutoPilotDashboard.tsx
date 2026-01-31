/**
 * Auto-Pilot Dashboard Component
 *
 * Simplified dashboard showing all rules organized by category
 */

import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { RefreshCw, AlertCircle, Sparkles, Plus } from 'lucide-react';
import { RulesListGrouped } from './RulesListGrouped';
import { RuleEditDialog } from './RuleEditDialog';
import { api } from '../../lib/api';
import { toast } from '../Toast';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';

interface Rule {
  id: string;
  name: string;
  description?: string;
  intent?: string;
  condition?: any;
  actions?: string[];
  instructions?: string;
  attachments?: RuleAttachment[];
  is_enabled: boolean;
  is_system_managed?: boolean;
  category?: string;
}

interface RuleAttachment {
  name: string;
  path: string;
  type: string;
  size: number;
}

export function AutoPilotDashboard() {
  const { state, actions } = useApp();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);

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

  const handleEditRule = (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (rule) {
      setEditingRule(rule);
      setShowRuleModal(true);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      const success = await actions.deleteRule(ruleId);
      if (success) {
        toast.success('Rule deleted');
        setRules(prev => prev.filter(r => r.id !== ruleId));
      } else {
        toast.error('Failed to delete rule');
      }
    } catch (err) {
      console.error('Error deleting rule:', err);
      toast.error('An error occurred while deleting the rule');
    }
  };

  const handleAddRule = () => {
    setEditingRule(null);
    setShowRuleModal(true);
  };

  const handleSaveRule = async (ruleData: any) => {
    try {
      let success = false;
      if (editingRule) {
        success = await actions.updateRule(editingRule.id, ruleData);
      } else {
        success = await actions.createRule(ruleData);
      }

      if (success) {
        toast.success(editingRule ? 'Rule updated' : 'Rule created');
        await fetchData();
        return true;
      } else {
        toast.error(`Failed to ${editingRule ? 'update' : 'create'} rule`);
        return false;
      }
    } catch (error) {
      console.error('Error saving rule:', error);
      toast.error('An error occurred while saving the rule');
      return false;
    }
  };

  const handleFileUpload = async (file: File): Promise<RuleAttachment | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${state.user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('rule-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      toast.success('File uploaded');
      return {
        name: file.name,
        path: filePath,
        type: file.type,
        size: file.size
      };
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
      return null;
    }
  };

  const handleCloseModal = () => {
    setShowRuleModal(false);
    setEditingRule(null);
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
    <>
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
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleAddRule}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Custom Rule
            </Button>
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
          onEditRule={handleEditRule}
          onDeleteRule={handleDeleteRule}
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
          <RulesListGrouped
            rules={customRules}
            onToggleRule={handleToggleRule}
            onEditRule={handleEditRule}
            onDeleteRule={handleDeleteRule}
          />
        </div>
      )}
      </div>

      {/* Rule Edit/Create Dialog */}
      <RuleEditDialog
        open={showRuleModal}
        rule={editingRule}
        onClose={handleCloseModal}
        onSave={handleSaveRule}
        onFileUpload={handleFileUpload}
      />
    </>
  );
}
