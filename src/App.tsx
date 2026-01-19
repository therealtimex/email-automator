import { useEffect, useState } from 'react';
import { Mail, LayoutDashboard, Settings, BarChart3, LogOut, Clock, Cpu, Brain, Zap, AlertCircle, Info, Code, CheckCircle2, UserCircle } from 'lucide-react';
import { ThemeProvider } from './components/theme-provider';
import { ModeToggle } from './components/mode-toggle';
import { Button } from './components/ui/button';
import { AppProvider, useApp } from './context/AppContext';
import { MigrationProvider } from './context/MigrationContext';
import { TerminalProvider } from './context/TerminalContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer, toast } from './components/Toast';
import { PageLoader } from './components/LoadingSpinner';
import { SetupWizard } from './components/SetupWizard';
import { Dashboard } from './components/Dashboard';
import { Configuration } from "./components/Configuration";
import { AccountSettingsPage } from './components/AccountSettingsPage';
import { Login } from './components/Login';
import { Logo } from './components/Logo';
import { getSupabaseConfig, validateSupabaseConnection } from './lib/supabase-config';
import { supabase } from './lib/supabase';
import { api } from './lib/api';
import { cn } from './lib/utils';
import {
    checkMigrationStatus,
    type MigrationStatus,
    isMigrationReminderDismissed
} from './lib/migration-check';
import { MigrationBanner } from './components/migration/MigrationBanner';
import { MigrationModal } from './components/migration/MigrationModal';
import { LiveTerminal } from './components/LiveTerminal';
import { ProcessingEvent } from './lib/types';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from './components/ui/dialog';

type TabType = 'dashboard' | 'config' | 'analytics' | 'account';

function AppContent() {
    const { state, isSubscribed, actions } = useApp();
    const [needsSetup, setNeedsSetup] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('dashboard');
    const [checkingConfig, setCheckingConfig] = useState(true);
    const [processingAuth, setProcessingAuth] = useState(false);

    // Handle OAuth Callback (e.g. Gmail)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');

        if (code && !processingAuth) {
            const handleCallback = async () => {
                setProcessingAuth(true);
                try {
                    // Try Gmail connection
                    // Note: In a robust app, we should pass 'state' param to know which provider
                    // but since MS uses device flow here, it's likely Gmail.
                    const response = await api.connectGmail(code);
                    if (response.data?.success) {
                        toast.success('Gmail connected successfully!');
                        // Notify opener if exists
                        if (window.opener) {
                            // Close popup after short delay
                            setTimeout(() => window.close(), 1500);
                        } else {
                            // Clear URL
                            window.history.replaceState({}, '', window.location.pathname);
                            actions.fetchAccounts();
                        }
                    } else {
                        const errMsg = typeof response.error === 'string'
                            ? response.error
                            : response.error?.message;
                        toast.error(errMsg || 'Failed to connect Gmail');
                    }
                } catch (error) {
                    toast.error('Connection failed');
                } finally {
                    setProcessingAuth(false);
                }
            };
            handleCallback();
        }
    }, []);

    if (processingAuth) {
        return <PageLoader text="Connecting account..." />;
    }

    // Migration state
    const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null);
    const [showMigrationBanner, setShowMigrationBanner] = useState(false);
    const [showMigrationModal, setShowMigrationModal] = useState(false);
    const [suppressMigrationBanner, setSuppressMigrationBanner] = useState(false);

    // Initial Config Check
    useEffect(() => {
        const checkConfig = async () => {
            const config = getSupabaseConfig();

            if (!config) {
                setNeedsSetup(true);
                setCheckingConfig(false);
                return;
            }

            // Validate the configuration (especially if it came from environment variables)
            const validation = await validateSupabaseConnection(config.url, config.anonKey);

            if (!validation.valid) {
                // Force setup wizard on invalid config
                setNeedsSetup(true);
                setCheckingConfig(false);
                return;
            } else if (state.isInitialized && state.isAuthenticated) {
                // Load initial data only after initialization and auth
                actions.fetchAccounts();
                actions.fetchRules();
                actions.fetchSettings();
                actions.fetchProfile();

                // Check migration status
                checkMigrationStatus(supabase).then((status) => {
                    setMigrationStatus(status);
                    if (status.needsMigration && !isMigrationReminderDismissed()) {
                        setShowMigrationBanner(true);
                    }
                });
            }
            setCheckingConfig(false);
        };
        checkConfig();
    }, [state.isInitialized, state.isAuthenticated]);

    const handleOpenMigrationModal = () => {
        setShowMigrationModal(true);
        setShowMigrationBanner(false);
    };

    const migrationContextValue = {
        migrationStatus,
        showMigrationBanner,
        showMigrationModal,
        openMigrationModal: handleOpenMigrationModal,
        suppressMigrationBanner,
        setSuppressMigrationBanner,
    };

    if (checkingConfig) {
        return <PageLoader text="Checking configuration..." />;
    }

    if (needsSetup) {
        return (
            <SetupWizard onComplete={() => {
                setNeedsSetup(false);
                window.location.reload();
            }} />
        );
    }

    if (!state.isInitialized) {
        return <PageLoader text="Initializing..." />;
    }

    // Show login if not authenticated
    if (!state.isAuthenticated) {
        return <Login onConfigure={() => setNeedsSetup(true)} />;
    }

    const handleLogout = async () => {
        await supabase.auth.signOut();
        toast.success('Logged out successfully');
    };

    return (
        <MigrationProvider value={migrationContextValue}>
            <div className="min-h-screen bg-background font-sans text-foreground transition-colors duration-300">
                {/* Header */}
                <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-8">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => setActiveTab('dashboard')}
                                className="text-xl font-bold flex items-center gap-2 hover:opacity-80 transition-opacity"
                            >
                                <Logo className="w-9 h-9" />
                                <span className="hidden sm:inline">Email Automator</span>
                                <span className="sm:hidden">Email AI</span>
                            </button>
                            
                            {/* Real-time Status Indicator */}
                            <div className={cn(
                                "flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold border transition-colors",
                                isSubscribed 
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400" 
                                    : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:text-yellow-400"
                            )}>
                                <div className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    isSubscribed ? "bg-emerald-500 animate-pulse" : "bg-yellow-500"
                                )} />
                                <span className="hidden xs:inline">{isSubscribed ? "LIVE" : "OFFLINE"}</span>
                            </div>
                        </div>

                        <div className="flex gap-4 items-center">
                            <nav className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg">
                                <Button
                                    variant={activeTab === 'dashboard' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setActiveTab('dashboard')}
                                    className="gap-2"
                                >
                                    <LayoutDashboard className="w-4 h-4" />
                                    <span className="hidden sm:inline">Dashboard</span>
                                </Button>
                                <Button
                                    variant={activeTab === 'analytics' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setActiveTab('analytics')}
                                    className="gap-2"
                                >
                                    <BarChart3 className="w-4 h-4" />
                                    <span className="hidden sm:inline">Analytics</span>
                                </Button>
                                <Button
                                    variant={activeTab === 'config' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setActiveTab('config')}
                                    className="gap-2"
                                >
                                    <Settings className="w-4 h-4" />
                                    <span className="hidden sm:inline">Configuration</span>
                                </Button>
                            </nav>
                            <div className="h-6 w-px bg-border/50 mx-2 hidden sm:block" />
                            <ModeToggle />
                            <Button
                                variant={activeTab === 'account' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setActiveTab('account')}
                                className="text-muted-foreground hover:text-foreground p-0 w-8 h-8 rounded-full overflow-hidden border"
                                title="Account Settings"
                            >
                                {state.profile?.avatar_url ? (
                                    <img src={state.profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <UserCircle className="w-5 h-5" />
                                )}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleLogout}
                                className="text-muted-foreground hover:text-foreground"
                                title="Sign out"
                            >
                                <LogOut className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="max-w-7xl mx-auto p-4 sm:p-8 mt-4">
                    {activeTab === 'dashboard' && <Dashboard />}
                    {activeTab === 'config' && <Configuration />}
                    {activeTab === 'analytics' && <AnalyticsPage />}
                    {activeTab === 'account' && <AccountSettingsPage />}
                </main>

                {/* Error Display */}
                {state.error && (
                    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50">
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg">
                            <p className="text-sm">{state.error}</p>
                        </div>
                    </div>
                )}

                {/* Migration UI */}
                {migrationStatus && showMigrationBanner && !suppressMigrationBanner && (
                    <MigrationBanner
                        status={migrationStatus}
                        onDismiss={() => setShowMigrationBanner(false)}
                        onLearnMore={handleOpenMigrationModal}
                    />
                )}

                {migrationStatus && (
                    <MigrationModal
                        open={showMigrationModal}
                        onOpenChange={setShowMigrationModal}
                        status={migrationStatus}
                    />
                )}

                <LiveTerminal />
            </div>
        </MigrationProvider>
    );
}

function RunTraceModal({ 
    runId, 
    accountEmail,
    isOpen, 
    onOpenChange 
}: { 
    runId: string | null, 
    accountEmail?: string,
    isOpen: boolean, 
    onOpenChange: (open: boolean) => void 
}) {
    const [events, setEvents] = useState<ProcessingEvent[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && runId) {
            fetchEvents();
        }
    }, [isOpen, runId]);

    const fetchEvents = async () => {
        if (!runId) return;
        setIsLoading(true);
        try {
            const response = await api.getRunEvents(runId);
            if (response.data) {
                setEvents(response.data.events);
            }
        } catch (error) {
            console.error('Failed to fetch run trace:', error);
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
                <DialogHeader className="p-6 border-b">
                    <div className="flex items-center gap-2">
                        <Cpu className="w-5 h-5 text-primary" />
                        <DialogTitle>Sync Run Trace</DialogTitle>
                    </div>
                    <DialogDescription>
                        {accountEmail ? `Full log for account: ${accountEmail}` : 'Historical log for this synchronization run.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-secondary/5">
                    {isLoading ? (
                        <div className="py-20 flex justify-center"><PageLoader text="Loading trace..." /></div>
                    ) : events.length === 0 ? (
                        <div className="py-20 text-center text-muted-foreground italic font-mono text-sm">
                            No granular trace events found for this run.
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
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/70">
                                                {event.agent_state}
                                            </span>
                                            {(event as any).emails?.subject && (
                                                <span className="text-[10px] text-primary font-medium truncate max-w-[300px]">
                                                    Re: {(event as any).emails.subject}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {new Date(event.created_at).toLocaleTimeString()}
                                        </span>
                                    </div>

                                    {/* Event Details */}
                                    <div className="bg-card border rounded-lg p-4 shadow-sm">
                                        {event.event_type === 'info' && (
                                            <p className="text-sm text-foreground/90">{event.details?.message}</p>
                                        )}

                                        {event.event_type === 'analysis' && (
                                            <div className="space-y-2">
                                                <p className="text-xs text-foreground italic leading-relaxed">
                                                    "{event.details?.summary}"
                                                </p>
                                                <div className="flex gap-2">
                                                    <span className="text-[9px] bg-secondary px-1.5 py-0.5 rounded font-bold uppercase">
                                                        {event.details?.category}
                                                    </span>
                                                    {event.details?.suggested_actions?.map((a: string) => (
                                                        <span key={a} className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold uppercase">
                                                            {a}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {event.event_type === 'action' && (
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 capitalize">
                                                    Executed: {event.details?.action}
                                                </p>
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                            </div>
                                        )}

                                        {event.event_type === 'error' && (
                                            <p className="text-sm text-red-600 dark:text-red-400 font-bold">
                                                {event.details?.error}
                                            </p>
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

function AnalyticsPage() {
    const { state, actions } = useApp();
    const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
    const [selectedAccountEmail, setSelectedAccountEmail] = useState<string | undefined>(undefined);
    const [isRunTraceOpen, setIsRunTraceOpen] = useState(false);

    useEffect(() => {
        actions.fetchStats();
    }, []);

    if (!state.stats) {
        return <PageLoader text="Loading analytics..." />;
    }

    const handleViewRunTrace = (runId: string, email?: string) => {
        setSelectedRunId(runId);
        setSelectedAccountEmail(email);
        setIsRunTraceOpen(true);
    };

    const { stats } = state;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-primary" />
                Analytics Dashboard
            </h2>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    title="Total Emails"
                    value={stats.totalEmails}
                    color="primary"
                />
                <StatCard
                    title="Spam Caught"
                    value={stats.categoryCounts['spam'] || 0}
                    color="destructive"
                />
                <StatCard
                    title="Actions Taken"
                    value={Object.values(stats.actionCounts).reduce((a, b) => a + b, 0) - (stats.actionCounts['none'] || 0)}
                    color="emerald"
                />
                <StatCard
                    title="Accounts"
                    value={stats.accountCount}
                    color="blue"
                />
            </div>

            {/* Category Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-card border rounded-xl p-6">
                    <h3 className="font-semibold mb-4">Email Categories</h3>
                    <div className="space-y-3">
                        {Object.entries(stats.categoryCounts).map(([category, count]) => (
                            <div key={category} className="flex items-center gap-3">
                                <div className="flex-1">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="capitalize">{category}</span>
                                        <span className="text-muted-foreground">{count}</span>
                                    </div>
                                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary rounded-full transition-all"
                                            style={{ width: `${(count / stats.totalEmails) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-card border rounded-xl p-6">
                    <h3 className="font-semibold mb-4">Actions Taken</h3>
                    <div className="space-y-3">
                        {Object.entries(stats.actionCounts).map(([action, count]) => (
                            <div key={action} className="flex items-center justify-between py-2 border-b last:border-0">
                                <span className="capitalize">{action}</span>
                                <span className="font-medium">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Syncs */}
            <div className="bg-card border rounded-xl p-6">
                <h3 className="font-semibold mb-4">Recent Sync Activity</h3>
                {stats.recentSyncs.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No sync activity yet</p>
                ) : (
                    <div className="space-y-3">
                        {stats.recentSyncs.map((log: any) => {
                            const duration = log.completed_at 
                                ? Math.round((new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()) / 1000)
                                : null;
                                
                            return (
                                <div 
                                    key={log.id} 
                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg hover:bg-secondary/30 transition-colors gap-3 cursor-pointer group"
                                    onClick={() => handleViewRunTrace(log.id, log.email_accounts?.email_address)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-2.5 h-2.5 rounded-full",
                                            log.status === 'success' ? 'bg-emerald-500' :
                                            log.status === 'failed' ? 'bg-destructive' : 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)] animate-pulse'
                                        )} />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium group-hover:text-primary transition-colors">
                                                {log.email_accounts?.email_address || 'System Sync'}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(log.started_at).toLocaleString()}
                                                {duration !== null && (
                                                    <span className="ml-2 px-1.5 py-0.5 bg-secondary rounded-full">
                                                        {duration}s
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs">
                                        <div className="flex flex-col items-end">
                                            <span className="font-bold text-primary">{log.emails_processed} emails</span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {log.emails_deleted} deleted, {log.emails_drafted} drafted
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <RunTraceModal 
                runId={selectedRunId} 
                accountEmail={selectedAccountEmail}
                isOpen={isRunTraceOpen} 
                onOpenChange={setIsRunTraceOpen} 
            />
        </div>
    );
}

function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
    const colorClasses: Record<string, string> = {
        primary: 'bg-primary/10 text-primary',
        destructive: 'bg-destructive/10 text-destructive',
        emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    };

    return (
        <div className="bg-card border rounded-xl p-6">
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className={`text-3xl font-bold ${colorClasses[color] || ''}`}>{value}</p>
        </div>
    );
}

function App() {
    return (
        <ThemeProvider defaultTheme="system" storageKey="email-automator-theme">
            <ErrorBoundary>
                <TerminalProvider>
                    <AppProvider>
                        <AppContent />
                        <ToastContainer />
                    </AppProvider>
                </TerminalProvider>
            </ErrorBoundary>
        </ThemeProvider>
    );
}

export default App;
