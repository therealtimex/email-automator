import { useEffect, useState, useCallback, useRef } from 'react';
import { Mail, ShieldCheck, Trash2, Send, RefreshCw, Archive, Flag, Search, ChevronLeft, ChevronRight, Loader2, Settings2, Calendar, Hash, AlertCircle, CheckCircle2, RotateCcw, Eye, Cpu, Clock, Code, Brain, Zap, Info, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { useApp } from '../context/AppContext';
import { useTerminal } from '../context/TerminalContext';
import { api } from '../lib/api';
import { toast } from './Toast';
import { LoadingSpinner, CardLoader } from './LoadingSpinner';
import { EmailAccount, Email, UserSettings, ProcessingEvent } from '../lib/types';
import { cn } from '../lib/utils';
import { sounds } from '../lib/sounds';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';

export function AITraceModal({ 
    email, 
    isOpen, 
    onOpenChange,
    onRetry
}: { 
    email: Email | null, 
    isOpen: boolean, 
    onOpenChange: (open: boolean) => void,
    onRetry?: (email: Email) => void
}) {
    const [events, setEvents] = useState<ProcessingEvent[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && email) {
            fetchEvents();
        }
    }, [isOpen, email]);

    const fetchEvents = async () => {
        if (!email) return;
        setIsLoading(true);
        try {
            const response = await api.getEmailEvents(email.id);
            if (response.data) {
                setEvents(response.data.events);
            }
        } catch (error) {
            console.error('Failed to fetch trace:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'analysis': return <Brain className="w-4 h-4 text-purple-500" />;
            case 'action': return <Zap className="w-4 h-4 text-emerald-500" />;
            case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
            default: return <Info className="w-4 h-4 text-blue-500" />;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 border-b flex flex-row items-center justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Cpu className="w-5 h-5 text-primary" />
                            <DialogTitle>AI Processing Trace</DialogTitle>
                        </div>
                        <DialogDescription>
                            Step-by-step log of how the AI analyzed and acted on this email.
                        </DialogDescription>
                    </div>
                    {email?.processing_status === 'failed' && onRetry && (
                        <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => {
                                onRetry(email);
                                onOpenChange(false);
                            }}
                            className="gap-2 text-destructive border-destructive/20 hover:bg-destructive/10"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Retry Job
                        </Button>
                    )}
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-secondary/5">
                    {isLoading ? (
                        <div className="py-20 flex justify-center"><LoadingSpinner /></div>
                    ) : events.length === 0 ? (
                        <div className="py-20 text-center text-muted-foreground italic font-mono text-sm">
                            No granular trace events found for this email.
                        </div>
                    ) : (
                        events.map((event, i) => (
                            <div key={event.id} className="relative pl-8">
                                {/* Timeline Line */}
                                {i !== events.length - 1 && (
                                    <div className="absolute left-[15px] top-8 bottom-[-24px] w-px bg-border" />
                                )}
                                
                                {/* Icon Badge */}
                                <div className="absolute left-0 top-0 w-8 h-8 rounded-full border bg-background flex items-center justify-center z-10 shadow-sm">
                                    {getIcon(event.event_type)}
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold uppercase tracking-wider text-foreground/70">
                                            {event.agent_state}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {new Date(event.created_at).toLocaleTimeString()}
                                        </span>
                                    </div>

                                    {/* Event Details */}
                                    <div className="bg-card border rounded-lg p-4 shadow-sm">
                                        {event.event_type === 'info' && (
                                            <div className="space-y-3">
                                                <p className="text-sm text-foreground/90">{event.details?.message}</p>
                                                
                                                {event.details?.system_prompt && (
                                                    <div className="space-y-1">
                                                        <div className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                                            <Code className="w-3 h-3" /> System Prompt
                                                        </div>
                                                        <pre className="text-[10px] bg-secondary/50 p-2 rounded border overflow-x-auto whitespace-pre-wrap max-h-60 overflow-y-auto font-mono">
                                                            {event.details.system_prompt}
                                                        </pre>
                                                    </div>
                                                )}
                                                
                                                {event.details?.content_preview && (
                                                    <div className="space-y-1">
                                                        <div className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                                            <Code className="w-3 h-3" /> Email Content (sent to LLM)
                                                        </div>
                                                        <pre className="text-[10px] bg-blue-500/5 p-2 rounded border border-blue-500/10 overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto font-mono">
                                                            {event.details.content_preview}
                                                        </pre>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {event.event_type === 'analysis' && (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="text-[10px] bg-secondary px-2 py-1 rounded">
                                                        <span className="text-muted-foreground mr-1">Category:</span>
                                                        <span className="font-bold uppercase">{event.details?.category || 'Analyzing...'}</span>
                                                    </div>
                                                    <div className="text-[10px] bg-secondary px-2 py-1 rounded">
                                                        <span className="text-muted-foreground mr-1">Sentiment:</span>
                                                        <span className="font-bold uppercase">{event.details?.sentiment || 'Analyzing...'}</span>
                                                    </div>
                                                </div>
                                                
                                                {event.details?.system_prompt && (
                                                    <div className="space-y-1">
                                                        <div className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                                            <Code className="w-3 h-3" /> System Prompt
                                                        </div>
                                                        <pre className="text-[10px] bg-secondary/50 p-2 rounded border overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto font-mono">
                                                            {event.details?.system_prompt}
                                                        </pre>
                                                    </div>
                                                )}

                                                {event.details?._raw_response && (
                                                    <div className="space-y-1">
                                                        <div className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                                            <Code className="w-3 h-3" /> Raw LLM Response
                                                        </div>
                                                        <pre className="text-[10px] bg-emerald-500/5 p-2 rounded border border-emerald-500/10 overflow-x-auto font-mono">
                                                            {JSON.stringify(JSON.parse(event.details._raw_response), null, 2)}
                                                        </pre>
                                                    </div>
                                                )}

                                                {event.details?.usage && (
                                                    <div className="flex gap-4 pt-2 border-t border-border/50">
                                                        <div className="text-[10px]">
                                                            <span className="text-muted-foreground mr-1">Prompt:</span>
                                                            <span className="font-mono font-bold">{event.details.usage.prompt_tokens}</span>
                                                        </div>
                                                        <div className="text-[10px]">
                                                            <span className="text-muted-foreground mr-1">Completion:</span>
                                                            <span className="font-mono font-bold">{event.details.usage.completion_tokens}</span>
                                                        </div>
                                                        <div className="text-[10px]">
                                                            <span className="text-muted-foreground mr-1">Total:</span>
                                                            <span className="font-mono font-bold text-primary">{event.details.usage.total_tokens}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {event.event_type === 'action' && (
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 capitalize">
                                                        Executed: {event.details?.action}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground italic">
                                                        "{event.details?.reason}"
                                                    </p>
                                                </div>
                                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                            </div>
                                        )}

                                        {event.event_type === 'error' && (
                                            <div className="space-y-2">
                                                <p className="text-sm text-red-600 dark:text-red-400 font-bold">
                                                    {typeof event.details?.error === 'object' 
                                                        ? (event.details.error.message || JSON.stringify(event.details.error)) 
                                                        : event.details?.error}
                                                </p>
                                                {event.details?.raw_response && (
                                                    <pre className="text-[10px] bg-red-500/5 p-2 rounded border border-red-500/10 overflow-x-auto whitespace-pre-wrap font-mono">
                                                        {typeof event.details.raw_response === 'object' 
                                                            ? JSON.stringify(event.details.raw_response, null, 2) 
                                                            : event.details.raw_response}
                                                    </pre>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

const CATEGORY_COLORS: Record<string, string> = {
    spam: 'bg-destructive/10 text-destructive',
    newsletter: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    support: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    client: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    internal: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    personal: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
    other: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
};

const ACTION_ICONS = {
    delete: Trash2,
    archive: Archive,
    reply: Send,
    flag: Flag,
    none: ShieldCheck,
};

export function Dashboard() {
    const { state, actions, dispatch } = useApp();
    const { openTerminal } = useTerminal();
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
    const [actionLoading, setActionLoading] = useState<Record<string, string>>({});
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [isTraceOpen, setIsTraceOpen] = useState(false);
    const [traceEmail, setTraceEmail] = useState<Email | null>(null);

    useEffect(() => {
        // Only fetch emails if user is authenticated
        if (state.isAuthenticated) {
            loadEmails();
            actions.fetchStats();
        } else {
            setIsLoading(false);
        }
    }, [selectedCategory, state.isAuthenticated]);

    const loadEmails = async (offset = 0) => {
        setIsLoading(true);
        await actions.fetchEmails({
            category: selectedCategory || undefined,
            search: searchQuery || undefined,
            offset,
            sortBy: state.sortBy,
            sortOrder: state.sortOrder,
        });
        setIsLoading(false);
    };

    const handleSortChange = (newSortBy: 'date' | 'created_at') => {
        actions.fetchEmails({
            category: selectedCategory || undefined,
            search: searchQuery || undefined,
            offset: 0, // Reset to first page
            sortBy: newSortBy,
            sortOrder: state.sortOrder,
        });
    };

    const toggleSortOrder = () => {
        actions.fetchEmails({
            category: selectedCategory || undefined,
            search: searchQuery || undefined,
            offset: 0,
            sortBy: state.sortBy,
            sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc',
        });
    };

    const handleSync = async () => {
        if (state.accounts.length === 0) {
            toast.warning('Please connect an email account first');
            return;
        }
        sounds.playStart();
        openTerminal();
        setIsSyncing(true);
        const success = await actions.triggerSync();
        setIsSyncing(false);
        if (success) {
            sounds.playSuccess();
            toast.success('Sync completed! Check your emails.');
        } else {
            toast.error('Sync failed. Check account status for details.');
        }
    };

    const handleAction = async (email: Email, action: string) => {
        // For delete, require confirmation
        if (action === 'delete' && deleteConfirm !== email.id) {
            setDeleteConfirm(email.id);
            return;
        }

        // Clear delete confirmation
        setDeleteConfirm(null);

        // Set loading state for this specific email+action
        setActionLoading(prev => ({ ...prev, [email.id]: action }));

        const success = await actions.executeAction(email.id, action);

        // Clear loading state
        setActionLoading(prev => {
            const updated = { ...prev };
            delete updated[email.id];
            return updated;
        });

        if (success) {
            toast.success(`Email ${action === 'delete' ? 'deleted' : action === 'archive' ? 'archived' : 'updated'}`);
            // Refresh list after delete to remove the email
            if (action === 'delete') {
                loadEmails(state.emailsOffset);
            }
        }
    };

    const cancelDelete = () => {
        setDeleteConfirm(null);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        loadEmails();
    };

    const handlePageChange = (direction: 'prev' | 'next') => {
        const newOffset = direction === 'next'
            ? state.emailsOffset + 20
            : Math.max(0, state.emailsOffset - 20);
        loadEmails(newOffset);
    };

    const handleViewTrace = (email: Email) => {
        setTraceEmail(email);
        setIsTraceOpen(true);
    };

    const handleRetry = async (email: Email) => {
        const success = await actions.retryProcessing(email.id);
        if (success) {
            toast.success('Retrying email processing...');
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
            {/* Main Content */}
            <section className="lg:col-span-2 space-y-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Mail className="w-5 h-5 text-primary" />
                        Recent Analysis
                    </h2>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                            onClick={handleSync}
                            size="sm"
                            variant="default"
                            className="h-9 shadow-md px-4"
                            disabled={isSyncing}
                        >
                            <RefreshCw className={cn("w-3.5 h-3.5 mr-2", isSyncing && "animate-spin")} />
                            {isSyncing ? 'Syncing...' : 'Sync Now'}
                        </Button>
                        <span className="h-9 text-xs font-medium text-muted-foreground bg-secondary px-3 py-1 rounded-md border border-border flex items-center">
                            {state.emailsTotal} emails
                        </span>
                    </div>
                </div>

                {/* Sync Progress Banner */}
                {isSyncing && (
                    <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-3">
                            <div className="bg-primary/10 p-2 rounded-full">
                                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm">Sync in progress...</h4>
                                <p className="text-xs text-muted-foreground">
                                    Fetching and analyzing emails. New emails will appear below automatically.
                                </p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={openTerminal} className="h-8 text-xs">
                            <Cpu className="w-3.5 h-3.5 mr-2" />
                            View Logs
                        </Button>
                    </div>
                )}

                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <form onSubmit={handleSearch} className="flex-1 flex gap-2 w-full">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search emails..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9"
                            />
                        </div>
                        <Button type="submit" size="sm" className="h-9 px-4">Search</Button>
                    </form>
                    
                    {/* Sort Controls */}
                    <div className="flex items-center gap-1 bg-secondary/30 p-1 rounded-md border border-border/50 h-9">
                        <select 
                            className="bg-transparent text-xs font-medium border-none focus:ring-0 cursor-pointer pl-2 pr-8 h-full"
                            value={state.sortBy}
                            onChange={(e) => handleSortChange(e.target.value as 'date' | 'created_at')}
                        >
                            <option value="date">Received Time</option>
                            <option value="created_at">Processed Time</option>
                        </select>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-primary"
                            onClick={toggleSortOrder}
                            title={state.sortOrder === 'asc' ? "Sorting: Oldest First" : "Sorting: Newest First"}
                        >
                            {state.sortOrder === 'asc' ? (
                                <ArrowUp className="w-3.5 h-3.5" />
                            ) : (
                                <ArrowDown className="w-3.5 h-3.5" />
                            )}
                        </Button>
                    </div>
                </div>

                {/* Categories */}
                <div className="flex gap-1 flex-wrap">
                    <Button
                        size="sm"
                        variant={selectedCategory === null ? 'secondary' : 'ghost'}
                        onClick={() => setSelectedCategory(null)}
                    >
                        All
                    </Button>
                    {['spam', 'client', 'newsletter', 'support'].map(cat => (
                        <Button
                            key={cat}
                            size="sm"
                            variant={selectedCategory === cat ? 'secondary' : 'ghost'}
                            onClick={() => setSelectedCategory(cat)}
                            className="capitalize"
                        >
                            {cat}
                        </Button>
                    ))}
                </div>

                {/* Email List */}
                {isLoading ? (
                    <CardLoader />
                ) : state.emails.length === 0 ? (
                    <Card className="p-20 text-center shadow-sm">
                        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                            <Mail className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-medium">No emails found</h3>
                        <p className="text-muted-foreground mt-2 mb-6">
                            {state.accounts.length === 0
                                ? 'Connect your email account to get started.'
                                : 'Try syncing or adjusting your filters.'}
                        </p>
                        {state.accounts.length > 0 && (
                            <Button onClick={() => {
                                openTerminal();
                                handleSync();
                            }} disabled={isSyncing}>
                                <RefreshCw className={cn("w-4 h-4 mr-2", isSyncing && "animate-spin")} />
                                Sync Now
                            </Button>
                        )}
                    </Card>
                ) : (
                    <>
                        {state.emails.map(email => (
                            <EmailCard
                                key={email.id}
                                email={email}
                                onAction={handleAction}
                                onRetry={handleRetry}
                                onViewTrace={handleViewTrace}
                                onSelect={() => setSelectedEmail(email)}
                                isSelected={selectedEmail?.id === email.id}
                                loadingAction={actionLoading[email.id]}
                                isDeletePending={deleteConfirm === email.id}
                                onCancelDelete={cancelDelete}
                            />
                        ))}

                        <AITraceModal 
                            isOpen={isTraceOpen} 
                            onOpenChange={setIsTraceOpen} 
                            email={traceEmail} 
                            onRetry={handleRetry}
                        />

                        {/* Pagination */}
                        {state.emailsTotal > 20 && (
                            <div className="flex items-center justify-between pt-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange('prev')}
                                    disabled={state.emailsOffset === 0}
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1" />
                                    Previous
                                </Button>
                                <span className="text-sm text-muted-foreground">
                                    {state.emailsOffset + 1} - {Math.min(state.emailsOffset + 20, state.emailsTotal)} of {state.emailsTotal}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange('next')}
                                    disabled={state.emailsOffset + 20 >= state.emailsTotal}
                                >
                                    Next
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </section>

            {/* Sidebar */}
            <aside className="space-y-6">
                {/* Selected Email Detail */}
                {selectedEmail && (
                    <Card className="p-6 border-primary/20 bg-primary/5 animate-in slide-in-from-right-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">Email Details</h3>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0"
                                onClick={() => setSelectedEmail(null)}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div>
                                <span className="text-muted-foreground">From:</span>
                                <p className="font-medium truncate">{selectedEmail.sender}</p>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Subject:</span>
                                <p className="font-medium">{selectedEmail.subject}</p>
                            </div>
                            {selectedEmail.ai_analysis && (
                                <>
                                    <div>
                                        <span className="text-muted-foreground">Summary:</span>
                                        <p className="text-xs mt-1">{selectedEmail.ai_analysis.summary}</p>
                                    </div>
                                    {selectedEmail.ai_analysis.key_points && (
                                        <div>
                                            <span className="text-muted-foreground">Key Points:</span>
                                            <ul className="text-xs mt-1 list-disc list-inside">
                                                {selectedEmail.ai_analysis.key_points.map((point, i) => (
                                                    <li key={i}>{point}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {selectedEmail.ai_analysis.draft_response && (
                                        <div className="mt-4 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                                            <div className="flex items-center gap-2 mb-2 text-emerald-600 dark:text-emerald-400">
                                                <Send className="w-3.5 h-3.5" />
                                                <span className="text-xs font-bold uppercase">AI Draft Reply</span>
                                            </div>
                                            <p className="text-xs leading-relaxed whitespace-pre-wrap italic text-foreground/80">
                                                {selectedEmail.ai_analysis.draft_response}
                                            </p>
                                            <p className="mt-2 text-[9px] text-muted-foreground">
                                                * This draft is already saved in your {selectedEmail.email_accounts?.provider === 'gmail' ? 'Gmail' : 'Outlook'} Drafts folder.
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </Card>
                )}

                {/* Sync Settings per Account */}
                <SyncSettings
                    accounts={state.accounts}
                    onUpdate={actions.updateAccount}
                    onSync={actions.triggerSync}
                    settings={state.settings}
                    onUpdateSettings={actions.updateSettings}
                    openTerminal={openTerminal}
                />

                {/* Recent Sync History */}
                <Card className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <RotateCcw className="w-4 h-4 text-primary" />
                        Sync History
                    </h3>
                    <div className="space-y-4">
                        {!state.stats?.recentSyncs || state.stats.recentSyncs.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">No sync history available.</p>
                        ) : (
                            state.stats.recentSyncs.slice(0, 5).map((log) => (
                                <div key={log.id} className="flex justify-between items-start text-sm border-b last:border-0 pb-3 last:pb-0">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "w-1.5 h-1.5 rounded-full",
                                                log.status === 'success' ? "bg-emerald-500" : 
                                                log.status === 'running' ? "bg-blue-500 animate-pulse" : "bg-red-500"
                                            )} />
                                            <p className="font-medium text-xs">
                                                {new Date(log.started_at).toLocaleDateString()} {new Date(log.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground pl-3.5">
                                            Processed: <span className="font-medium text-foreground">{log.emails_processed}</span> • 
                                            Actioned: <span className="font-medium text-foreground">{log.emails_deleted + log.emails_drafted}</span>
                                        </p>
                                        {log.error_message && (
                                            <p className="text-[10px] text-destructive pl-3.5 line-clamp-1" title={log.error_message}>
                                                {log.error_message}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                                        {log.status === 'running' ? 'Running' : 
                                         log.completed_at ? 
                                            `${Math.round((new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()) / 1000)}s` 
                                            : '...'}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>

                {/* Quick Stats */}
                <Card className="p-6">
                    <h3 className="font-semibold mb-4">Quick Stats</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Total Processed</span>
                            <span className="font-medium">{state.emailsTotal}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Connected Accounts</span>
                            <span className="font-medium">{state.accounts.length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Active Rules</span>
                            <span className="font-medium">{state.rules.filter(r => r.is_enabled).length}</span>
                        </div>
                    </div>
                </Card>
            </aside>
        </div>
    );
}

interface SyncSettingsProps {
    accounts: EmailAccount[];
    onUpdate: (accountId: string, updates: Partial<EmailAccount>) => Promise<boolean>;
    onSync: (accountId: string) => void;
    settings: UserSettings | null;
    onUpdateSettings: (updates: Partial<UserSettings>) => Promise<boolean>;
    openTerminal: () => void;
}

function SyncSettings({ accounts, onUpdate, onSync, settings, onUpdateSettings, openTerminal }: SyncSettingsProps) {
    if (accounts.length === 0) return null;

    return (
        <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-primary" />
                Sync Scope
            </h3>

            <div className="space-y-6">
                {accounts.map(account => (
                    <AccountSyncRow 
                        key={account.id} 
                        account={account} 
                        onUpdate={onUpdate} 
                        onSync={onSync} 
                        openTerminal={openTerminal} 
                    />
                ))}
            </div>
        </Card>
    );
}

function AccountSyncRow({ 
    account, 
    onUpdate, 
    onSync, 
    openTerminal 
}: { 
    account: EmailAccount, 
    onUpdate: (id: string, updates: Partial<EmailAccount>) => Promise<boolean>,
    onSync: (id: string) => void,
    openTerminal: () => void
}) {
    const [updating, setUpdating] = useState(false);
    
    // Local state for inputs to prevent aggressive updates while typing
    const [localStartDate, setLocalStartDate] = useState('');
    const [localMaxEmails, setLocalMaxEmails] = useState<string>('');

    const toLocalISOString = (dateInput: string | number | Date | null | undefined) => {
        if (!dateInput) return '';
        const input = (typeof dateInput === 'string' && /^\d+$/.test(dateInput)) 
            ? parseInt(dateInput) 
            : dateInput;
            
        const date = new Date(input);
        if (isNaN(date.getTime())) return '';
        
        const pad = (n: number) => n < 10 ? '0' + n : n;
        return date.getFullYear() +
            '-' + pad(date.getMonth() + 1) +
            '-' + pad(date.getDate()) +
            'T' + pad(date.getHours()) +
            ':' + pad(date.getMinutes());
    };

    // Initialize local state from account props
    useEffect(() => {
        const effectiveDate = account.sync_start_date 
            || account.last_sync_checkpoint 
            || account.last_sync_at;
        
        setLocalStartDate(toLocalISOString(effectiveDate));
        setLocalMaxEmails((account.sync_max_emails_per_run || 50).toString());
    }, [account.id, account.sync_start_date, account.last_sync_checkpoint, account.last_sync_at, account.sync_max_emails_per_run]);

    const handleUpdate = async (updates: Partial<EmailAccount>) => {
        setUpdating(true);
        await onUpdate(account.id, updates);
        setUpdating(false);
    };

    const handleBlurStartDate = () => {
        const currentValue = account.sync_start_date ? new Date(account.sync_start_date).toISOString() : '';
        const newValue = localStartDate ? new Date(localStartDate).toISOString() : '';
        
        if (newValue !== currentValue) {
            handleUpdate({ sync_start_date: newValue || null });
        }
    };

    const handleBlurMaxEmails = () => {
        const val = parseInt(localMaxEmails, 10) || 50;
        if (val !== account.sync_max_emails_per_run) {
            handleUpdate({ sync_max_emails_per_run: val });
        }
    };

    return (
        <div className="space-y-3 pb-4 border-b last:border-0 last:pb-0">
            <div className="flex justify-between items-center">
                <span className="text-xs font-medium truncate max-w-[150px]" title={account.email_address}>
                    {account.email_address}
                </span>
                <div className="flex items-center gap-1">
                    {account.last_sync_status === 'syncing' ? (
                        <Loader2 className="w-3 h-3 text-primary animate-spin" />
                    ) : account.last_sync_status === 'success' ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    ) : account.last_sync_status === 'error' ? (
                        <span title={account.last_sync_error || 'Error'}>
                            <AlertCircle className="w-3 h-3 text-destructive" />
                        </span>
                    ) : null}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                            openTerminal();
                            onSync(account.id);
                        }}
                        disabled={account.last_sync_status === 'syncing'}
                    >
                        <RefreshCw className={cn("w-3 h-3", account.last_sync_status === 'syncing' && "animate-spin")} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-orange-500"
                        title="Reset Checkpoint (Force Full Re-sync from Start Date)"
                        onClick={() => onUpdate(account.id, { last_sync_checkpoint: null })}
                        disabled={account.last_sync_status === 'syncing'}
                    >
                        <RotateCcw className="w-3 h-3" />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-[1.5fr_1fr] gap-2">
                <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" /> Sync From
                    </label>
                    <Input
                        type="datetime-local"
                        className="h-7 text-[10px] px-2 py-0 w-full"
                        value={localStartDate}
                        onChange={(e) => setLocalStartDate(e.target.value)}
                        onBlur={handleBlurStartDate}
                        disabled={updating || account.last_sync_status === 'syncing'}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Hash className="w-2.5 h-2.5" /> Max Emails
                    </label>
                    <Input
                        type="number"
                        className="h-7 text-[10px] px-2 py-0"
                        value={localMaxEmails}
                        onChange={(e) => setLocalMaxEmails(e.target.value)}
                        onBlur={handleBlurMaxEmails}
                        disabled={updating || account.last_sync_status === 'syncing'}
                    />
                </div>
            </div>
            {account.last_sync_at && (
                <p className="text-[9px] text-muted-foreground">
                    Last sync: {new Date(account.last_sync_at).toLocaleString()}
                </p>
            )}
            {account.last_sync_error && (
                <p className="text-[9px] text-destructive italic line-clamp-1" title={account.last_sync_error}>
                    Error: {account.last_sync_error}
                </p>
            )}
        </div>
    );
}

interface EmailCardProps {
    email: Email;
    onAction: (email: Email, action: string) => void;
    onRetry: (email: Email) => void;
    onViewTrace: (email: Email) => void;
    onSelect: () => void;
    isSelected: boolean;
    loadingAction?: string;
    isDeletePending?: boolean;
    onCancelDelete?: () => void;
}

function EmailCard({ email, onAction, onRetry, onViewTrace, onSelect, isSelected, loadingAction, isDeletePending, onCancelDelete }: EmailCardProps) {
    if (!email) return null;
    const categoryClass = CATEGORY_COLORS[email.category || 'other'];
    const isLoading = !!loadingAction;

    const getExternalMailUrl = () => {
        if (!email.email_accounts) return '#';
        const { provider, email_address } = email.email_accounts;
        
        if (provider === 'gmail') {
            // Gmail deep link using the message ID
            return `https://mail.google.com/mail/u/${email_address}/#all/${email.external_id}`;
        } else {
            // Outlook/M365 deep link
            return `https://outlook.office.com/mail/deeplink/read/${encodeURIComponent(email.external_id)}`;
        }
    };

    return (
        <Card
            className={cn(
                "hover:shadow-md transition-shadow group cursor-pointer",
                isSelected && "ring-2 ring-primary"
            )}
            onClick={onSelect}
        >
            <div className="p-5">
                <div className="flex justify-between items-start mb-3 gap-4">
                    <div className="flex gap-3 flex-1 min-w-0">
                        <div className={cn(
                            "w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white text-xs",
                            email.category === 'spam' ? 'bg-destructive' : 'bg-primary'
                        )}>
                            {email.sender?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                                {email.subject || 'No Subject'}
                            </h3>
                            <p className="text-xs text-muted-foreground truncate" title={email.sender || ''}>
                                {email.sender}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider", categoryClass)}>
                            {email.category || 'unknown'}
                        </span>
                        <div className="flex items-center justify-end gap-1">
                            {email.processing_status === 'pending' && (
                                <span className="text-[9px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5" /> Queued
                                </span>
                            )}
                            {email.processing_status === 'processing' && (
                                <span className="text-[9px] text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <Loader2 className="w-2.5 h-2.5 animate-spin" /> Analyzing
                                </span>
                            )}
                            {email.processing_status === 'completed' && (
                                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <Brain className="w-2.5 h-2.5" /> Analyzed
                                </span>
                            )}
                            {email.processing_status === 'failed' && (
                                <div className="flex items-center gap-1">
                                    <span className="text-[9px] text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded flex items-center gap-1" title={email.processing_error || 'Unknown error'}>
                                        <AlertCircle className="w-2.5 h-2.5" /> Failed
                                    </span>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-5 w-5 text-red-600 hover:bg-red-500/10" 
                                        onClick={(e) => { e.stopPropagation(); onRetry(email); }}
                                        title="Retry Processing"
                                    >
                                        <RefreshCw className="w-2.5 h-2.5" />
                                    </Button>
                                </div>
                            )}
                            {!email.processing_status && !email.ai_analysis && (
                                <span className="text-[9px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <Loader2 className="w-2.5 h-2.5 animate-spin" /> Pending
                                </span>
                            )}
                            {!email.processing_status && email.ai_analysis && (
                                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <Brain className="w-2.5 h-2.5" /> Analyzed
                                </span>
                            )}
                        </div>
                        <div className="flex items-center justify-end gap-2 text-[10px] text-muted-foreground/80 leading-tight">
                            <span title={email.date ? new Date(email.date).toLocaleString() : ''} className="whitespace-nowrap">
                                <span className="opacity-70 text-[9px]">REC:</span> {email.date ? new Date(email.date).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                            </span>
                            <span className="opacity-30">•</span>
                            <span title={new Date(email.created_at).toLocaleString()} className="whitespace-nowrap">
                                <span className="opacity-70 text-[9px]">PROC:</span> {new Date(email.created_at).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                </div>

                <p className="text-muted-foreground text-sm mb-4 line-clamp-2 leading-relaxed">
                    {email.body_snippet}
                </p>

                <div className="bg-secondary/30 p-3 rounded-lg border border-border/50 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-xs font-medium">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        Suggested: 
                        {(email.suggested_actions && email.suggested_actions.length > 0) ? (
                            <div className="flex gap-1 flex-wrap">
                                {email.suggested_actions.map(action => (
                                    <span key={action} className="text-foreground border border-border/50 px-1.5 py-0.5 rounded capitalize bg-background/50">
                                        {action}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <span className="text-foreground">{email.suggested_action || 'none'}</span>
                        )}
                        
                        {(email.actions_taken && email.actions_taken.length > 0) ? (
                             <span className="text-muted-foreground ml-2 truncate max-w-[100px]" title={email.actions_taken.join(', ')}>
                                (Done: {email.actions_taken.join(', ')})
                            </span>
                        ) : email.action_taken ? (
                            <span className="text-muted-foreground ml-2">
                                (Done: {email.action_taken})
                            </span>
                        ) : null}
                    </div>
                    <div className="flex gap-1 items-center" onClick={(e) => e.stopPropagation()}>
                        {isDeletePending ? (
                            // Delete confirmation UI
                            <div className="flex items-center gap-1 animate-in fade-in duration-200">
                                <span className="text-xs text-destructive mr-1">Delete?</span>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => onAction(email, 'delete')}
                                    disabled={isLoading}
                                >
                                    {loadingAction === 'delete' ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                        'Yes'
                                    )}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={onCancelDelete}
                                    disabled={isLoading}
                                >
                                    No
                                </Button>
                            </div>
                        ) : (
                            // Normal action buttons
                            <>
                                <a 
                                    href={getExternalMailUrl()} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-primary hover:bg-secondary/50 transition-colors"
                                    title={`Open in ${email.email_accounts?.provider === 'gmail' ? 'Gmail' : 'Outlook'}`}
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                                    onClick={() => onViewTrace(email)}
                                    title="View AI Trace (Prompt/Response)"
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 hover:text-destructive"
                                    onClick={() => onAction(email, 'delete')}
                                    disabled={isLoading}
                                    title="Delete"
                                >
                                    {loadingAction === 'delete' ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-3.5 h-3.5" />
                                    )}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 hover:text-blue-500"
                                    onClick={() => onAction(email, 'archive')}
                                    disabled={isLoading}
                                    title="Archive"
                                >
                                    {loadingAction === 'archive' ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Archive className="w-3.5 h-3.5" />
                                    )}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 hover:text-primary"
                                    onClick={() => onAction(email, 'flag')}
                                    disabled={isLoading}
                                    title="Flag"
                                >
                                    {loadingAction === 'flag' ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Flag className="w-3.5 h-3.5" />
                                    )}
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}
