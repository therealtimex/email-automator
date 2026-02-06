/**
 * Rule Edit/Create Dialog Component
 *
 * Reusable modal for creating or editing automation rules
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Clock, Plus, Check, Paperclip, X } from 'lucide-react';
import { LoadingSpinner } from '../LoadingSpinner';
import { useLanguage } from '../../context/LanguageContext';

interface RuleAttachment {
  name: string;
  path: string;
  type: string;
  size: number;
}

interface RuleEditDialogProps {
  open: boolean;
  rule?: any;
  onClose: () => void;
  onSave: (ruleData: any) => Promise<boolean>;
  onFileUpload?: (file: File) => Promise<RuleAttachment | null>;
  onRemoveAttachment?: (path: string) => void;
}

/**
 * Smart parser for negative conditions
 * Accepts plain text or JSON and converts to valid condition object
 */
function smartParseNegativeCondition(input: string): any | null {
  const trimmed = input.trim();
  if (!trimmed) return undefined;

  // Try parsing as JSON first
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    // Not JSON - apply smart conversions
  }

  // Pattern 1: Check if it looks like a category name
  const validCategories = ['newsletter', 'news', 'spam', 'promotional', 'transactional',
                          'social', 'support', 'client', 'internal', 'personal', 'notification', 'other'];
  const lowerInput = trimmed.toLowerCase();

  if (validCategories.includes(lowerInput)) {
    return { category: lowerInput };
  }

  // Pattern 2: Multiple comma-separated categories
  if (trimmed.includes(',')) {
    const items = trimmed.split(',').map(s => s.trim().toLowerCase());
    const matchedCategories = items.filter(item => validCategories.includes(item));

    if (matchedCategories.length > 0) {
      if (matchedCategories.length === 1) {
        return { category: matchedCategories[0] };
      } else {
        return {
          or: matchedCategories.map(cat => ({ category: cat }))
        };
      }
    }
  }

  // Pattern 3: Domain (starts with @ or ends with common TLDs)
  if (trimmed.startsWith('@') || /\.(com|net|org|io|co|ai)$/i.test(trimmed)) {
    const domain = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
    return { sender_domain: domain };
  }

  // Pattern 4: Key-value pair (field=value)
  if (trimmed.includes('=')) {
    const [key, value] = trimmed.split('=').map(s => s.trim());
    if (key && value) {
      // Handle boolean values
      if (value.toLowerCase() === 'true') return { [key]: true };
      if (value.toLowerCase() === 'false') return { [key]: false };
      // Handle numeric values
      if (!isNaN(Number(value))) return { [key]: Number(value) };
      // String value
      return { [key]: value };
    }
  }

  // Pattern 5: Plain text - search in sender or subject
  // User typed something like "Google Alert" - exclude emails with this text
  return {
    or: [
      { sender_contains: trimmed },
      { subject_contains: trimmed }
    ]
  };
}

export function RuleEditDialog({
  open,
  rule,
  onClose,
  onSave,
  onFileUpload,
  onRemoveAttachment
}: RuleEditDialogProps) {
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [intent, setIntent] = useState('');
  const [conditionKey, setConditionKey] = useState('category');
  const [conditionValue, setConditionValue] = useState('newsletter');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['newsletter']);
  const [olderThan, setOlderThan] = useState('');
  const [actions, setActions] = useState<string[]>(['archive']);
  const [instructions, setInstructions] = useState('');
  const [attachments, setAttachments] = useState<RuleAttachment[]>([]);
  const [negativeCondition, setNegativeCondition] = useState('');

  // Initialize form when rule changes
  useEffect(() => {
    if (rule) {
      setName(rule.name || '');
      setDescription(rule.description || '');
      setIntent(rule.intent || '');
      setActions(rule.actions || ['archive']);
      setInstructions(rule.instructions || '');
      setAttachments(rule.attachments || []);

      // Parse condition - handle both simple and complex nested conditions
      const condition = rule.condition || {};

      // Helper to recursively find a specific condition type in nested structure
      const findCondition = (cond: any, targetKey: string): any => {
        if (cond[targetKey]) return cond[targetKey];

        // Check inside 'and' array
        if (cond.and && Array.isArray(cond.and)) {
          for (const subCond of cond.and) {
            const found = findCondition(subCond, targetKey);
            if (found !== undefined) return found;
          }
        }

        // Check inside 'or' array
        if (cond.or && Array.isArray(cond.or)) {
          for (const subCond of cond.or) {
            const found = findCondition(subCond, targetKey);
            if (found !== undefined) return found;
          }
        }

        return undefined;
      };

      // Helper to extract all categories from OR condition
      const extractCategories = (cond: any): string[] => {
        const categories: string[] = [];

        // Direct category
        if (cond.category) {
          categories.push(cond.category);
          return categories;
        }

        // Check inside 'or' array for multiple categories
        if (cond.or && Array.isArray(cond.or)) {
          for (const subCond of cond.or) {
            if (subCond.category) {
              categories.push(subCond.category);
            }
          }
          if (categories.length > 0) return categories;
        }

        // Check inside 'and' array
        if (cond.and && Array.isArray(cond.and)) {
          for (const subCond of cond.and) {
            const found = extractCategories(subCond);
            if (found.length > 0) return found;
          }
        }

        return categories;
      };

      // Try to find categories first (special handling for multi-select)
      const categories = extractCategories(condition);
      if (categories.length > 0) {
        setConditionKey('category');
        setSelectedCategories(categories);
        setConditionValue(categories[0]); // Keep for backward compatibility
      } else {
        // Try to find other simple condition fields
        const simpleKeys = ['sentiment', 'priority', 'sender_email', 'sender_domain',
                            'sender_contains', 'subject_contains', 'body_contains'];
        let foundKey = null;
        let foundValue = null;

        for (const key of simpleKeys) {
          const value = findCondition(condition, key);
          if (value !== undefined) {
            foundKey = key;
            foundValue = value;
            break;
          }
        }

        if (foundKey && foundValue !== null) {
          setConditionKey(foundKey);
          setConditionValue(foundValue);
          setSelectedCategories(['newsletter']); // Reset categories
        } else {
          // Fallback to simple parsing if no nested structure
          const keys = Object.keys(condition).filter(k =>
            k !== 'older_than_days' && k !== 'and' && k !== 'or' && k !== 'not' && k !== 'confidence_gt'
          );
          if (keys.length > 0) {
            setConditionKey(keys[0]);
            setConditionValue(condition[keys[0]]);
          }
          setSelectedCategories(['newsletter']); // Reset categories
        }
      }

      // Find older_than_days anywhere in the nested structure
      const olderThanValue = findCondition(condition, 'older_than_days');
      if (olderThanValue !== undefined) {
        setOlderThan(String(olderThanValue));
      } else {
        setOlderThan('');
      }

      // Load negative condition (if exists)
      if (rule.negative_condition) {
        setNegativeCondition(JSON.stringify(rule.negative_condition, null, 2));
      } else {
        setNegativeCondition('');
      }
    } else {
      // Reset for new rule
      setName('');
      setDescription('');
      setIntent('');
      setConditionKey('category');
      setConditionValue('newsletter');
      setSelectedCategories(['newsletter']);
      setOlderThan('');
      setActions(['archive']);
      setInstructions('');
      setAttachments([]);
      setNegativeCondition('');
    }
  }, [rule, open]);

  const handleSave = async () => {
    if (!name.trim()) {
      return;
    }

    if (actions.length === 0) {
      return;
    }

    setSaving(true);
    try {
      // Build condition based on field type
      let condition: Record<string, any>;

      if (conditionKey === 'category') {
        // Multi-category support
        if (selectedCategories.length === 1) {
          // Single category: simple condition
          condition = { category: selectedCategories[0] };
        } else if (selectedCategories.length > 1) {
          // Multiple categories: OR condition
          condition = {
            or: selectedCategories.map(cat => ({ category: cat }))
          };
        } else {
          // No categories selected, use default
          condition = { category: 'newsletter' };
        }

        // Wrap with AND if we have older_than_days
        if (olderThan) {
          const olderThanDays = parseInt(olderThan, 10);
          if (selectedCategories.length === 1) {
            condition.older_than_days = olderThanDays;
          } else {
            condition = {
              and: [
                condition,
                { older_than_days: olderThanDays }
              ]
            };
          }
        }
      } else {
        // Other condition types (sentiment, priority, etc.)
        condition = { [conditionKey]: conditionValue };
        if (olderThan) {
          condition.older_than_days = parseInt(olderThan, 10);
        }
      }

      const hasDraftAction = actions.includes('draft');

      // Smart parse negative condition if provided
      let parsedNegativeCondition = undefined;
      if (negativeCondition.trim()) {
        parsedNegativeCondition = smartParseNegativeCondition(negativeCondition.trim());
        if (parsedNegativeCondition === null) {
          alert('Could not parse negative condition. Please check the input.');
          return;
        }
      }

      const ruleData = {
        name: name.trim(),
        description: description.trim() || undefined,
        intent: intent.trim() || undefined,
        condition,
        negative_condition: parsedNegativeCondition,
        actions,
        instructions: hasDraftAction ? instructions : undefined,
        attachments: hasDraftAction ? attachments : [],
        is_enabled: true
      };

      const success = await onSave(ruleData);
      if (success) {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onFileUpload) return;

    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const attachment = await onFileUpload(files[0]);
      if (attachment) {
        setAttachments(prev => [...prev, attachment]);
      }
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeAttachment = (path: string) => {
    setAttachments(prev => prev.filter(a => a.path !== path));
    if (onRemoveAttachment) {
      onRemoveAttachment(path);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 border-b">
          <DialogTitle>{rule ? t('autopilot.editDialog.editTitle') : t('autopilot.editDialog.createTitle')}</DialogTitle>
          <DialogDescription>
            {t('autopilot.editDialog.desc')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('autopilot.editDialog.ruleName')}</label>
            <Input
              placeholder={t('autopilot.editDialog.namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('autopilot.editDialog.description')}</label>
            <textarea
              className="w-full p-2 border rounded-md bg-background min-h-[60px] text-sm"
              placeholder={t('autopilot.editDialog.descPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">
              {t('autopilot.editDialog.descriptionHelp')}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('autopilot.editDialog.intent')}</label>
            <Input
              placeholder={t('autopilot.editDialog.intentPlaceholder')}
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">
              {t('autopilot.editDialog.intentHelp')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('autopilot.editDialog.conditionField')}</label>
              <select
                className="w-full p-2 border rounded-md bg-background text-sm"
                value={conditionKey}
                onChange={(e) => {
                  setConditionKey(e.target.value);
                  if (e.target.value === 'category') {
                    setSelectedCategories(['newsletter']);
                    setConditionValue('newsletter');
                  } else if (e.target.value === 'sentiment') {
                    setConditionValue('Positive');
                  } else if (e.target.value === 'priority') {
                    setConditionValue('High');
                  } else {
                    setConditionValue('');
                  }
                }}
              >
                <optgroup label={t('autopilot.editDialog.aiAnalysisGroup')}>
                  <option value="category">{t('autopilot.editDialog.category')}</option>
                  <option value="sentiment">{t('autopilot.editDialog.sentiment')}</option>
                  <option value="priority">{t('autopilot.editDialog.priority')}</option>
                </optgroup>
                <optgroup label={t('autopilot.editDialog.metadataGroup')}>
                  <option value="sender_email">{t('autopilot.editDialog.senderEmail')}</option>
                  <option value="sender_domain">{t('autopilot.editDialog.senderDomain')}</option>
                  <option value="sender_contains">{t('autopilot.editDialog.senderContains')}</option>
                  <option value="subject_contains">{t('autopilot.editDialog.subjectContains')}</option>
                  <option value="body_contains">{t('autopilot.editDialog.bodyContains')}</option>
                </optgroup>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {conditionKey === 'category' ? t('autopilot.editDialog.selectCategories') : t('autopilot.editDialog.equalsValue')}
              </label>
              {conditionKey === 'category' ? (
                <div className="grid grid-cols-2 gap-2 p-3 border rounded-md bg-background">
                  {[
                    { value: 'newsletter', label: t('autopilot.editDialog.cat.newsletter') },
                    { value: 'news', label: t('autopilot.editDialog.cat.news') },
                    { value: 'spam', label: t('autopilot.editDialog.cat.spam') },
                    { value: 'promotional', label: t('autopilot.editDialog.cat.promotional') },
                    { value: 'transactional', label: t('autopilot.editDialog.cat.transactional') },
                    { value: 'social', label: t('autopilot.editDialog.cat.social') },
                    { value: 'support', label: t('autopilot.editDialog.cat.support') },
                    { value: 'client', label: t('autopilot.editDialog.cat.client') },
                    { value: 'internal', label: t('autopilot.editDialog.cat.internal') },
                    { value: 'personal', label: t('autopilot.editDialog.cat.personal') },
                    { value: 'notification', label: t('autopilot.editDialog.cat.notification') || 'Notification' },
                    { value: 'other', label: t('autopilot.editDialog.cat.other') },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center gap-2 p-2 border rounded-md cursor-pointer transition-colors text-sm ${
                        selectedCategories.includes(option.value)
                          ? 'bg-primary/10 border-primary'
                          : 'bg-background hover:bg-secondary/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(option.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCategories([...selectedCategories, option.value]);
                          } else {
                            setSelectedCategories(selectedCategories.filter(c => c !== option.value));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              ) : conditionKey === 'sentiment' ? (
                <select
                  className="w-full p-2 border rounded-md bg-background text-sm"
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                >
                  <option value="Positive">{t('autopilot.editDialog.sent.positive')}</option>
                  <option value="Neutral">{t('autopilot.editDialog.sent.neutral')}</option>
                  <option value="Negative">{t('autopilot.editDialog.sent.negative')}</option>
                </select>
              ) : conditionKey === 'priority' ? (
                <select
                  className="w-full p-2 border rounded-md bg-background text-sm"
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                >
                  <option value="High">{t('autopilot.editDialog.prio.high')}</option>
                  <option value="Medium">{t('autopilot.editDialog.prio.medium')}</option>
                  <option value="Low">{t('autopilot.editDialog.prio.low')}</option>
                </select>
              ) : (
                <Input
                  placeholder={
                    conditionKey === 'sender_domain' ? 'rta.vn' :
                      conditionKey === 'sender_email' ? 'john@example.com' :
                        t('autopilot.editDialog.keywordsPlaceholder')
                  }
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {t('autopilot.editDialog.olderThan')}
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                placeholder="0"
                className="w-24"
                value={olderThan}
                onChange={(e) => setOlderThan(e.target.value)}
              />
              <span className="text-sm text-muted-foreground">{t('autopilot.editDialog.days')}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {t('autopilot.editDialog.olderThanHelp')}
            </p>
          </div>

          <div className="space-y-2 border-t pt-4">
            <label className="text-sm font-medium flex items-center gap-2">
              <span>Exclude When (Optional)</span>
              <span className="text-xs font-normal text-muted-foreground">Advanced</span>
            </label>
            <textarea
              className="w-full p-3 border rounded-md bg-background min-h-[100px] text-xs font-mono custom-scrollbar"
              placeholder="Google Alert\nnewsletter\n@googlealerts.com\nis_automated=true"
              value={negativeCondition}
              onChange={(e) => setNegativeCondition(e.target.value)}
            />
            <div className="text-[10px] text-muted-foreground space-y-1">
              <p className="font-medium">💡 Smart input - use plain text or JSON:</p>
              <div className="grid grid-cols-2 gap-2 pl-2">
                <div>
                  <p className="text-[9px] opacity-70 mb-0.5">Plain text:</p>
                  <code className="bg-secondary/50 px-1 py-0.5 rounded block">Google Alert</code>
                  <code className="bg-secondary/50 px-1 py-0.5 rounded block mt-0.5">newsletter</code>
                  <code className="bg-secondary/50 px-1 py-0.5 rounded block mt-0.5">@googlealerts.com</code>
                </div>
                <div>
                  <p className="text-[9px] opacity-70 mb-0.5">JSON (advanced):</p>
                  <code className="bg-secondary/50 px-1 py-0.5 rounded block">{'{ "is_automated": true }'}</code>
                  <code className="bg-secondary/50 px-1 py-0.5 rounded block mt-0.5">{'{ "category": "news" }'}</code>
                  <code className="bg-secondary/50 px-1 py-0.5 rounded block mt-0.5">{'{ "or": [...] }'}</code>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('autopilot.editDialog.performActions')}</label>
            <p className="text-xs text-muted-foreground mb-2">
              {t('autopilot.editDialog.actionsDesc')}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'archive', label: t('autopilot.editDialog.action.archive') },
                { value: 'delete', label: t('autopilot.editDialog.action.delete') },
                { value: 'draft', label: t('autopilot.editDialog.action.draft') },
                { value: 'star', label: t('autopilot.editDialog.action.star') },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center gap-2 p-2 border rounded-md cursor-pointer transition-colors ${actions.includes(option.value)
                      ? 'bg-primary/10 border-primary'
                      : 'bg-background hover:bg-secondary/50'
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={actions.includes(option.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setActions([...actions, option.value]);
                      } else {
                        setActions(actions.filter(a => a !== option.value));
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {actions.includes('draft') && (
            <>
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                <label className="text-sm font-medium">{t('autopilot.editDialog.draftInstructions')}</label>
                <textarea
                  className="w-full p-2 border rounded-md bg-background min-h-[80px] text-sm"
                  placeholder={t('autopilot.editDialog.draftInstPlaceholder')}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground">
                  {t('autopilot.editDialog.draftInstHelp')}
                </p>
              </div>

              {onFileUpload && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    {t('autopilot.editDialog.attachments')}
                  </label>

                  <div className="flex flex-col gap-2">
                    {attachments.map(file => (
                      <div key={file.path} className="flex items-center justify-between p-2 bg-secondary/50 rounded border text-xs">
                        <span className="truncate max-w-[200px]">{file.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-destructive"
                          onClick={() => removeAttachment(file.path)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}

                    <div className="relative">
                      <input
                        type="file"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-dashed"
                        disabled={uploading}
                      >
                        {uploading ? (
                          <LoadingSpinner size="sm" className="mr-2" />
                        ) : (
                          <Plus className="w-3 h-3 mr-2" />
                        )}
                        {uploading ? t('autopilot.editDialog.uploading') : t('autopilot.editDialog.addAttachment')}
                      </Button>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {t('autopilot.editDialog.attachmentsHelp')}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="p-6 border-t bg-secondary/5">
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim() || actions.length === 0}>
            {saving ? (
              <LoadingSpinner size="sm" className="mr-2" />
            ) : rule ? (
              <Check className="w-4 h-4 mr-2" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            {rule ? t('common.saveChanges') : t('autopilot.addCustomRule')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
