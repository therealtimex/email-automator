import { useEffect, useState } from 'react';
import { Mail, LayoutDashboard, Settings, BarChart3, LogOut } from 'lucide-react';
import { ThemeProvider } from './components/theme-provider';
import { ModeToggle } from './components/mode-toggle';
import { Button } from './components/ui/button';
import { AppProvider, useApp } from './context/AppContext';
import { MigrationProvider } from './context/MigrationContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer, toast } from './components/Toast';
import { PageLoader } from './components/LoadingSpinner';
import { SetupWizard } from './components/SetupWizard';
import { Dashboard } from './components/Dashboard';
import { Configuration } from "./components/Configuration";
import { Login } from './components/Login';
import { getSupabaseConfig, validateSupabaseConnection } from './lib/supabase-config';
import { supabase } from './lib/supabase';
import { api } from './lib/api';
import {
    checkMigrationStatus,
    type MigrationStatus,
    isMigrationReminderDismissed
} from './lib/migration-check';
import { MigrationBanner } from './components/migration/MigrationBanner';
import { MigrationModal } from './components/migration/MigrationModal';

type TabType = 'dashboard' | 'config' | 'analytics';

function AppContent() {
    const { state, actions } = useApp();
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
                            <h1 className="text-xl font-bold flex items-center gap-2">
                                <Mail className="w-5 h-5 text-primary" />
                                <span className="hidden sm:inline">RealTimeX Email Automator</span>
                                <span className="sm:hidden">Email AI</span>
                            </h1>
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
            </div>
        </MigrationProvider>
    );
}

function AnalyticsPage() {
    const { state, actions } = useApp();

    useEffect(() => {
        actions.fetchStats();
    }, []);

    if (!state.stats) {
        return <PageLoader text="Loading analytics..." />;
    }

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
                    <div className="space-y-2">
                        {stats.recentSyncs.map((log) => (
                            <div key={log.id} className="flex items-center justify-between py-2 border-b last:border-0">
                                <div className="flex items-center gap-3">
                                    <span className={`w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-emerald-500' :
                                        log.status === 'failed' ? 'bg-destructive' : 'bg-yellow-500'
                                        }`} />
                                    <span className="text-sm">
                                        {new Date(log.started_at).toLocaleString()}
                                    </span>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {log.emails_processed} processed
                                    {log.emails_deleted > 0 && `, ${log.emails_deleted} deleted`}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
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
                <AppProvider>
                    <AppContent />
                    <ToastContainer />
                </AppProvider>
            </ErrorBoundary>
        </ThemeProvider>
    );
}

export default App;
