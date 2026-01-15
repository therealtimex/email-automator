import { useEffect, useState } from 'react';
import { Mail, ShieldCheck, Trash2, Send, RefreshCw, Archive, Flag, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { useApp } from '../context/AppContext';
import { toast } from './Toast';
import { LoadingSpinner, CardLoader } from './LoadingSpinner';
import { Email, EmailCategory } from '../lib/types';
import { cn } from '../lib/utils';

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
    const { state, actions } = useApp();
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

    useEffect(() => {
        loadEmails();
    }, [selectedCategory]);

    const loadEmails = async (offset = 0) => {
        setIsLoading(true);
        await actions.fetchEmails({
            category: selectedCategory || undefined,
            search: searchQuery || undefined,
            offset,
        });
        setIsLoading(false);
    };

    const handleSync = async () => {
        if (state.accounts.length === 0) {
            toast.warning('Please connect an email account first');
            return;
        }
        setIsSyncing(true);
        const success = await actions.triggerSync();
        setIsSyncing(false);
        if (success) {
            toast.success('Sync started! Emails will appear shortly.');
        }
    };

    const handleAction = async (email: Email, action: string) => {
        const success = await actions.executeAction(email.id, action);
        if (success) {
            toast.success(`Email ${action === 'delete' ? 'deleted' : action === 'archive' ? 'archived' : 'updated'}`);
        }
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
                            variant="outline" 
                            className="shadow-sm"
                            disabled={isSyncing}
                        >
                            <RefreshCw className={cn("w-3.5 h-3.5 mr-2", isSyncing && "animate-spin")} />
                            {isSyncing ? 'Syncing...' : 'Sync Now'}
                        </Button>
                        <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-md border border-border flex items-center">
                            {state.emailsTotal} emails
                        </span>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search emails..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Button type="submit" size="sm">Search</Button>
                    </form>
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
                            <Button onClick={handleSync} disabled={isSyncing}>
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
                                onSelect={() => setSelectedEmail(email)}
                                isSelected={selectedEmail?.id === email.id}
                            />
                        ))}

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
                {/* Connection Status */}
                <Card className="p-6 border-primary/20 bg-primary/5">
                    <h3 className="font-semibold text-primary mb-1">Supabase Sync</h3>
                    <p className="text-muted-foreground text-xs mb-3">
                        Real-time connection active
                    </p>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 w-fit px-2 py-1 rounded-full border border-emerald-500/20">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        CONNECTED
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

                {/* Selected Email Detail */}
                {selectedEmail && (
                    <Card className="p-6">
                        <h3 className="font-semibold mb-4">Email Details</h3>
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
                                </>
                            )}
                        </div>
                    </Card>
                )}
            </aside>
        </div>
    );
}

interface EmailCardProps {
    email: Email;
    onAction: (email: Email, action: string) => void;
    onSelect: () => void;
    isSelected: boolean;
}

function EmailCard({ email, onAction, onSelect, isSelected }: EmailCardProps) {
    const categoryClass = CATEGORY_COLORS[email.category || 'other'];
    
    return (
        <Card 
            className={cn(
                "hover:shadow-md transition-shadow group cursor-pointer",
                isSelected && "ring-2 ring-primary"
            )}
            onClick={onSelect}
        >
            <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-3">
                        <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs",
                            email.category === 'spam' ? 'bg-destructive' : 'bg-primary'
                        )}>
                            {email.sender?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                                {email.subject || 'No Subject'}
                            </h3>
                            <p className="text-xs text-muted-foreground truncate">{email.sender}</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider", categoryClass)}>
                            {email.category || 'unknown'}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                            {email.date ? new Date(email.date).toLocaleDateString() : ''}
                        </span>
                    </div>
                </div>
                
                <p className="text-muted-foreground text-sm mb-4 line-clamp-2 leading-relaxed">
                    {email.body_snippet}
                </p>
                
                <div className="bg-secondary/30 p-3 rounded-lg border border-border/50 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-xs font-medium">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        Suggested: <span className="text-foreground">{email.suggested_action || 'none'}</span>
                        {email.action_taken && (
                            <span className="text-muted-foreground ml-2">
                                (Done: {email.action_taken})
                            </span>
                        )}
                    </div>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 hover:text-destructive"
                            onClick={() => onAction(email, 'delete')}
                            title="Delete"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 hover:text-blue-500"
                            onClick={() => onAction(email, 'archive')}
                            title="Archive"
                        >
                            <Archive className="w-3.5 h-3.5" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 hover:text-primary"
                            onClick={() => onAction(email, 'flag')}
                            title="Flag"
                        >
                            <Flag className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );
}
