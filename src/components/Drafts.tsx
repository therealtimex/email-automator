import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Mail, Send, Eye, X, RefreshCw, Loader2, CheckCircle2, XCircle, Clock, Filter } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Email, EmailAccount } from '../lib/types';
import { api } from '../lib/api';
import { toast } from './Toast';
import { LoadingSpinner } from './LoadingSpinner';
import { cn } from '../lib/utils';

interface DraftsProps {
    onPreview: (email: Email) => void;
}

export function Drafts({ onPreview }: DraftsProps) {
    const { t } = useLanguage();
    const [drafts, setDrafts] = useState<Email[]>([]);
    const [accounts, setAccounts] = useState<EmailAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDrafts, setSelectedDrafts] = useState<Set<string>>(new Set());
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Filters
    const [filterAccount, setFilterAccount] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<'pending' | 'sent' | 'dismissed'>('pending');

    useEffect(() => {
        fetchDrafts();
        fetchAccounts();
    }, [filterAccount, filterStatus]);

    const fetchAccounts = async () => {
        try {
            const response = await api.getAccounts();
            if (response.data) {
                setAccounts(response.data.accounts);
            }
        } catch (error) {
            console.error('Failed to fetch accounts:', error);
        }
    };

    const fetchDrafts = async () => {
        setLoading(true);
        try {
            const response = await api.getDrafts({
                status: filterStatus,
                limit: 100,
                account_id: filterAccount
            });

            if (response.error) {
                throw new Error(typeof response.error === 'string' ? response.error : response.error.message);
            }

            setDrafts(response.data?.drafts || []);
        } catch (error) {
            console.error('Failed to fetch drafts:', error);
            toast.error(t('drafts.loadError') || 'Failed to load drafts');
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async (emailId: string) => {
        setActionLoading(emailId);
        try {
            const response = await api.sendDraft(emailId);

            if (response.error) {
                throw new Error(typeof response.error === 'string' ? response.error : response.error.message);
            }

            toast.success(t('drafts.sendSuccess') || 'Draft sent successfully!');
            fetchDrafts(); // Refresh list
        } catch (error) {
            console.error('Failed to send draft:', error);
            toast.error(t('drafts.sendError') || 'Failed to send draft');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDismiss = async (emailId: string) => {
        setActionLoading(emailId);
        try {
            const response = await api.dismissDraft(emailId);

            if (response.error) {
                throw new Error(typeof response.error === 'string' ? response.error : response.error.message);
            }

            toast.success(t('drafts.dismissSuccess') || 'Draft dismissed');
            fetchDrafts(); // Refresh list
        } catch (error) {
            console.error('Failed to dismiss draft:', error);
            toast.error('Failed to dismiss draft');
        } finally {
            setActionLoading(null);
        }
    };

    const handleSelectAll = () => {
        if (selectedDrafts.size === drafts.length) {
            setSelectedDrafts(new Set());
        } else {
            setSelectedDrafts(new Set(drafts.map(d => d.id)));
        }
    };

    const handleBulkSend = async () => {
        const draftIds = Array.from(selectedDrafts);
        for (const id of draftIds) {
            await handleSend(id);
        }
        setSelectedDrafts(new Set());
    };

    const handleBulkDismiss = async () => {
        const draftIds = Array.from(selectedDrafts);
        for (const id of draftIds) {
            await handleDismiss(id);
        }
        setSelectedDrafts(new Set());
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Mail className="w-6 h-6 text-primary" />
                        {t('drafts.title') || 'Draft Review Center'}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        {drafts.length} {t('drafts.pending') || 'pending drafts'}
                    </p>
                </div>
                <Button onClick={fetchDrafts} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-muted-foreground" />
                        <select
                            value={filterAccount}
                            onChange={(e) => setFilterAccount(e.target.value)}
                            className="px-3 py-1.5 rounded-md border bg-background text-sm"
                        >
                            <option value="all">{t('drafts.filterByAccount') || 'All Accounts'}</option>
                            {accounts.map(account => (
                                <option key={account.id} value={account.id}>
                                    {account.email_address}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as any)}
                            className="px-3 py-1.5 rounded-md border bg-background text-sm"
                        >
                            <option value="pending">Pending</option>
                            <option value="sent">Sent</option>
                            <option value="dismissed">Dismissed</option>
                        </select>
                    </div>

                    {selectedDrafts.size > 0 && (
                        <div className="flex items-center gap-2 ml-auto">
                            <span className="text-sm text-muted-foreground">
                                {selectedDrafts.size} selected
                            </span>
                            <Button onClick={handleBulkSend} size="sm" variant="default">
                                <Send className="w-4 h-4 mr-2" />
                                {t('drafts.sendSelected') || 'Send Selected'}
                            </Button>
                            <Button onClick={handleBulkDismiss} size="sm" variant="outline">
                                <X className="w-4 h-4 mr-2" />
                                {t('drafts.dismissSelected') || 'Dismiss Selected'}
                            </Button>
                        </div>
                    )}
                </div>
            </Card>

            {/* Bulk Actions */}
            {drafts.length > 0 && (
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={selectedDrafts.size === drafts.length}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300"
                    />
                    <span className="text-sm text-muted-foreground">
                        {t('drafts.selectAll') || 'Select All'}
                    </span>
                </div>
            )}

            {/* Draft List */}
            {drafts.length === 0 ? (
                <Card className="p-12 text-center">
                    <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                        {t('drafts.noDrafts') || 'No pending drafts'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {t('drafts.noDraftsDesc') || 'AI-generated draft replies will appear here for your review'}
                    </p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {drafts.map(draft => (
                        <DraftCard
                            key={draft.id}
                            draft={draft}
                            isSelected={selectedDrafts.has(draft.id)}
                            onSelect={() => {
                                const newSelected = new Set(selectedDrafts);
                                if (newSelected.has(draft.id)) {
                                    newSelected.delete(draft.id);
                                } else {
                                    newSelected.add(draft.id);
                                }
                                setSelectedDrafts(newSelected);
                            }}
                            onSend={() => handleSend(draft.id)}
                            onDismiss={() => handleDismiss(draft.id)}
                            onPreview={() => onPreview(draft)}
                            isLoading={actionLoading === draft.id}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

interface DraftCardProps {
    draft: Email;
    isSelected: boolean;
    onSelect: () => void;
    onSend: () => void;
    onDismiss: () => void;
    onPreview: () => void;
    isLoading: boolean;
}

function DraftCard({ draft, isSelected, onSelect, onSend, onDismiss, onPreview, isLoading }: DraftCardProps) {
    const { t } = useLanguage();
    const draftPreview = draft.draft_content?.substring(0, 200)
        || (draft.ai_analysis as any)?.draft_response?.substring(0, 200)
        || (draft.ai_analysis as any)?.draft_content?.substring(0, 200)
        || '';
    const timeAgo = draft.draft_created_at ? getTimeAgo(new Date(draft.draft_created_at)) : '';

    return (
        <Card className={cn(
            "p-4 hover:shadow-md transition-shadow",
            isSelected && "ring-2 ring-primary"
        )}>
            <div className="flex items-start gap-4">
                {/* Checkbox */}
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={onSelect}
                    className="mt-1 rounded border-gray-300"
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm truncate">
                                Re: {draft.subject || t('dashboard.noSubject')}
                            </h3>
                            <p className="text-xs text-muted-foreground truncate">
                                From: {draft.sender}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
                            <Clock className="w-3 h-3" />
                            {timeAgo}
                        </div>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {draftPreview}...
                    </p>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                        <Mail className="w-3 h-3" />
                        {draft.email_accounts?.email_address}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={onSend}
                            disabled={isLoading}
                            size="sm"
                            className="gap-2"
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                            {t('drafts.send') || 'Send Now'}
                        </Button>
                        <Button
                            onClick={onPreview}
                            disabled={isLoading}
                            size="sm"
                            variant="outline"
                            className="gap-2"
                        >
                            <Eye className="w-4 h-4" />
                            {t('drafts.preview') || 'Preview'}
                        </Button>
                        <Button
                            onClick={onDismiss}
                            disabled={isLoading}
                            size="sm"
                            variant="ghost"
                            className="gap-2"
                        >
                            <X className="w-4 h-4" />
                            {t('drafts.dismiss') || 'Dismiss'}
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );
}

function getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
}
