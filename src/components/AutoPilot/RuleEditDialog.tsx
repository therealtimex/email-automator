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

export function RuleEditDialog({
  open,
  rule,
  onClose,
  onSave,
  onFileUpload,
  onRemoveAttachment
}: RuleEditDialogProps) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [intent, setIntent] = useState('');
  const [conditionKey, setConditionKey] = useState('category');
  const [conditionValue, setConditionValue] = useState('newsletter');
  const [olderThan, setOlderThan] = useState('');
  const [actions, setActions] = useState<string[]>(['archive']);
  const [instructions, setInstructions] = useState('');
  const [attachments, setAttachments] = useState<RuleAttachment[]>([]);

  // Initialize form when rule changes
  useEffect(() => {
    if (rule) {
      setName(rule.name || '');
      setDescription(rule.description || '');
      setIntent(rule.intent || '');
      setActions(rule.actions || ['archive']);
      setInstructions(rule.instructions || '');
      setAttachments(rule.attachments || []);

      // Parse condition
      const condition = rule.condition || {};
      const keys = Object.keys(condition).filter(k => k !== 'older_than_days');
      if (keys.length > 0) {
        setConditionKey(keys[0]);
        setConditionValue(condition[keys[0]]);
      }
      if (condition.older_than_days) {
        setOlderThan(String(condition.older_than_days));
      }
    } else {
      // Reset for new rule
      setName('');
      setDescription('');
      setIntent('');
      setConditionKey('category');
      setConditionValue('newsletter');
      setOlderThan('');
      setActions(['archive']);
      setInstructions('');
      setAttachments([]);
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
      const condition: Record<string, any> = { [conditionKey]: conditionValue };
      if (olderThan) {
        condition.older_than_days = parseInt(olderThan, 10);
      }

      const hasDraftAction = actions.includes('draft');

      const ruleData = {
        name: name.trim(),
        description: description.trim() || undefined,
        intent: intent.trim() || undefined,
        condition,
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
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 border-b">
          <DialogTitle>{rule ? 'Edit Rule' : 'Create Custom Rule'}</DialogTitle>
          <DialogDescription>
            Define a condition based on AI analysis to trigger an action.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          <div className="space-y-2">
            <label className="text-sm font-medium">Rule Name</label>
            <Input
              placeholder="e.g. Archive Newsletters"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              className="w-full p-2 border rounded-md bg-background min-h-[60px] text-sm"
              placeholder="e.g. Handle all marketing newsletters and promotional content from subscription services"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">
              Describe what this rule is for. The AI uses this to semantically match emails.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Intent</label>
            <Input
              placeholder="e.g. Politely decline all sales pitches"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">
              The goal of this rule. Used to generate appropriate draft replies.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">If Condition Field</label>
              <select
                className="w-full p-2 border rounded-md bg-background text-sm"
                value={conditionKey}
                onChange={(e) => {
                  setConditionKey(e.target.value);
                  if (e.target.value === 'category') setConditionValue('newsletter');
                  else if (e.target.value === 'sentiment') setConditionValue('Positive');
                  else if (e.target.value === 'priority') setConditionValue('High');
                  else setConditionValue('');
                }}
              >
                <optgroup label="AI Analysis">
                  <option value="category">Category</option>
                  <option value="sentiment">Sentiment</option>
                  <option value="priority">Priority</option>
                </optgroup>
                <optgroup label="Metadata">
                  <option value="sender_email">Specific Email (Exact)</option>
                  <option value="sender_domain">Email Domain (@...)</option>
                  <option value="sender_contains">Sender contains...</option>
                  <option value="subject_contains">Subject contains...</option>
                  <option value="body_contains">Body contains...</option>
                </optgroup>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Equals Value</label>
              {conditionKey === 'category' ? (
                <select
                  className="w-full p-2 border rounded-md bg-background text-sm"
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                >
                  <option value="newsletter">Newsletter</option>
                  <option value="spam">Spam</option>
                  <option value="promotional">Promotional</option>
                  <option value="transactional">Transactional</option>
                  <option value="social">Social</option>
                  <option value="support">Support</option>
                  <option value="client">Client</option>
                  <option value="internal">Internal</option>
                  <option value="personal">Personal</option>
                  <option value="other">Other</option>
                </select>
              ) : conditionKey === 'sentiment' ? (
                <select
                  className="w-full p-2 border rounded-md bg-background text-sm"
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                >
                  <option value="Positive">Positive</option>
                  <option value="Neutral">Neutral</option>
                  <option value="Negative">Negative</option>
                </select>
              ) : conditionKey === 'priority' ? (
                <select
                  className="w-full p-2 border rounded-md bg-background text-sm"
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              ) : (
                <Input
                  placeholder={
                    conditionKey === 'sender_domain' ? 'rta.vn' :
                    conditionKey === 'sender_email' ? 'john@example.com' :
                    'Keywords...'
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
              Only if email is older than... (Optional)
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
              <span className="text-sm text-muted-foreground">days</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Leave empty or 0 to apply rule immediately upon receipt.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Then Perform Action(s)</label>
            <p className="text-xs text-muted-foreground mb-2">
              Select one or more actions to execute when the rule matches
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'archive', label: 'Archive Email' },
                { value: 'delete', label: 'Delete Email' },
                { value: 'draft', label: 'Draft Reply' },
                { value: 'star', label: 'Star / Flag' },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center gap-2 p-2 border rounded-md cursor-pointer transition-colors ${
                    actions.includes(option.value)
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
                <label className="text-sm font-medium">Draft Instructions (Context)</label>
                <textarea
                  className="w-full p-2 border rounded-md bg-background min-h-[80px] text-sm"
                  placeholder="e.g. Tell them I'm busy until Friday, but interested in the proposal."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground">
                  Specific context for the AI ghostwriter.
                </p>
              </div>

              {onFileUpload && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    Attachments (Optional)
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
                        {uploading ? 'Uploading...' : 'Add Attachment'}
                      </Button>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Files will be attached to every draft generated by this rule.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="p-6 border-t bg-secondary/5">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim() || actions.length === 0}>
            {saving ? (
              <LoadingSpinner size="sm" className="mr-2" />
            ) : rule ? (
              <Check className="w-4 h-4 mr-2" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            {rule ? 'Save Changes' : 'Create Rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
