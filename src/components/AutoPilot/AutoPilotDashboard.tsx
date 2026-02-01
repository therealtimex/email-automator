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
import { useLanguage } from '../../context/LanguageContext';

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
  const { t } = useLanguage();
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
      setError(err instanceof Error ? err.message : t('autopilot.loadError'));
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
    if (!confirm(t('autopilot.deleteConfirm'))) return;

    try {
      const success = await actions.deleteRule(ruleId);
      if (success) {
        toast.success(t('autopilot.ruleDeleted'));
        setRules(prev => prev.filter(r => r.id !== ruleId));
      } else {
        toast.error(t('autopilot.ruleDeleteFailed'));
      }
    } catch (err) {
      console.error('Error deleting rule:', err);
      toast.error(t('autopilot.ruleDeleteError'));
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
        toast.success(editingRule ? t('autopilot.ruleUpdated') : t('autopilot.ruleCreated'));
        await fetchData();
        return true;
      } else {
        toast.error(editingRule ? t('autopilot.ruleUpdateFailed') : t('autopilot.ruleCreateFailed'));
        return false;
      }
    } catch (error) {
      console.error('Error saving rule:', error);
      toast.error(t('autopilot.ruleSaveError'));
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

      toast.success(t('autopilot.fileUploaded'));
      return {
        name: file.name,
        path: filePath,
        type: file.type,
        size: file.size
      };
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(t('autopilot.fileUploadFailed'));
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
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('autopilot.loadingRules')}</p>
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
            {t('autopilot.refresh')}
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
        <h3 className="text-lg font-semibold mb-2">{t('autopilot.noRulesTitle')}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-md mb-4">
          {t('autopilot.noRulesDesc')}
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
              {t('autopilot.title')}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {t('autopilot.rulesEnabled').replace('{enabled}', enabledCount.toString()).replace('{total}', systemRules.length.toString())}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleAddRule}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('autopilot.addCustomRule')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {t('autopilot.refresh')}
            </Button>
          </div>
        </div>

        {/* Info Alert */}
        {systemRules.length > 0 && (
          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertDescription>
              {t('autopilot.infoDesc')}
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
              <h3 className="text-lg font-semibold">{t('autopilot.customRules')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('autopilot.customRulesDesc')}
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
