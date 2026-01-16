import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import {
    Loader2,
    Database,
    CheckCircle,
    AlertCircle,
    ExternalLink,
    Check,
} from 'lucide-react';
import {
    saveSupabaseConfig,
    validateSupabaseConnection,
} from '../lib/supabase-config';

type WizardStep = 'welcome' | 'credentials' | 'validating' | 'success';

interface SetupWizardProps {
    onComplete: () => void;
}

/**
 * Normalizes Supabase URL input - accepts either full URL or just project ID
 */
function normalizeSupabaseUrl(input: string): string {
    const trimmed = input.trim();
    if (!trimmed) return '';

    // If it starts with http:// or https://, treat as full URL
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
    }

    // Otherwise, treat as project ID and construct full URL
    return `https://${trimmed}.supabase.co`;
}

/**
 * Validates if input looks like a valid Supabase URL or project ID
 */
function validateUrlFormat(input: string): {
    valid: boolean;
    message?: string;
} {
    const trimmed = input.trim();
    if (!trimmed) return { valid: false };

    // Check if it's a full URL
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        try {
            const url = new URL(trimmed);
            if (url.hostname.endsWith('.supabase.co')) {
                return {
                    valid: true,
                    message: "Valid Supabase URL",
                };
            }
            return {
                valid: false,
                message: "URL must be a supabase.co domain",
            };
        } catch {
            return {
                valid: false,
                message: "Invalid URL format",
            };
        }
    }

    // Check if it's a project ID (alphanumeric, typically 20 chars)
    if (/^[a-z0-9]+$/.test(trimmed)) {
        return {
            valid: true,
            message: "Project ID detected",
        };
    }

    return { valid: false, message: "Enter a URL or Project ID" };
}

/**
 * Validates if input looks like a valid Supabase API key
 */
function validateKeyFormat(input: string): {
    valid: boolean;
    message?: string;
} {
    const trimmed = input.trim();
    if (!trimmed) return { valid: false };

    // New publishable keys start with "sb_publishable_" followed by key content
    if (trimmed.startsWith("sb_publishable_")) {
        // Check that there's actual key content after the prefix
        if (trimmed.length > "sb_publishable_".length + 10) {
            return {
                valid: true,
                message: "Valid Publishable Key",
            };
        }
        return {
            valid: false,
            message: "Incomplete Publishable Key",
        };
    }

    // Legacy anon keys are JWT tokens starting with "eyJ"
    if (trimmed.startsWith("eyJ")) {
        if (trimmed.length > 50) {
            return {
                valid: true,
                message: "Valid Anon Key",
            };
        }
        return {
            valid: false,
            message: "Incomplete Anon Key",
        };
    }

    return {
        valid: false,
        message: "Invalid API Key format",
    };
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
    const [step, setStep] = useState<WizardStep>('welcome');
    const [url, setUrl] = useState('');
    const [anonKey, setAnonKey] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [urlTouched, setUrlTouched] = useState(false);
    const [keyTouched, setKeyTouched] = useState(false);

    const handleValidateAndSave = async () => {
        setError(null);
        setStep('validating');

        // Normalize the URL before validation
        const normalizedUrl = normalizeSupabaseUrl(url);
        const trimmedKey = anonKey.trim();

        const result = await validateSupabaseConnection(normalizedUrl, trimmedKey);

        if (result.valid) {
            saveSupabaseConfig({ url: normalizedUrl, anonKey: trimmedKey });
            setStep('success');

            // Completes the flow
            setTimeout(() => {
                onComplete();
            }, 1000);
        } else {
            setError(result.error || 'Connection failed. Please check your credentials.');
            setStep('credentials');
        }
    };

    // Get validation states
    const urlValidation = url ? validateUrlFormat(url) : { valid: false };
    const keyValidation = anonKey ? validateKeyFormat(anonKey) : { valid: false };
    const normalizedUrl = url ? normalizeSupabaseUrl(url) : '';
    const showUrlExpansion = url && !url.startsWith('http') && urlValidation.valid;

    return (
        <Dialog open={true} modal={false}>
            <DialogContent
                className="sm:max-w-md"
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                {step === 'welcome' && (
                    <>
                        <DialogHeader>
                            <div className="flex items-center gap-2 mb-2">
                                <Database className="h-6 w-6 text-primary" />
                                <DialogTitle>Welcome to Email Automator</DialogTitle>
                            </div>
                            <DialogDescription>
                                This application requires a Supabase database to store your emails and automation rules.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <Alert>
                                <AlertDescription>
                                    <strong>No Supabase Setup Detected</strong>
                                    <br />
                                    You can create a free project at{' '}
                                    <a
                                        href="https://supabase.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="underline text-primary inline-flex items-center gap-1"
                                    >
                                        supabase.com
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-2">
                                <h4 className="font-medium text-sm">You will need:</h4>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                    <li>Project URL</li>
                                    <li>Anon Public Key</li>
                                </ul>
                            </div>

                            <Button onClick={() => setStep('credentials')} className="w-full">
                                Continue Setup
                            </Button>
                        </div>
                    </>
                )}

                {step === 'credentials' && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Connect to Supabase</DialogTitle>
                            <DialogDescription>
                                Enter your connection details below.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            {error && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="supabase-url">Project URL or ID</Label>
                                <div className="relative">
                                    <Input
                                        id="supabase-url"
                                        placeholder="https://xxx.supabase.co or project-id"
                                        value={url}
                                        onChange={(e) => {
                                            setUrl(e.target.value);
                                            setUrlTouched(true);
                                        }}
                                        onBlur={() => setUrlTouched(true)}
                                        className={
                                            urlTouched && url
                                                ? urlValidation.valid
                                                    ? 'pr-8 border-green-500'
                                                    : 'pr-8 border-destructive'
                                                : ''
                                        }
                                    />
                                    {urlTouched && url && urlValidation.valid && (
                                        <Check className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                                    )}
                                </div>
                                {showUrlExpansion && (
                                    <div className="flex items-start gap-1.5 text-xs text-green-600 dark:text-green-400">
                                        <Check className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                        <span>Will use: {normalizedUrl}</span>
                                    </div>
                                )}
                                {urlTouched && url && urlValidation.message && !urlValidation.valid && (
                                    <p className="text-xs text-destructive">{urlValidation.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="anon-key">Anon Public Key</Label>
                                <div className="relative">
                                    <Input
                                        id="anon-key"
                                        type="password"
                                        placeholder="eyJ..."
                                        value={anonKey}
                                        onChange={(e) => {
                                            setAnonKey(e.target.value);
                                            setKeyTouched(true);
                                        }}
                                        onBlur={() => setKeyTouched(true)}
                                        className={
                                            keyTouched && anonKey
                                                ? keyValidation.valid
                                                    ? 'pr-8 border-green-500'
                                                    : 'pr-8 border-destructive'
                                                : ''
                                        }
                                    />
                                    {keyTouched && anonKey && keyValidation.valid && (
                                        <Check className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                                    )}
                                </div>
                                {keyTouched && anonKey && keyValidation.message && (
                                    <p
                                        className={`text-xs ${keyValidation.valid ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}
                                    >
                                        {keyValidation.message}
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setStep('welcome')}
                                    className="flex-1"
                                >
                                    Back
                                </Button>
                                <Button
                                    onClick={handleValidateAndSave}
                                    disabled={!urlValidation.valid || !keyValidation.valid}
                                    className="flex-1"
                                >
                                    Connect
                                </Button>
                            </div>
                        </div>
                    </>
                )}

                {step === 'validating' && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Validating Connection</DialogTitle>
                            <DialogDescription>
                                Verifying your credentials with Supabase...
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex flex-col items-center justify-center py-8">
                            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                            <p className="text-sm text-muted-foreground">Please wait...</p>
                        </div>
                    </>
                )}

                {step === 'success' && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Success!</DialogTitle>
                            <DialogDescription>
                                Your database is connected.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex flex-col items-center justify-center py-8">
                            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                            <p className="text-sm text-muted-foreground">Restarting application...</p>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}