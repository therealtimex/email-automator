import React, { useEffect, useState } from 'react';
import { getSupabase } from './lib/supabase';
import { getSupabaseConfig } from './lib/supabase-config';
import { SetupWizard } from './components/SetupWizard';
import { Mail, ShieldCheck, Trash2, Send, RefreshCw, AlertCircle } from 'lucide-react';

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
        const supabase = getSupabase();
        if (!supabase) {
            setNeedsSetup(true);
            setLoading(false);
            return;
        }
        const { data, error } = await supabase
            .from('emails')
            .select('*')
            .order('date', { ascending: false });

        if (error) console.error(error);
        else setEmails(data || []);
        setLoading(false);
    }

    async function handleSync() {
        const supabase = getSupabase();
        if (!supabase) {
            alert('Supabase not configured');
            return;
        }

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
        return <SetupWizard onComplete={() => {
            setNeedsSetup(false);
            fetchEmails();
        }} />;
    }

    return (
        <div className="min-h-screen bg-slate-50 p-8 font-sans">
            <header className="max-w-6xl mx-auto flex justify-between items-center mb-12">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <Mail className="w-8 h-8 text-blue-600" />
                        Email Automator
                    </h1>
                    <p className="text-slate-500">AI-powered inbox zero platform</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={handleSync}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2 shadow-lg shadow-blue-200"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Sync Now
                    </button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                <section className="md:col-span-2 space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                        Recent Analysis
                        <span className="text-sm font-normal text-slate-400 bg-white px-2 py-0.5 rounded border">
                            {emails.length} emails
                        </span>
                    </h2>

                    {loading ? (
                        <div className="bg-white p-12 rounded-2xl border flex flex-col items-center justify-center text-slate-400">
                            <RefreshCw className="w-8 h-8 animate-spin mb-4" />
                            Loading your inbox...
                        </div>
                    ) : emails.length === 0 ? (
                        <div className="bg-white p-20 rounded-2xl border text-center shadow-sm">
                            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Mail className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900">No emails processed yet</h3>
                            <p className="text-slate-500 mt-2 mb-6">Connect your account and trigger a sync to see AI in action.</p>
                        </div>
                    ) : (
                        emails.map(email => (
                            <div key={email.id} className="bg-white p-6 rounded-2xl border shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${email.category === 'spam' ? 'bg-red-500' : 'bg-blue-500'
                                            }`}>
                                            {email.sender[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-900 line-clamp-1">{email.subject}</h3>
                                            <p className="text-sm text-slate-500">{email.sender}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${email.category === 'spam' ? 'bg-red-50' : 'bg-emerald-50 text-emerald-700'
                                            }`}>
                                            {email.category}
                                        </span>
                                        <span className="text-xs text-slate-400">{new Date(email.date).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <p className="text-slate-600 text-sm mb-6 line-clamp-2 italic">
                                    "{email.body_snippet}..."
                                </p>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                        Suggested Action: <span className="text-blue-600">{email.suggested_action}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all text-slate-400 hover:text-red-500">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <button className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all text-slate-400 hover:text-blue-500">
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </section>

                <aside className="space-y-8">
                    <div className="bg-white p-6 rounded-2xl border shadow-sm">
                        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-emerald-500" />
                            Auto-Pilot Status
                        </h2>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                <span className="text-sm text-slate-600">Auto-Trash Spam</span>
                                <div className="w-10 h-5 bg-emerald-500 rounded-full relative">
                                    <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div>
                                </div>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                <span className="text-sm text-slate-600">Smart Drafts</span>
                                <div className="w-10 h-5 bg-slate-200 rounded-full relative">
                                    <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full"></div>
                                </div>
                            </div>
                        </div>
                        <button className="w-full mt-6 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">
                            Configure Rules
                        </button>
                    </div>

                    <div className="bg-blue-600 p-6 rounded-2xl text-white shadow-xl shadow-blue-100 relative overflow-hidden">
                        <div className="relative z-10">
                            <h2 className="text-lg font-bold mb-2">Supabase Sync</h2>
                            <p className="text-blue-100 text-sm mb-4">Your inbox is synchronized with your remote Supabase instance.</p>
                            <div className="flex items-center gap-2 text-xs text-blue-200">
                                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                                Connected to Remote
                            </div>
                        </div>
                        <Mail className="absolute -bottom-6 -right-6 w-32 h-32 text-blue-500 opacity-20" />
                    </div>
                </aside>
            </main>
        </div>
    );
}

export default App;
