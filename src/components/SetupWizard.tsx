import { useState } from 'react';
import { AlertCircle, Database, Loader2 } from 'lucide-react';
import { saveSupabaseConfig, validateSupabaseConnection } from '../lib/supabase-config';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { ModeToggle } from './mode-toggle';

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
            // Use relative URL so it works in both dev (vite middleware) and production (express server)
            const response = await fetch('/api/migrate', {
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
            <div className="min-h-screen bg-background flex items-center justify-center p-8 relative">
                <div className="absolute top-4 right-4">
                    <ModeToggle />
                </div>
                <Card className="w-full max-w-lg shadow-2xl">
                    <CardHeader className="text-center">
                        <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                            <Database className="w-8 h-8 text-primary" />
                        </div>
                        <CardTitle className="text-2xl">Database Migration</CardTitle>
                        <CardDescription>Setting up your database schema</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                type="password"
                                placeholder="Database Password (required for migration)"
                                value={dbPassword}
                                onChange={(e) => setDbPassword(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                💡 Enter the password you set when creating your Supabase project
                            </p>
                        </div>

                        {migrationLogs.length > 0 && (
                            <div className="bg-slate-950 text-green-400 p-4 rounded-md font-mono text-xs max-h-64 overflow-y-auto">
                                {migrationLogs.map((log, i) => (
                                    <div key={i}>{log}</div>
                                ))}
                            </div>
                        )}

                        {error && (
                            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex flex-col gap-3">
                        <Button
                            onClick={handleMigrate}
                            disabled={migrating || !dbPassword}
                            className="w-full"
                        >
                            {migrating ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Running Migration...
                                </>
                            ) : (
                                'Run Migration'
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => setStep('config')}
                            className="w-full"
                        >
                            ← Back to Configuration
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-8 relative">
            <div className="absolute top-4 right-4">
                <ModeToggle />
            </div>
            <Card className="w-full max-w-lg shadow-2xl">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                        <Database className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Welcome to Email Automator</CardTitle>
                    <CardDescription>Connect your Supabase database to get started</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Project ID or URL</label>
                        <Input
                            type="text"
                            placeholder="e.g., dphtysocoxwtohdsdbom"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Anon Public Key</label>
                        <Input
                            type="password"
                            placeholder="starts with eyJ..."
                            value={anonKey}
                            onChange={(e) => setAnonKey(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            💡 Found in Supabase Settings → API
                        </p>
                    </div>

                    {error && (
                        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button
                        onClick={handleValidate}
                        disabled={validating || !url || !anonKey}
                        className="w-full"
                    >
                        {validating ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Validating...
                            </>
                        ) : (
                            'Connect & Continue'
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
