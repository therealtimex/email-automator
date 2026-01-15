import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { getSupabaseConfig } from './lib/supabase-config';
import { SetupWizard } from './components/SetupWizard';
import { Mail, ShieldCheck, Trash2, Send, RefreshCw } from 'lucide-react';
import { ThemeProvider } from './components/theme-provider';
import { ModeToggle } from './components/mode-toggle';
import { Button } from './components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/card';

function App() {
    const [emails, setEmails] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [needsSetup, setNeedsSetup] = useState(false);

    useEffect(() => {
        const config = getSupabaseConfig();
        if (!config) {
            setNeedsSetup(true);
            setLoading(false);
        } else {
            fetchEmails();
        }
    }, []);

    async function fetchEmails() {
        setLoading(true);
        const { data, error } = await supabase
            .from('emails')
            .select('*')
            .order('date', { ascending: false });

        if (error) console.error(error);
        else setEmails(data || []);
        setLoading(false);
    }

    async function handleSync() {
        // In a real app, we'd select an accountId
        const { data: accounts } = await supabase.from('email_accounts').select('id').limit(1);
        if (!accounts || accounts.length === 0) {
            alert('Please connect an email account first.');
            return;
        }

        try {
            await fetch('http://localhost:3001/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountId: accounts[0].id })
            });
            alert('Sync started!');
        } catch (e) {
            alert('Failed to trigger sync');
        }
    }

    if (needsSetup) {
        return (
            <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
                <SetupWizard onComplete={() => {
                    setNeedsSetup(false);
                    fetchEmails();
                }} />
            </ThemeProvider>
        );
    }

    return (
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
            <div className="min-h-screen bg-background font-sans text-foreground transition-colors duration-300">
                <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-8">
                        <div>
                            <h1 className="text-xl font-bold flex items-center gap-2">
                                <Mail className="w-5 h-5 text-primary" />
                                RealTimeX Email Automator
                            </h1>
                        </div>
                        <div className="flex gap-4 items-center">
                            <ModeToggle />
                            <Button onClick={handleSync} size="sm" className="shadow-lg shadow-primary/20">
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Sync Now
                            </Button>
                        </div>
                    </div>
                </header>

                <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 p-8 mt-4">
                    <section className="md:col-span-2 space-y-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                Recent Analysis
                            </h2>
                            <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-md border border-border">
                                {emails.length} emails
                            </span>
                        </div>

                        {loading ? (
                            <Card className="p-12 border-dashed flex flex-col items-center justify-center text-muted-foreground">
                                <RefreshCw className="w-8 h-8 animate-spin mb-4" />
                                Loading your inbox...
                            </Card>
                        ) : emails.length === 0 ? (
                            <Card className="p-20 text-center shadow-sm">
                                <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Mail className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-medium">No emails processed yet</h3>
                                <p className="text-muted-foreground mt-2 mb-6">Connect your account and trigger a sync to see AI in action.</p>
                            </Card>
                        ) : (
                            emails.map(email => (
                                <Card key={email.id} className="hover:shadow-md transition-shadow group">
                                    <div className="p-5">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs ${email.category === 'spam' ? 'bg-destructive' : 'bg-primary'
                                                    }`}>
                                                    {email.sender[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">{email.subject}</h3>
                                                    <p className="text-xs text-muted-foreground">{email.sender}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${email.category === 'spam' ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                    }`}>
                                                    {email.category}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">{new Date(email.date).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <p className="text-muted-foreground text-sm mb-4 line-clamp-2 leading-relaxed">
                                            {email.body_snippet}
                                        </p>
                                        <div className="bg-secondary/30 p-3 rounded-lg border border-border/50 flex justify-between items-center">
                                            <div className="flex items-center gap-2 text-xs font-medium">
                                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                                                Suggested: <span className="text-foreground">{email.suggested_action}</span>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-primary">
                                                    <Send className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))
                        )}
                    </section>

                    <aside className="space-y-6">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                    Auto-Pilot Status
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-0">
                                <div className="flex justify-between items-center py-2 border-b border-border text-sm">
                                    <span>Auto-Trash Spam</span>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <span className="text-xs text-muted-foreground">Active</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-border text-sm">
                                    <span>Smart Drafts</span>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-secondary border border-primary/20"></span>
                                        <span className="text-xs text-muted-foreground">Paused</span>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm" className="w-full mt-2">
                                    Configure Rules
                                </Button>
                            </CardContent>
                        </Card>

                        <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 relative overflow-hidden">
                            <div className="relative z-10">
                                <h3 className="font-semibold text-primary mb-1">Supabase Sync</h3>
                                <p className="text-muted-foreground text-xs mb-3">
                                    Real-time connection active
                                </p>
                                <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 w-fit px-2 py-1 rounded-full border border-emerald-500/20">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                    CONNECTED
                                </div>
                            </div>
                            <div className="absolute right-[-20px] bottom-[-20px] opacity-[0.03] dark:opacity-[0.08] text-primary rotate-12 pointer-events-none">
                                <DatabaseIcon className="w-32 h-32" />
                            </div>
                        </div>
                    </aside>
                </main>
            </div>
        </ThemeProvider>
    );
}

// Helper icon component since Database is imported in SetupWizard but not here
function DatabaseIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M3 5V19A9 3 0 0 0 21 19V5" />
            <path d="M3 12A9 3 0 0 0 21 12" />
        </svg>
    )
}

export default App;
