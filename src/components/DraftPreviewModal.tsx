import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { X, Send, Edit, RefreshCw, Mail, User, Calendar, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Email } from '../lib/types';
import { toast } from './Toast';
import { cn } from '../lib/utils';

interface DraftPreviewModalProps {
    email: Email;
    onClose: () => void;
    onSend: (emailId: string) => Promise<void>;
    onDismiss: (emailId: string) => Promise<void>;
}

export function DraftPreviewModal({ email, onClose, onSend, onDismiss }: DraftPreviewModalProps) {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [regenerateInstructions, setRegenerateInstructions] = useState('');
    const [showRegenerateForm, setShowRegenerateForm] = useState(false);

    const draftContent = email.draft_content || email.ai_analysis?.draft_response || '';
    const originalBody = email.body_snippet || '';

    const handleSend = async () => {
        setLoading(true);
        try {
            await onSend(email.id);
            onClose();
        } catch (error) {
            console.error('Failed to send:', error);
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

    const handleRegenerate = async () => {
        if (!regenerateInstructions.trim()) {
            toast.error('Please provide instructions for regeneration');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`/api/v1/drafts/${email.id}/regenerate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`,
                },
                body: JSON.stringify({ instructions: regenerateInstructions }),
            });

            if (!response.ok) {
                throw new Error('Failed to regenerate draft');
            }

            toast.success('Draft regeneration queued');
            setShowRegenerateForm(false);
            setRegenerateInstructions('');
        } catch (error) {
            console.error('Failed to regenerate:', error);
            toast.error('Failed to regenerate draft');
        } finally {
            setLoading(false);
        }
    };

    const handleEditInProvider = () => {
        if (!email.email_accounts) return;

        const { provider, email_address } = email.email_accounts;

        if (provider === 'gmail') {
            // Open Gmail drafts
            window.open(`https://mail.google.com/mail/u/${email_address}/#drafts`, '_blank');
        } else {
            // Open Outlook drafts
            window.open('https://outlook.office.com/mail/drafts', '_blank');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Mail className="w-5 h-5 text-primary" />
                        {t('drafts.preview') || 'Draft Preview'}
                    </h2>
                    <Button onClick={onClose} variant="ghost" size="sm">
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Original Email */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                            {t('drafts.originalEmail') || 'Original Email'}
                        </h3>
                        <Card className="p-4 bg-muted/30">
                            <div className="space-y-2 text-sm">
                                <div className="flex items-start gap-2">
                                    <User className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                                    <div>
                                        <span className="font-medium">From:</span> {email.sender}
                                    </div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Mail className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                                    <div>
                                        <span className="font-medium">Subject:</span> {email.subject || t('dashboard.noSubject')}
                                    </div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Calendar className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                                    <div>
                                        <span className="font-medium">Date:</span>{' '}
                                        {email.date ? new Date(email.date).toLocaleString() : '-'}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t">
                                <p className="text-sm whitespace-pre-wrap">{originalBody}</p>
                            </div>
                        </Card>
                    </div>

                    {/* AI-Generated Reply */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                            {t('drafts.aiReply') || 'AI-Generated Reply'}
                        </h3>
                        <Card className="p-4 bg-primary/5 border-primary/20">
                            <div className="prose prose-sm max-w-none">
                                <p className="text-sm whitespace-pre-wrap">{draftContent}</p>
                            </div>
                        </Card>
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
                        <Button
                            onClick={handleEditInProvider}
                            variant="outline"
                            className="gap-2"
                        >
                            <Edit className="w-4 h-4" />
                            Edit in {email.email_accounts?.provider === 'gmail' ? 'Gmail' : 'Outlook'}
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
        </div>
    );
}
