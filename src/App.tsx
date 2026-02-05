import { useEffect, useState } from 'react';
import { Mail, LayoutDashboard, Settings, BarChart3, LogOut, Clock, Cpu, Brain, Zap, AlertCircle, Info, Code, CheckCircle2, UserCircle, Sparkles, FileText } from 'lucide-react';
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
import { Drafts } from './components/Drafts';
import { DraftPreviewModal } from './components/DraftPreviewModal';
import { Configuration } from "./components/Configuration";
import { AccountSettingsPage } from './components/AccountSettingsPage';
import { AutoPilotDashboard } from './components/AutoPilot';
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
import {
    checkForUpdates,
    isUpdatePromptDismissed,
    type VersionInfo
} from './lib/version-check';
import { UpdateBanner } from './components/UpdateBanner';
import { LiveTerminal } from './components/LiveTerminal';
import { ProcessingEvent } from './lib/types';
import { PersonaWizard } from './components/PersonaWizard/PersonaWizard';
import { LearningDashboard } from './components/Analytics/LearningDashboard';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from './components/ui/dialog';
import { VisuallyHidden } from './components/ui/visually-hidden';


type TabType = 'dashboard' | 'drafts' | 'autopilot' | 'config' | 'analytics' | 'account';

import { sounds } from './lib/sounds';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { TTSProvider } from './context/TTSContext';
import { AgentProvider } from './context/AgentContext';
import { AgentOverlay } from './components/AgentOverlay';

function AppContent() {



    const { state, isSubscribed, actions } = useApp();
    const { t } = useLanguage();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [needsSetup, setNeedsSetup] = useState(false);
    const [isSystemInitialized, setIsSystemInitialized] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('dashboard');
    const [processingAuth, setProcessingAuth] = useState(false);
    const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null);
    const [showMigrationBanner, setShowMigrationBanner] = useState(false);
    const [showMigrationModal, setShowMigrationModal] = useState(false);
    const [suppressMigrationBanner, setSuppressMigrationBanner] = useState(false);
    const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
    const [showUpdateBanner, setShowUpdateBanner] = useState(false);
    const [previewEmail, setPreviewEmail] = useState<any | null>(null);
    const [showPersonaWizard, setShowPersonaWizard] = useState(false);
    const [personaDismissed, setPersonaDismissed] = useState(false);

    // Check for Persona completion
    useEffect(() => {
        if (state.isInitialized && state.isAuthenticated && state.settings && !state.isLoading) {
            // If persona not completed, and not already showing, and not dismissed for this session
            if (!state.settings.persona_completed && !showPersonaWizard && !personaDismissed) {
                // Small delay to allow UI to settle
                const timer = setTimeout(() => {
                    setShowPersonaWizard(true);
                }, 2000);
                return () => clearTimeout(timer);
            }
        }
    }, [state.isInitialized, state.isAuthenticated, state.settings, state.isLoading, personaDismissed]);

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
        return <PageLoader text={t('app.connecting')} />;
    }

    // Initial App Status Check
    useEffect(() => {
        const checkAppStatus = async () => {
            const config = getSupabaseConfig();

            if (!config) {
                setNeedsSetup(true);
                setLoading(false);
                return;
            }

            try {
                // 1. Check if DB is initialized (init_state exists and is true)
                const { data: initData, error: initError } = await supabase
                    .from('init_state')
                    .select('is_initialized')
                    .single();

                if (initError) {
                    console.warn('[App] Init check error (might be fresh DB):', initError);
                    if ((initError as any).code === '42P01') {
                        setIsSystemInitialized(false);
                    }
                } else {
                    setIsSystemInitialized(initData.is_initialized > 0);
                }

                // 2. Initial session check
                const { data: { session } } = await supabase.auth.getSession();
                setUser(session?.user ?? null);

                // 3. Migration Check (Only for authenticated users)
                if (session?.user) {
                    const status = await checkMigrationStatus(supabase);
                    setMigrationStatus(status.needsMigration ? status : null);
                    if (status.needsMigration && !isMigrationReminderDismissed()) {
                        setShowMigrationBanner(true);
                    }
                }

                // 4. Version Check (Check for updates from npm)
                const updateInfo = await checkForUpdates();
                if (updateInfo && !isUpdatePromptDismissed()) {
                    setVersionInfo(updateInfo);
                    setShowUpdateBanner(true);
                }
            } catch (err) {
                console.error('[App] Status check failed:', err);
                // If it's a connection error, but we have config, maybe don't force setup
                // unless it's an explicit "Invalid API key" error
                if (err instanceof Error && err.message.includes('Invalid API key')) {
                    setNeedsSetup(true);
                }
            } finally {
                setLoading(false);
            }
        };

        checkAppStatus();

        // Auth listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (!session) {
                setMigrationStatus(null);
                setShowMigrationBanner(false);
            }
        });

        // Resume AudioContext on first interaction
        const resumeAudio = () => {
            if (sounds.isEnabled()) {
                const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                if (ctx.state === 'suspended') ctx.resume();
            }
            window.removeEventListener('click', resumeAudio);
            window.removeEventListener('keydown', resumeAudio);
        };
        window.addEventListener('click', resumeAudio);
        window.addEventListener('keydown', resumeAudio);

        return () => {
            subscription.unsubscribe();
            window.removeEventListener('click', resumeAudio);
            window.removeEventListener('keydown', resumeAudio);
        };
    }, []);

    // Data loading when authenticated
    useEffect(() => {
        if (user) {
            // Immediate fetch
            actions.fetchAccounts();
            actions.fetchRules();
            actions.fetchSettings();
            actions.fetchProfile();

            // Retry accounts fetch after a delay to handle race conditions
            // where Supabase client or API might not be fully ready
            const retryTimer = setTimeout(() => {
                console.debug('[App] Retrying fetchAccounts after initialization');
                actions.fetchAccounts();
            }, 1000);

            return () => clearTimeout(retryTimer);
        }
    }, [user]);

    // Keep-alive ping to backend
    useEffect(() => {
        const ping = async () => {
            try {
                await api.healthCheck();
            } catch (e) {
                console.warn('[App] Keep-alive ping failed');
            }
        };
        ping();
        const interval = setInterval(ping, 30000);
        return () => clearInterval(interval);
    }, []);

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

    if (loading) {
        return (
            <>
                <PageLoader text={t('app.loadingWorkspace')} />
                <AgentOverlay className="z-[80]" />
            </>
        );
    }

    if (needsSetup) {
        return (
            <>
                <SetupWizard onComplete={() => setNeedsSetup(false)} />
                <AgentOverlay className="z-[80]" />
            </>
        );
    }

    if (!user) {
        return (
            <>
                <Login
                    onSuccess={() => actions.fetchProfile()}
                    onConfigure={() => setNeedsSetup(true)}
                    isInitialized={isSystemInitialized}
                />
                <AgentOverlay className="z-[80]" />
            </>
        );
    }

    const handleLogout = async () => {
        await supabase.auth.signOut();
        toast.success(t('app.loggedOut'));
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
                                <Logo className="w-8 h-8" />
                                <span className="hidden sm:inline">{t('app.name')}</span>
                                <span className="sm:hidden">Email AI</span>
                            </button>

                            {/* Real-time Status Indicator */}
                            <div className={cn(
                                "flex items-center gap-1.5 px-2 h-6 rounded-full text-[10px] font-bold border transition-colors",
                                isSubscribed
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
                                    : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:text-yellow-400"
                            )}>
                                <div className="relative flex items-center justify-center">
                                    {isSubscribed && (
                                        <span className="absolute inline-flex h-3 w-3 rounded-full bg-emerald-500/40 animate-ping" />
                                    )}
                                    <div className={cn(
                                        "relative w-2 h-2 rounded-full",
                                        isSubscribed ? "bg-emerald-500" : "bg-yellow-500"
                                    )} />
                                </div>
                                <span className="hidden xs:inline leading-none">{isSubscribed ? t('app.statusLive') : t('app.statusOffline')}</span>
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
                                    <span className="hidden sm:inline">{t('nav.dashboard')}</span>
                                </Button>
                                <Button
                                    variant={activeTab === 'drafts' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setActiveTab('drafts')}
                                    className="gap-2"
                                >
                                    <FileText className="w-4 h-4" />
                                    <span className="hidden sm:inline">{t('nav.drafts') || 'Drafts'}</span>
                                </Button>
                                <Button
                                    variant={activeTab === 'autopilot' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setActiveTab('autopilot')}
                                    className="gap-2"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    <span className="hidden sm:inline">{t('nav.autopilot')}</span>
                                </Button>
                                <Button
                                    variant={activeTab === 'analytics' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setActiveTab('analytics')}
                                    className="gap-2"
                                >
                                    <BarChart3 className="w-4 h-4" />
                                    <span className="hidden sm:inline">{t('nav.analytics')}</span>
                                </Button>
                                <Button
                                    variant={activeTab === 'config' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setActiveTab('config')}
                                    className="gap-2"
                                >
                                    <Settings className="w-4 h-4" />
                                    <span className="hidden sm:inline">{t('nav.configuration')}</span>
                                </Button>
                            </nav>
                            <div className="h-6 w-px bg-border/50 mx-2 hidden sm:block" />
                            <LanguageSwitcher />
                            <ModeToggle />
                            <Button
                                variant={activeTab === 'account' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setActiveTab('account')}
                                className="text-muted-foreground hover:text-foreground p-0 w-8 h-8 rounded-full overflow-hidden border"
                                title={t('nav.accountSettings')}
                            >
                                {state.profile?.avatar_url ? (
                                    <img src={state.profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <UserCircle className="w-5 h-5" />
                                )}
                            </Button>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="max-w-7xl mx-auto p-4 sm:p-8 mt-4 mb-12">
                    {activeTab === 'dashboard' && <Dashboard />}
                    {activeTab === 'drafts' && <Drafts onPreview={setPreviewEmail} />}
                    {activeTab === 'autopilot' && <AutoPilotDashboard />}
                    {activeTab === 'config' && <Configuration />}
                    {activeTab === 'analytics' && <AnalyticsPage />}
                    {activeTab === 'account' && <AccountSettingsPage />}
                </main>

                <footer className="max-w-7xl mx-auto px-4 sm:px-8 pb-8 text-center sm:text-left">
                    <p className="text-[10px] font-medium text-muted-foreground/40 uppercase tracking-[0.2em]">
                        Email Automator <span className="mx-1">•</span> v{import.meta.env.VITE_APP_VERSION}
                    </p>
                </footer>

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

                {/* Update Banner */}
                {versionInfo && showUpdateBanner && (
                    <UpdateBanner
                        versionInfo={versionInfo}
                        onDismiss={() => setShowUpdateBanner(false)}
                    />
                )}

                {migrationStatus && (
                    <MigrationModal
                        open={showMigrationModal}
                        onOpenChange={setShowMigrationModal}
                        status={migrationStatus}
                    />
                )}

                {/* Draft Preview Modal */}
                {previewEmail && (
                    <DraftPreviewModal
                        email={previewEmail}
                        onClose={() => setPreviewEmail(null)}
                        onSend={async (emailId) => {
                            // Email already sent by DraftPreviewModal with compose fields
                            // Just close the modal
                            setPreviewEmail(null);
                        }}
                        onDismiss={async (emailId) => {
                            const res = await api.dismissDraft(emailId);
                            if (res.data?.success) {
                                toast.success(t('drafts.dismissSuccess') || 'Draft dismissed');
                                setPreviewEmail(null);
                            } else {
                                toast.error(t('drafts.dismissError') || 'Failed to dismiss draft');
                            }
                        }}
                    />
                )}

                <LiveTerminal />
                <AgentOverlay />

                <Dialog open={showPersonaWizard} onOpenChange={(open) => {

                    if (!open) setPersonaDismissed(true);
                    setShowPersonaWizard(open);
                }}>
                    <DialogContent className="max-w-3xl border-none bg-transparent shadow-none p-0 sm:max-w-3xl">
                        <VisuallyHidden>
                            <DialogTitle>Persona Setup Wizard</DialogTitle>
                        </VisuallyHidden>
                        <PersonaWizard
                            onComplete={() => {
                                setShowPersonaWizard(false);
                                actions.fetchSettings(); // Refresh settings to update state
                            }}
                            onClose={() => {
                                setShowPersonaWizard(false);
                                setPersonaDismissed(true);
                            }}
                        />
                    </DialogContent>
                </Dialog>
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
    const { t } = useLanguage();
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
                        <DialogTitle>{t('trace.runTrace')}</DialogTitle>
                    </div>
                    <DialogDescription>
                        {accountEmail ? t('trace.fullLogFor').replace('{email}', accountEmail) : t('trace.historicalLog')}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-secondary/5">
                    {isLoading ? (
                        <div className="py-20 flex justify-center"><PageLoader text={t('trace.loadingTrace')} /></div>
                    ) : events.length === 0 ? (
                        <div className="py-20 text-center text-muted-foreground italic font-mono text-sm">
                            {t('trace.noTraceEvents')}
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

                                                {event.details?.usage && (
                                                    <div className="flex gap-3 pt-1.5 mt-1 border-t border-border/50 text-[9px] text-muted-foreground">
                                                        <span>In: <b>{event.details.usage.prompt_tokens}</b></span>
                                                        <span>Out: <b>{event.details.usage.completion_tokens}</b></span>
                                                        <span>Total: <span className="text-primary font-bold">{event.details.usage.total_tokens}</span></span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {event.event_type === 'action' && (
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 capitalize">
                                                    {t('dashboard.done')} {event.details?.action}
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
    const { t } = useLanguage();
    const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
    const [selectedAccountEmail, setSelectedAccountEmail] = useState<string | undefined>(undefined);
    const [isRunTraceOpen, setIsRunTraceOpen] = useState(false);

    const [activeSubTab, setActiveSubTab] = useState<'overview' | 'learning'>('overview');

    useEffect(() => {
        actions.fetchStats();
    }, []);

    if (!state.stats) {
        return <PageLoader text={t('common.loading')} />;
    }

    const handleViewRunTrace = (runId: string, email?: string) => {
        setSelectedRunId(runId);
        setSelectedAccountEmail(email);
        setIsRunTraceOpen(true);
    };

    const { stats } = state;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-primary" />
                    {t('analytics.title')}
                </h2>

                <div className="flex p-1 bg-muted rounded-lg w-full md:w-auto">
                    <button
                        onClick={() => setActiveSubTab('overview')}
                        className={`flex-1 md:w-32 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${activeSubTab === 'overview'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-background/50'
                            }`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveSubTab('learning')}
                        className={`flex-1 md:w-32 px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${activeSubTab === 'learning'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-background/50'
                            }`}
                    >
                        <Brain className="w-3.5 h-3.5" />
                        Learning
                    </button>
                </div>
            </div>

            {activeSubTab === 'learning' ? (
                <LearningDashboard />
            ) : (
                <div className="space-y-8">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard
                            title={t('analytics.totalEmails')}
                            value={stats.totalEmails}
                            color="primary"
                        />
                        <StatCard
                            title={t('analytics.spamCaught')}
                            value={stats.categoryCounts['spam'] || 0}
                            color="destructive"
                        />
                        <StatCard
                            title={t('analytics.actionsTaken')}
                            value={Object.values(stats.actionCounts).reduce((a, b) => a + b, 0) - (stats.actionCounts['none'] || 0)}
                            color="emerald"
                        />
                        <StatCard
                            title={t('analytics.accounts')}
                            value={stats.accountCount}
                            color="blue"
                        />
                    </div>

                    {/* Category Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-card border rounded-xl p-6">
                            <h3 className="font-semibold mb-4">{t('analytics.categories')}</h3>
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
                            <h3 className="font-semibold mb-4">{t('analytics.actionsTaken')}</h3>
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
                        <h3 className="font-semibold mb-4">{t('analytics.recentActivity')}</h3>
                        {stats.recentSyncs.length === 0 ? (
                            <p className="text-muted-foreground text-sm">{t('analytics.noActivity')}</p>
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
                                                        {log.email_accounts?.email_address || t('common.systemSync')}
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
                                                    <span className="font-bold text-primary">{t('analytics.emails').replace('{count}', log.emails_processed.toString())}</span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {t('analytics.deleted').replace('{count}', log.emails_deleted.toString())}, {t('analytics.drafted').replace('{count}', log.emails_drafted.toString())}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

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
        <LanguageProvider>
            <ThemeProvider defaultTheme="system" storageKey="email-automator-theme">
                <ErrorBoundary>
                    <TerminalProvider>
                        <TTSProvider>
                            <AgentProvider>
                                <AppProvider>
                                    <AppContent />
                                    <ToastContainer />
                                </AppProvider>
                            </AgentProvider>
                        </TTSProvider>
                    </TerminalProvider>


                </ErrorBoundary>
            </ThemeProvider>
        </LanguageProvider>
    );
}

export default App;
