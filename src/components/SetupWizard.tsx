import React, { useState } from 'react';
import { AlertCircle, Database, Loader2 } from 'lucide-react';
import { saveSupabaseConfig, validateSupabaseConnection } from '../lib/supabase-config';

interface SetupWizardProps {
    onComplete: () => void;
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
    const [url, setUrl] = useState('');
    const [anonKey, setAnonKey] = useState('');
    const [projectRef, setProjectRef] = useState('');
    const [dbPassword, setDbPassword] = useState('');
    const [validating, setValidating] = useState(false);
    const [migrating, setMigrating] = useState(false);
    const [migrationLogs, setMigrationLogs] = useState<string[]>([]);
    const [error, setError] = useState('');
    const [step, setStep] = useState<'config' | 'migrate'>('config');

    const handleValidate = async () => {
        setValidating(true);
        setError('');

        // Auto-construct URL if user entered a project ID instead
        let finalUrl = url;
        if (!url.startsWith('http')) {
            // Assume it's a project ID
            finalUrl = `https://${url}.supabase.co`;
            setUrl(finalUrl);
        }

        const result = await validateSupabaseConnection(finalUrl, anonKey);

        if (result.valid) {
            saveSupabaseConfig({ url: finalUrl, anonKey });

            // Extract project ref from URL
            const match = finalUrl.match(/https:\/\/([a-zA-Z0-9_-]+)\.supabase\.co/);
            if (match) {
                setProjectRef(match[1]);
                setStep('migrate');
            } else {
                setError('Could not extract project reference from URL');
            }
        } else {
            setError(result.error || 'Invalid Supabase credentials or connection failed');
        }

        setValidating(false);
    };

    const handleMigrate = async () => {
        setMigrating(true);
        setMigrationLogs([]);
        setError('');

        try {
            const response = await fetch('http://localhost:3002/api/migrate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectRef, dbPassword })
            });

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const text = decoder.decode(value);
                    const lines = text.split('\n').filter(l => l.trim());
                    setMigrationLogs(prev => [...prev, ...lines]);
                }
            }

            setMigrating(false);
            // Reload page to reinitialize Supabase client with new config
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (err: any) {
            setError(`Migration failed: ${err.message}`);
            setMigrating(false);
        }
    };

    if (step === 'migrate') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
                <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-2xl w-full">
                    <div className="text-center mb-8">
                        <Database className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                        <h1 className="text-3xl font-bold text-slate-900">Database Migration</h1>
                        <p className="text-slate-500 mt-2">Setting up your email automator schema</p>
                    </div>

                    <div className="space-y-4 mb-6">
                        <input
                            type="password"
                            placeholder="Database Password (optional)"
                            value={dbPassword}
                            onChange={(e) => setDbPassword(e.target.value)}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {migrationLogs.length > 0 && (
                        <div className="bg-slate-900 text-green-400 p-4 rounded-xl font-mono text-sm max-h-64 overflow-y-auto mb-6">
                            {migrationLogs.map((log, i) => (
                                <div key={i}>{log}</div>
                            ))}
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleMigrate}
                        disabled={migrating}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {migrating ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Running Migration...
                            </>
                        ) : (
                            'Run Migration'
                        )}
                    </button>

                    <button
                        onClick={() => setStep('config')}
                        className="w-full mt-4 text-slate-600 hover:text-slate-900"
                    >
                        ← Back to Configuration
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
            <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-2xl w-full">
                <div className="text-center mb-8">
                    <Database className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-slate-900">Welcome to Email Automator</h1>
                    <p className="text-slate-500 mt-2">Connect your Supabase database to get started</p>
                </div>

                <div className="space-y-4 mb-6">
                    <input
                        type="text"
                        placeholder="Project ID or URL (e.g., dphtysocoxwtohdsdbom)"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                        type="password"
                        placeholder="Supabase Anon Key"
                        value={anonKey}
                        onChange={(e) => setAnonKey(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        {error}
                    </div>
                )}

                <button
                    onClick={handleValidate}
                    disabled={validating || !url || !anonKey}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {validating ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Validating...
                        </>
                    ) : (
                        'Connect & Continue'
                    )}
                </button>
            </div>
        </div>
    );
}
