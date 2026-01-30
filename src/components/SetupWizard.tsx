import { useState, useRef, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
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
    Terminal,
    Rocket,
    Settings,
    Shield,
    Globe,
    Key,
    User,
    ChevronRight,
    ArrowLeft,
    Sparkles,
    Cpu,
    Zap,
    Boxes,
    Cpu as Engine,
    X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import {
    saveSupabaseConfig,
    validateSupabaseConnection,
} from '../lib/supabase-config';
import { checkMigrationStatus } from '../lib/migration-check';
import { Logo } from './Logo';

type WizardStep = 'welcome' | 'type' | 'managed-token' | 'managed-org' | 'provisioning' | 'validating' | 'credentials' | 'migration';

interface SetupWizardProps {
    onComplete: () => void;
    open?: boolean;
    canClose?: boolean;
}

interface LogEntry {
    type: 'stdout' | 'stderr' | 'info' | 'error' | 'success';
    message: string;
    timestamp: number;
}

/**
 * Normalizes Supabase URL input - accepts either full URL or just project ID
 */
function normalizeSupabaseUrl(input: string): string {
    const trimmed = input.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    return `https://${trimmed}.supabase.co`;
}

/**
 * Validates if input looks like a valid Supabase URL or project ID
 */
function validateUrlFormat(input: string): { valid: boolean; message?: string } {
    const trimmed = input.trim();
    if (!trimmed) return { valid: false };
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        try {
            const url = new URL(trimmed);
            if (url.hostname.endsWith('.supabase.co')) return { valid: true, message: "Valid Supabase URL" };
            return { valid: false, message: "URL must be a supabase.co domain" };
        } catch {
            return { valid: false, message: "Invalid URL format" };
        }
    }
    if (/^[a-z0-9]+$/.test(trimmed)) return { valid: true, message: "Project ID detected" };
    return { valid: false, message: "Enter a URL or Project ID" };
}

/**
 * Validates if input looks like a valid Supabase API key
 */
function validateKeyFormat(input: string): { valid: boolean; message?: string } {
    const trimmed = input.trim();
    if (!trimmed) return { valid: false };
    if (trimmed.startsWith("sb_publishable_")) {
        return trimmed.length > 25 ? { valid: true, message: "Valid Publishable Key" } : { valid: false, message: "Incomplete Key" };
    }
    if (trimmed.startsWith("eyJ")) {
        return trimmed.length > 50 ? { valid: true, message: "Valid Anon Key" } : { valid: false, message: "Incomplete Key" };
    }
    return { valid: false, message: "Invalid API Key format" };
}

export function SetupWizard({ onComplete, open = true, canClose = false }: SetupWizardProps) {
    if (!open) return null;

    const [step, setStep] = useState<WizardStep>('welcome');

    // Managed Flow State
    const [accessToken, setAccessToken] = useState('');
    const [orgs, setOrgs] = useState<any[]>([]);
    const [selectedOrg, setSelectedOrg] = useState<string>('');
    const [isFetchingOrgs, setIsFetchingOrgs] = useState(false);
    const [customProjectName, setCustomProjectName] = useState('Email-Automator-AI');
    const [selectedRegion, setSelectedRegion] = useState('us-east-1');

    // Manual/Result State
    const [url, setUrl] = useState('');
    const [anonKey, setAnonKey] = useState('');
    const [projectId, setProjectId] = useState('');
    const [dbPass, setDbPass] = useState('');

    // UI/Log State
    const [error, setError] = useState<string | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const logEndRef = useRef<HTMLDivElement>(null);
    const [isMigrating, setIsMigrating] = useState(false);

    useEffect(() => {
        if (logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    const addLog = (type: LogEntry['type'], message: string) => {
        setLogs(prev => [...prev, { type, message, timestamp: Date.now() }]);
    };

    const handleFetchOrgs = async () => {
        setError(null);
        setIsFetchingOrgs(true);
        try {
            const trimmedToken = accessToken.trim();
            const response = await fetch('/api/setup/organizations', {
                headers: { 'Authorization': `Bearer ${trimmedToken}` }
            });
            const data = await response.json();
            if (response.ok) {
                setOrgs(data);
                // Auto-select first organization
                if (data && data.length > 0) {
                    setSelectedOrg(data[0].id);
                }
                setStep('managed-org');
            } else {
                setError(data.error || 'Failed to fetch organizations. Check your token.');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsFetchingOrgs(false);
        }
    };

    const handleAutoProvision = async () => {
        setError(null);
        setStep('provisioning');
        setLogs([]);
        addLog('info', 'Connecting to Supabase provisioning engine...');

        try {
            const response = await fetch('/api/setup/auto-provision', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken.trim()}`
                },
                body: JSON.stringify({
                    orgId: selectedOrg,
                    projectName: customProjectName,
                    region: selectedRegion
                })
            });

            if (!response.body) throw new Error('No response body');
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const event = JSON.parse(line.slice(6));
                            if (event.type === 'info') addLog('info', event.data);
                            if (event.type === 'project_id') setProjectId(event.data);
                            if (event.type === 'success') {
                                const newUrl = event.data.url;
                                const newAnonKey = event.data.anonKey;
                                setUrl(newUrl);
                                setAnonKey(newAnonKey);
                                setDbPass(event.data.dbPass);
                                addLog('success', '✨ Project ready! Initializing database...');

                                // Save config immediately so we don't lose it if window reloads
                                saveSupabaseConfig({
                                    url: normalizeSupabaseUrl(newUrl),
                                    anonKey: newAnonKey.trim()
                                });

                                // Proceed to migration automatically
                                setTimeout(() => handleRunMigration(event.data.projectId, accessToken.trim()), 1500);
                            }
                            if (event.type === 'error') {
                                setError(event.data);
                                addLog('error', event.data);
                            }
                        } catch (e) {
                            console.error('JSON parse error', e);
                        }
                    }
                }
            }
        } catch (err: any) {
            setError(err.message);
            addLog('error', `Provisioning failed: ${err.message}`);
        }
    };

    const handleRunMigration = async (overrideProjectId?: string, overrideToken?: string) => {
        const targetProjectId = overrideProjectId || projectId || url.split('//')[1]?.split('.')[0];
        const targetToken = (overrideToken || accessToken).trim();

        if (!targetProjectId || !targetToken) {
            setError('Project ID and Access Token are required for migration.');
            return;
        }

        setStep('migration');
        setError(null);
        setIsMigrating(true);
        setLogs([]);
        addLog('info', '📦 Preparing database schema initialization...');

        try {
            const response = await fetch('/api/migrate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectRef: targetProjectId,
                    dbPassword: dbPass,
                    accessToken: targetToken
                })
            });

            if (!response.body) throw new Error('No response body');
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const event = JSON.parse(line.slice(6));
                            if (event.type === 'stdout') addLog('info', event.data);
                            if (event.type === 'stderr') addLog('info', `⚠️ ${event.data}`);
                            if (event.type === 'info') addLog('info', event.data);
                            if (event.type === 'error') addLog('error', event.data);
                            if (event.type === 'done' && event.data === 'success') {
                                addLog('success', '✅ Database setup complete!');

                                // Ensure config is saved
                                saveSupabaseConfig({
                                    url: normalizeSupabaseUrl(url),
                                    anonKey: anonKey.trim()
                                });

                                // Auto redirect immediately
                                onComplete();
                                window.location.reload();
                            }
                            else if (event.type === 'done') {
                                setError('Migration failed. Check terminal logs for details.');
                            }
                        } catch (e) {
                            // Non-JSON line or partial chunk, skip
                        }
                    }
                }
            }
        } catch (err: any) {
            setError(err.message);
            addLog('error', `Migration failed: ${err.message}`);
        } finally {
            setIsMigrating(false);
        }
    };

    const handleSaveManual = async () => {
        setError(null);
        setStep('validating');
        const normalizedUrl = normalizeSupabaseUrl(url);
        const trimmedKey = anonKey.trim();
        const result = await validateSupabaseConnection(normalizedUrl, trimmedKey);

        if (result.valid) {
            saveSupabaseConfig({ url: normalizedUrl, anonKey: trimmedKey });

            // Check if database actually needs migration before forcing that step
            try {
                const tempClient = createClient(normalizedUrl, trimmedKey);
                const status = await checkMigrationStatus(tempClient);

                if (status.needsMigration) {
                    setStep('migration');
                } else {
                    // Already migrated!
                    addLog('success', '✨ Database is already up-to-date! Redirecting...');
                    onComplete();
                    window.location.reload();
                }
            } catch (err) {
                console.warn('[SetupWizard] Migration check failed during manual connect:', err);
                // Fallback: show migration step just in case
                setStep('migration');
            }
        } else {
            setError(result.error || 'Connection failed.');
            setStep('credentials');
        }
    };

    const TerminalLogs = () => (
        <div className="bg-slate-950 rounded-2xl p-4 font-mono text-[10px] h-[240px] overflow-y-auto mb-4 border border-white/5 shadow-inner custom-scrollbar relative">
            <div className="absolute top-2 right-4 flex items-center gap-2 text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest pointer-events-none">
                <Terminal size={10} /> Live Feed
            </div>
            {logs.map((log, i) => (
                <div key={i} className={cn(
                    "mb-1 break-all transition-all duration-300",
                    log.type === 'error' ? 'text-red-400 font-bold' :
                        log.type === 'success' ? 'text-green-400 font-bold' :
                            log.type === 'info' ? 'text-blue-300' : 'text-slate-400'
                )}>
                    <span className="text-slate-600 mr-2 tabular-nums">[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                    {log.message}
                </div>
            ))}
            {logs.length === 0 && <div className="text-slate-600 italic animate-pulse">Awaiting kernel signals...</div>}
            <div ref={logEndRef} />
        </div>
    );

    const stepVariants = {
        initial: { opacity: 0, x: 20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 }
    };

    const StatusBadge = ({ step: s, label }: { step: WizardStep | WizardStep[], label: string }) => {
        const isActive = Array.isArray(s) ? s.includes(step) : step === s;
        return (
            <div className={cn(
                "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-500",
                isActive ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground opacity-40"
            )}>
                {label}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-0 md:p-8">
            <div className="w-full h-full max-w-6xl mx-auto overflow-hidden bg-background/80 backdrop-blur-xl border border-border/50 shadow-2xl rounded-3xl flex">
                {/* Left Sidebar - Visual Identity & Progress */}
                <div className="w-[280px] bg-muted/30 border-r border-border/10 p-8 flex flex-col justify-between relative overflow-hidden hidden md:flex shrink-0">

                    <div className="space-y-8 relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-primary rounded-lg flex-shrink-0">
                                <Logo className="w-5 h-5 text-primary-foreground" />
                            </div>
                            <span className="font-black italic tracking-tighter uppercase text-xs truncate">Automator Forge</span>
                        </div>

                        <div className="space-y-6">
                            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-muted-foreground/30 ml-1">Assembly Phase</p>
                            <div className="space-y-4 px-1">
                                <StatusBadge step="welcome" label="Initiation" />
                                <StatusBadge step={['type', 'managed-token', 'credentials']} label="Coordinates" />
                                <StatusBadge step={['managed-org', 'provisioning', 'validating']} label="Foundation" />
                                <StatusBadge step="migration" label="Sync" />
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 space-y-4">
                        <div className="p-4 rounded-2xl bg-background/40 backdrop-blur-md border border-white/5 space-y-2 group hover:border-primary/20 transition-all">
                            <div className="flex items-center gap-2 text-primary">
                                <Zap size={14} className="animate-pulse" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">RealTimeX Sync</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                                Deploying zero-latency infrastructure for your AI processing engine.
                            </p>
                        </div>
                        <p className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-[0.4em] px-2 text-center">
                            v0.35.0 // Stable Build
                        </p>
                    </div>
                </div>

                {/* Right Side - Interactive Surface */}
                <div className="flex-1 p-8 md:p-12 flex flex-col relative">
                    {canClose && (
                        <button
                            onClick={onComplete}
                            className="absolute top-6 right-6 p-2 rounded-full hover:bg-secondary transition-colors z-[60]"
                            title="Close"
                        >
                            <X className="w-5 h-5 text-muted-foreground opacity-40 hover:opacity-100 transition-opacity" />
                        </button>
                    )}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            variants={stepVariants}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="flex-1 flex flex-col"
                        >
                            {step === 'welcome' && (
                                <div className="flex-1 flex flex-col justify-center space-y-8">
                                    <div className="space-y-2">
                                        <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
                                            Initialize <span className="text-primary italic">Automator</span>
                                        </h2>
                                        <p className="text-sm text-muted-foreground font-medium max-w-sm">
                                            Your specialized environment for high-frequency inbox intelligence is ready for assembly.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 flex flex-col gap-2 group hover:bg-primary/5 hover:border-primary/20 transition-all">
                                            <Shield className="w-5 h-5 text-primary" />
                                            <p className="text-[10px] font-bold uppercase tracking-widest">Encrypted</p>
                                            <p className="text-[10px] text-muted-foreground">Self-hosted data security.</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 flex flex-col gap-2 group hover:bg-primary/5 hover:border-primary/20 transition-all">
                                            <Zap className="w-5 h-5 text-primary" />
                                            <p className="text-[10px] font-bold uppercase tracking-widest">Turbo</p>
                                            <p className="text-[10px] text-muted-foreground">Sub-second AI reasoning.</p>
                                        </div>
                                    </div>

                                    <Button onClick={() => setStep('type')} size="lg" className="h-14 rounded-2xl text-md font-bold uppercase tracking-widest group shadow-xl hover:shadow-primary/20 transition-all active:scale-95 bg-primary text-primary-foreground hover:bg-primary/90">
                                        Get Started
                                        <ArrowLeft className="w-5 h-5 ml-4 rotate-180 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </div>
                            )}

                            {step === 'type' && (
                                <div className="flex-1 flex flex-col justify-center space-y-6">
                                    <div className="space-y-1">
                                        <h3 className="text-2xl font-black uppercase italic tracking-tighter">Connection Mode</h3>
                                        <p className="text-xs text-muted-foreground font-bold tracking-widest uppercase">Select deployment vector</p>
                                    </div>

                                    <div className="grid gap-4">
                                        <button
                                            onClick={() => setStep('managed-token')}
                                            className="group relative flex items-center justify-between p-6 rounded-2xl bg-primary/5 border border-primary/20 hover:bg-primary/10 hover:border-primary/40 transition-all text-left"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-primary rounded-xl shadow-lg ring-4 ring-primary/10">
                                                    <Rocket className="w-6 h-6 text-primary-foreground" />
                                                </div>
                                                <div>
                                                    <p className="font-black uppercase italic text-sm tracking-tight">Quick Ignition</p>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Auto-Provision via Token</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-primary opacity-50 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
                                        </button>

                                        <button
                                            onClick={() => setStep('credentials')}
                                            className="group relative flex items-center justify-between p-6 rounded-2xl border border-border hover:bg-muted/50 transition-all text-left"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-muted rounded-xl">
                                                    <Engine className="w-6 h-6 text-muted-foreground" />
                                                </div>
                                                <div>
                                                    <p className="font-black uppercase italic text-sm tracking-tight text-foreground/80">Manual Sync</p>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Existing Credentials</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-muted-foreground opacity-50 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
                                        </button>
                                    </div>

                                    <button onClick={() => setStep('welcome')} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 hover:text-primary pt-4 transition-colors">
                                        <ArrowLeft size={12} /> Abort Access
                                    </button>
                                </div>
                            )}

                            {step === 'managed-token' && (
                                <div className="flex-1 flex flex-col justify-center space-y-6">
                                    <div className="space-y-1">
                                        <h3 className="text-2xl font-black uppercase italic tracking-tighter">Forge Token</h3>
                                        <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">Supabase API coordinates</p>
                                    </div>

                                    {error && (
                                        <Alert variant="destructive" className="rounded-xl bg-destructive/5 text-destructive border-destructive/20 text-[11px] font-bold">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>{error}</AlertDescription>
                                        </Alert>
                                    )}

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Personal Access Token</Label>
                                            <div className="relative">
                                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/30" size={14} />
                                                <Input
                                                    type="password"
                                                    placeholder="sbp_xxxxxxxxxxxxxxxx"
                                                    value={accessToken}
                                                    onChange={(e) => setAccessToken(e.target.value)}
                                                    className="pl-10 h-12 bg-muted/20 border-border/50 rounded-xl"
                                                />
                                            </div>
                                            <p className="text-[9px] text-muted-foreground/60 px-1 italic">
                                                Generate at <a href="https://supabase.com/dashboard/account/tokens" target="_blank" className="text-primary hover:underline">supabase.com/dashboard/tokens</a>
                                            </p>
                                        </div>

                                        <div className="flex gap-3 pt-4">
                                            <Button variant="outline" onClick={() => setStep('type')} className="flex-1 h-12 rounded-xl text-[10px] font-bold uppercase tracking-widest">Back</Button>
                                            <Button
                                                onClick={handleFetchOrgs}
                                                disabled={!accessToken.startsWith('sbp_') || isFetchingOrgs}
                                                className="flex-1 h-12 rounded-xl text-[10px] font-bold uppercase tracking-widest group shadow-lg hover:shadow-primary/20"
                                            >
                                                {isFetchingOrgs ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                                    <>Scan Organizations <ChevronRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" /></>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 'managed-org' && (
                                <div className="flex-1 flex flex-col justify-center space-y-6">
                                    <div className="space-y-1">
                                        <h3 className="text-2xl font-black uppercase italic tracking-tighter">Project Config</h3>
                                        <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">Engine parameters</p>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Project Name</Label>
                                                <Input
                                                    value={customProjectName}
                                                    onChange={(e) => setCustomProjectName(e.target.value)}
                                                    className="bg-muted/20 border-border/50 rounded-xl text-[11px]"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Hosting Sector</Label>
                                                <select
                                                    value={selectedRegion}
                                                    onChange={(e) => setSelectedRegion(e.target.value)}
                                                    className="w-full h-10 bg-muted/20 border border-border/50 rounded-xl px-3 text-[11px] font-sans focus:outline-none focus:ring-1 focus:ring-primary/50"
                                                >
                                                    <option value="us-east-1">US East (N. Virginia)</option>
                                                    <option value="us-west-1">US West (N. California)</option>
                                                    <option value="eu-central-1">Europe (Frankfurt)</option>
                                                    <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Vessel (Organization)</Label>
                                            <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                                {orgs.map((org) => (
                                                    <button
                                                        key={org.id}
                                                        onClick={() => setSelectedOrg(org.id)}
                                                        className={cn(
                                                            "w-full flex items-center justify-between p-3 rounded-xl border text-[11px] font-bold transition-all",
                                                            selectedOrg === org.id
                                                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                                                : 'hover:bg-muted/30 border-border/50'
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <Globe className={cn("w-3.5 h-3.5", selectedOrg === org.id ? "text-primary" : "text-muted-foreground/50")} />
                                                            <span>{org.name}</span>
                                                        </div>
                                                        {selectedOrg === org.id && <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex gap-3 pt-2">
                                            <Button variant="outline" onClick={() => setStep('managed-token')} className="flex-1 h-12 rounded-xl text-[10px] font-bold uppercase tracking-widest">Back</Button>
                                            <Button
                                                onClick={handleAutoProvision}
                                                disabled={!selectedOrg}
                                                className="flex-1 h-12 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-md"
                                            >
                                                Initialize System
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 'provisioning' && (
                                <div className="flex-1 flex flex-col justify-center space-y-6">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                            <h3 className="text-2xl font-black uppercase italic tracking-tighter">Provisioning</h3>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">Assembling infrastructure...</p>
                                    </div>

                                    <TerminalLogs />

                                    {error && (
                                        <Button variant="destructive" onClick={() => setStep('managed-token')} className="w-full h-12 rounded-xl text-[10px] font-bold uppercase tracking-widest">
                                            Re-Initialize Engine
                                        </Button>
                                    )}
                                </div>
                            )}

                            {step === 'credentials' && (
                                <div className="flex-1 flex flex-col justify-center space-y-6">
                                    <div className="space-y-1">
                                        <h3 className="text-2xl font-black uppercase italic tracking-tighter">Manual Sync</h3>
                                        <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">Inject existing coordinates</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Platform URL</Label>
                                            <Input
                                                placeholder="https://xyz.supabase.co"
                                                value={url}
                                                onChange={(e) => setUrl(e.target.value)}
                                                className="bg-muted/20 border-border/50 rounded-xl h-12"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Anon Matrix Key</Label>
                                            <Input
                                                type="password"
                                                placeholder="eyJ..."
                                                value={anonKey}
                                                onChange={(e) => setAnonKey(e.target.value)}
                                                className="bg-muted/20 border-border/50 rounded-xl h-12"
                                            />
                                        </div>
                                    </div>

                                    {error && (
                                        <motion.div
                                            initial={{ y: 5, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            className="p-3 bg-destructive/5 border border-destructive/20 text-destructive text-[11px] font-bold rounded-xl flex items-center gap-2"
                                        >
                                            <AlertCircle size={14} />
                                            <span>{error}</span>
                                        </motion.div>
                                    )}

                                    <div className="grid grid-cols-2 gap-3 pt-4">
                                        <Button variant="outline" onClick={() => setStep('type')} className="h-12 rounded-xl text-[10px] font-bold uppercase tracking-widest">Back</Button>
                                        <Button
                                            onClick={handleSaveManual}
                                            disabled={!url || !anonKey}
                                            className="h-12 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-primary shadow-lg hover:shadow-primary/20"
                                        >
                                            Engage
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {step === 'migration' && (
                                <div className="flex-1 flex flex-col justify-center space-y-6">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            {isMigrating ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Boxes className="w-5 h-5 text-primary" />}
                                            <h3 className="text-2xl font-black uppercase italic tracking-tighter">Installation</h3>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">Applying schema DNA...</p>
                                    </div>

                                    <TerminalLogs />

                                    {!isMigrating && (
                                        <motion.div
                                            initial={{ y: 10, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            className="p-5 bg-primary/5 rounded-2xl space-y-4 border border-primary/20"
                                        >
                                            <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                                                We must apply the database schema to normalize your project for AI operations.
                                            </p>
                                            <div className="flex gap-3">
                                                <Button variant="ghost" onClick={() => window.location.reload()} className="flex-1 h-11 text-[10px] font-bold uppercase tracking-widest">Bypass (Risk)</Button>
                                                <Button onClick={() => handleRunMigration()} className="flex-1 h-11 bg-primary text-[10px] font-bold uppercase tracking-widest shadow-lg hover:shadow-primary/30">
                                                    Prepare Schema
                                                </Button>
                                            </div>
                                        </motion.div>
                                    )}

                                    {error && (
                                        <div className="space-y-3">
                                            <Alert variant="destructive" className="rounded-xl border-destructive/20 bg-destructive/5 text-destructive font-bold text-[11px]">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertDescription>{error}</AlertDescription>
                                            </Alert>
                                            <Button variant="outline" onClick={() => handleRunMigration()} className="w-full h-12 rounded-xl text-[10px] font-bold uppercase tracking-widest">
                                                Retry Installation
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}