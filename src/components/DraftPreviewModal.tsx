import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { X, Send, RefreshCw, Mail, User, Calendar, Loader2, MessageSquare, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Email } from '../lib/types';
import { toast } from './Toast';
import { cn } from '../lib/utils';
import { api } from '../lib/api';
import { FeedbackModal } from './Feedback/FeedbackModal';
import MarkdownEditor from './ui/markdown-editor';

interface DraftPreviewModalProps {
    email: Email;
    onClose: () => void;
    onSend: (emailId: string) => Promise<void>;
    onDismiss: (emailId: string) => Promise<void>;
}

// Helper to extract email address from "Name <email>" format
const extractEmail = (sender: string): string => {
    const match = sender?.match(/<([^>]+)>/) || sender?.match(/([^\s,<>]+@[^\s,<>]+)/);
    return match?.[1] || sender || '';
};

export function DraftPreviewModal({ email, onClose, onSend, onDismiss }: DraftPreviewModalProps) {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [regenerateInstructions, setRegenerateInstructions] = useState('');
    const [showRegenerateForm, setShowRegenerateForm] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);

    // Resolve content from all three sources (same priority as route + card)
    const resolvedContent = email.draft_content
        || (email.ai_analysis as any)?.draft_response
        || (email.ai_analysis as any)?.draft_content
        || '';

    const [editedContent, setEditedContent] = useState(resolvedContent);
    const [isDirty, setIsDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Email compose fields
    const defaultSubject = email.subject?.toLowerCase().startsWith('re:')
        ? email.subject
        : `Re: ${email.subject || ''}`;

    const [to, setTo] = useState(extractEmail(email.sender || ''));
    const [cc, setCc] = useState('');
    const [bcc, setBcc] = useState('');
    const [subject, setSubject] = useState(defaultSubject);
    const [showOriginal, setShowOriginal] = useState(false);

    const originalBody = email.body_snippet || '';

    // Auto-save after 2 seconds of no typing
    useEffect(() => {
        if (isDirty) {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
            saveTimeoutRef.current = setTimeout(() => {
                handleSaveDraft();
            }, 2000);
        }
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [isDirty, editedContent]);


    const handleSend = async () => {
        // Validate recipient
        if (!to.trim()) {
            toast.error('Please enter a recipient email address');
            return;
        }

        setLoading(true);
        try {
            // Flush any unsaved edits before sending
            if (isDirty) {
                await handleSaveDraft();
            }

            // Send draft with custom compose fields
            const res = await api.sendDraft(email.id, {
                to: to.trim(),
                cc: cc.trim() || undefined,
                bcc: bcc.trim() || undefined,
                subject: subject.trim()
            });

            if (res.data?.success) {
                toast.success('Email sent successfully');
                onClose();
                // Trigger parent refresh
                await onSend(email.id);
            } else {
                toast.error('Failed to send email');
            }
        } catch (error) {
            console.error('Failed to send:', error);
            toast.error('Failed to send email');
        } finally {
            setLoading(false);
        }
    };

    const handleDismiss = async () => {
        setLoading(true);
        try {
            await onDismiss(email.id);
            onClose();
        } catch (error) {
            console.error('Failed to dismiss:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveDraft = async () => {
        if (!isDirty) return;
        setSaving(true);
        try {
            const res = await api.updateDraft(email.id, editedContent);
            if (res.data?.success) {
                setIsDirty(false);
                toast.success('Draft saved');
            } else {
                toast.error('Failed to save draft');
            }
        } catch {
            toast.error('Failed to save draft');
        } finally {
            setSaving(false);
        }
    };

    const handleRegenerate = async () => {
        if (!regenerateInstructions.trim()) {
            toast.error('Please provide instructions for regeneration');
            return;
        }

        setLoading(true);
        try {
            const res = await api.regenerateDraft(email.id, regenerateInstructions);
            if (res.data?.draft_content) {
                setEditedContent(res.data.draft_content);
                setIsDirty(false);
                toast.success('Draft regenerated');
            } else {
                toast.error('Failed to regenerate draft');
            }
            setShowRegenerateForm(false);
            setRegenerateInstructions('');
        } catch {
            toast.error('Failed to regenerate draft');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Mail className="w-5 h-5 text-primary" />
                        {t('drafts.compose') || 'Compose Draft'}
                    </h2>
                    <Button onClick={onClose} variant="ghost" size="sm">
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Compose Email Fields */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                            {t('drafts.compose') || 'Compose Email'}
                        </h3>
                        <Card className="p-4 space-y-3">
                            {/* To */}
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-muted-foreground w-12 flex-shrink-0">
                                    To:
                                </label>
                                <input
                                    type="email"
                                    value={to}
                                    onChange={(e) => setTo(e.target.value)}
                                    className="flex-1 px-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                    placeholder="recipient@example.com"
                                />
                            </div>

                            {/* CC */}
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-muted-foreground w-12 flex-shrink-0">
                                    CC:
                                </label>
                                <input
                                    type="email"
                                    value={cc}
                                    onChange={(e) => setCc(e.target.value)}
                                    className="flex-1 px-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                    placeholder="Optional"
                                />
                            </div>

                            {/* BCC */}
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-muted-foreground w-12 flex-shrink-0">
                                    BCC:
                                </label>
                                <input
                                    type="email"
                                    value={bcc}
                                    onChange={(e) => setBcc(e.target.value)}
                                    className="flex-1 px-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                    placeholder="Optional"
                                />
                            </div>

                            {/* Subject */}
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-muted-foreground w-12 flex-shrink-0">
                                    Subject:
                                </label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="flex-1 px-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                    placeholder="Email subject"
                                />
                            </div>

                            {/* Show Original Message Toggle */}
                            <button
                                type="button"
                                onClick={() => setShowOriginal(!showOriginal)}
                                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mt-2"
                            >
                                {showOriginal ? (
                                    <ChevronDown className="w-3 h-3" />
                                ) : (
                                    <ChevronRight className="w-3 h-3" />
                                )}
                                Show original message
                            </button>

                            {/* Original Message (Collapsible) */}
                            {showOriginal && (
                                <div className="mt-3 pt-3 border-t space-y-2">
                                    <div className="flex items-start gap-2 text-xs">
                                        <User className="w-3 h-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                                        <div className="text-muted-foreground">
                                            <span className="font-medium">From:</span> {email.sender}
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2 text-xs">
                                        <Calendar className="w-3 h-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                                        <div className="text-muted-foreground">
                                            <span className="font-medium">Date:</span>{' '}
                                            {email.date ? new Date(email.date).toLocaleString() : '-'}
                                        </div>
                                    </div>
                                    <div className="mt-2 pt-2 border-t">
                                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{originalBody}</p>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* AI-Generated Reply — inline editable with markdown */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                {t('drafts.aiReply') || 'AI-Generated Reply'}
                            </h3>
                            {isDirty && (
                                <span className={cn(
                                    'text-xs',
                                    saving ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-400'
                                )}>
                                    {saving ? 'Saving…' : 'Unsaved changes'}
                                </span>
                            )}
                        </div>
                        <MarkdownEditor
                            value={editedContent}
                            onChange={(value) => {
                                setEditedContent(value);
                                setIsDirty(true);
                            }}
                            placeholder={t('drafts.editPlaceholder') || 'Write your reply in Markdown...'}
                            minHeight="300px"
                            disabled={loading || saving}
                        />
                    </div>

                    {/* Metadata */}
                    <div className="text-xs text-muted-foreground">
                        {email.draft_created_at && (
                            <p>
                                Created {new Date(email.draft_created_at).toLocaleString()}
                            </p>
                        )}
                    </div>

                    {/* Regenerate Form */}
                    {showRegenerateForm && (
                        <Card className="p-4 bg-muted/30">
                            <h4 className="text-sm font-semibold mb-3">
                                {t('drafts.regenerate') || 'Regenerate Draft'}
                            </h4>
                            <textarea
                                value={regenerateInstructions}
                                onChange={(e) => setRegenerateInstructions(e.target.value)}
                                placeholder="Provide new instructions (e.g., 'Make it more formal', 'Add a specific deadline')"
                                className="w-full px-3 py-2 rounded-md border bg-background text-sm min-h-[100px]"
                            />
                            <div className="flex items-center gap-2 mt-3">
                                <Button
                                    onClick={handleRegenerate}
                                    disabled={loading || !regenerateInstructions.trim()}
                                    size="sm"
                                >
                                    {loading ? (
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    ) : (
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                    )}
                                    Regenerate
                                </Button>
                                <Button
                                    onClick={() => setShowRegenerateForm(false)}
                                    variant="ghost"
                                    size="sm"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </Card>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-4 p-6 border-t bg-muted/30">
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handleSend}
                            disabled={loading}
                            className="gap-2"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                            {t('drafts.send') || 'Send Now'}
                        </Button>
                        {!showRegenerateForm && (
                            <Button
                                onClick={() => setShowRegenerateForm(true)}
                                variant="outline"
                                className="gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                {t('drafts.regenerate') || 'Regenerate'}
                            </Button>
                        )}
                        <Button
                            onClick={() => setShowFeedback(true)}
                            variant="ghost"
                            className="gap-2 text-muted-foreground hover:text-foreground"
                            title="Report issues with this draft"
                        >
                            <MessageSquare className="w-4 h-4" />
                            {t('drafts.feedback') || "What's wrong?"}
                        </Button>
                    </div>
                    <Button
                        onClick={handleDismiss}
                        disabled={loading}
                        variant="ghost"
                        className="gap-2"
                    >
                        <X className="w-4 h-4" />
                        {t('drafts.dismiss') || 'Dismiss'}
                    </Button>
                </div>
            </Card>

            {showFeedback && (
                <FeedbackModal
                    email={email}
                    isOpen={showFeedback}
                    onClose={() => setShowFeedback(false)}
                    defaultType="draft"
                />
            )}
        </div>
    );
}
