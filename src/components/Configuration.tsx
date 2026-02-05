import { useEffect, useState, useRef, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ShieldCheck, Database, RefreshCw, Check, Trash2, Power, ExternalLink, Upload, X, Plus, Clock, Mail } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { toast } from './Toast';
import { LoadingSpinner } from './LoadingSpinner';
import { EmailAccount, UserSettings } from '../lib/types';
import { usePageAgent } from '../hooks/usePageAgent';
import { TTSSettings } from './TTSSettings';
import { ImapConnectModal } from './ImapConnectModal';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';

interface ExtendedUserSettings extends UserSettings {
    google_client_id?: string;
    google_client_secret?: string;
    microsoft_client_id?: string;
    microsoft_client_secret?: string;
    microsoft_tenant_id?: string;
}

interface LLMModel {
    id: string;
    name?: string;
}

interface LLMProvider {
    provider: string;
    name?: string;
    models: LLMModel[];
}

const DEFAULT_PROVIDER = 'realtimexai';

export function Configuration() {
    const { state, actions } = useApp();
    const { t } = useLanguage();
    const [isConnecting, setIsConnecting] = useState(false);
    const [isOutlookConnecting, setIsOutlookConnecting] = useState(false);
    const [outlookDeviceCode, setOutlookDeviceCode] = useState<{
        userCode: string;
        verificationUri: string;
        message: string;
        deviceCode: string;
    } | null>(null);
    const [savingSettings, setSavingSettings] = useState(false);
    const [testingLlm, setTestingLlm] = useState(false);
    const [localSettings, setLocalSettings] = useState<Partial<ExtendedUserSettings>>({});

    usePageAgent({
        page_id: 'configuration_wizard',
        system_instruction: t('config.agent.systemInstruction'),
        data: {
            accounts_count: state.accounts.length,
            connected_providers: state.accounts.map(a => a.provider),
            rules_count: state.rules.length,
            active_rules: state.rules.filter(r => r.is_enabled).map(r => r.name),
            current_settings: {
                llm_provider: localSettings.llm_provider,
                llm_model: localSettings.llm_model
            }
        }
    });

    // Gmail credentials modal state
    const [showGmailModal, setShowGmailModal] = useState(false);
    const [gmailModalStep, setGmailModalStep] = useState<'credentials' | 'code'>('credentials');
    const [credentialsJson, setCredentialsJson] = useState('');
    const [gmailClientId, setGmailClientId] = useState('');
    const [gmailClientSecret, setGmailClientSecret] = useState('');
    const [gmailAuthCode, setGmailAuthCode] = useState('');
    const [savingCredentials, setSavingCredentials] = useState(false);
    const [connectingGmail, setConnectingGmail] = useState(false);

    // Outlook credentials modal state
    const [showOutlookModal, setShowOutlookModal] = useState(false);
    const [outlookModalStep, setOutlookModalStep] = useState<'credentials' | 'device-code'>('credentials');
    const [outlookClientId, setOutlookClientId] = useState('');
    const [outlookTenantId, setOutlookTenantId] = useState('');
    const [savingOutlookCredentials, setSavingOutlookCredentials] = useState(false);

    // IMAP modal state
    const [showImapModal, setShowImapModal] = useState(false);

    const [chatProviders, setChatProviders] = useState<LLMProvider[]>([]);
    const [isLoadingProviders, setIsLoadingProviders] = useState(false);
    const [providerError, setProviderError] = useState<string | null>(null);
    const [embedProviders, setEmbedProviders] = useState<LLMProvider[]>([]);
    const [isLoadingEmbedProviders, setIsLoadingEmbedProviders] = useState(false);
    const [embedProviderError, setEmbedProviderError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProviders = async () => {
            setIsLoadingProviders(true);
            setProviderError(null);
            try {
                const response = await api.getChatProviders();
                if (response.data?.success) {
                    setChatProviders(response.data.providers || []);
                } else {
                    setProviderError(response.data?.message || t('config.toast.providersFailed'));
                }
            } catch (error) {
                console.error('Failed to fetch providers:', error);
                setProviderError(t('config.toast.providersFailedFallback'));
            } finally {
                setIsLoadingProviders(false);
            }
        };
        fetchProviders();

        const fetchEmbedProviders = async () => {
            setIsLoadingEmbedProviders(true);
            setEmbedProviderError(null);
            try {
                const response = await api.getEmbedProviders();
                if (response.data?.success) {
                    setEmbedProviders(response.data.providers || []);
                } else {
                    setEmbedProviderError(response.data?.message || t('config.toast.embedProvidersFailed'));
                }
            } catch (error) {
                console.error('Failed to fetch embedding providers:', error);
                setEmbedProviderError(t('config.toast.embedProvidersFailedFallback'));
            } finally {
                setIsLoadingEmbedProviders(false);
            }
        };
        fetchEmbedProviders();
    }, []);

    const selectedProvider = chatProviders.find(p => p.provider === (localSettings.llm_provider || DEFAULT_PROVIDER));
    const availableModels = selectedProvider?.models || [];

    const selectedEmbedProvider = embedProviders.find(p => p.provider === (localSettings.embedding_provider || DEFAULT_PROVIDER));
    const availableEmbedModels = selectedEmbedProvider?.models || [];

    // Ensure saved model is always in the list (even if not fetched yet)
    const modelsWithSaved = useMemo(() => {
        if (!localSettings.llm_model) return availableModels;

        const hasModel = availableModels.some(m => m.id === localSettings.llm_model);
        if (hasModel) return availableModels;

        // Add saved model to the list so it shows in dropdown
        return [
            { id: localSettings.llm_model, name: `${localSettings.llm_model} (saved)` },
            ...availableModels
        ];
    }, [availableModels, localSettings.llm_model]);

    // Ensure saved provider is shown even if not in fetched list yet
    const providersWithSaved = useMemo(() => {
        if (!localSettings.llm_provider || localSettings.llm_provider === DEFAULT_PROVIDER) {
            return chatProviders;
        }

        const hasProvider = chatProviders.some(p => p.provider === localSettings.llm_provider);
        if (hasProvider) return chatProviders;

        // Add saved provider so it shows in dropdown
        return [
            { provider: localSettings.llm_provider, name: `${localSettings.llm_provider} (saved)`, models: [] },
            ...chatProviders
        ];
    }, [chatProviders, localSettings.llm_provider]);

    // Ensure saved embedding model is always in the list
    const embedModelsWithSaved = useMemo(() => {
        if (!localSettings.embedding_model) return availableEmbedModels;

        const hasModel = availableEmbedModels.some(m => m.id === localSettings.embedding_model);
        if (hasModel) return availableEmbedModels;

        return [
            { id: localSettings.embedding_model, name: `${localSettings.embedding_model} (saved)` },
            ...availableEmbedModels
        ];
    }, [availableEmbedModels, localSettings.embedding_model]);

    // Ensure saved embedding provider is shown even if not in fetched list yet
    const embedProvidersWithSaved = useMemo(() => {
        if (!localSettings.embedding_provider || localSettings.embedding_provider === DEFAULT_PROVIDER) {
            return embedProviders;
        }

        const hasProvider = embedProviders.some(p => p.provider === localSettings.embedding_provider);
        if (hasProvider) return embedProviders;

        return [
            { provider: localSettings.embedding_provider, name: `${localSettings.embedding_provider} (saved)`, models: [] },
            ...embedProviders
        ];
    }, [embedProviders, localSettings.embedding_provider]);

    const handleProviderChange = (providerId: string) => {
        const provider = chatProviders.find(p => p.provider === providerId);
        setLocalSettings(s => ({
            ...s,
            llm_provider: providerId,
            llm_model: provider?.models?.[0]?.id || ''
        }));
    };

    const handleEmbedProviderChange = (providerId: string) => {
        const provider = embedProviders.find(p => p.provider === providerId);
        setLocalSettings(s => ({
            ...s,
            embedding_provider: providerId,
            embedding_model: provider?.models?.[0]?.id || ''
        }));
    };

    const handleTestConnection = async () => {
        setTestingLlm(true);
        try {
            const response = await api.testLlm({
                llm_provider: localSettings.llm_provider || undefined,
                llm_model: localSettings.llm_model || undefined
            });
            if (response.data?.success) {
                toast.success(response.data.message);
            } else {
                toast.error(response.data?.message || t('config.toast.connectionFailed'));
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || t('config.toast.connectionFailed'));
        } finally {
            setTestingLlm(false);
        }
    };

    useEffect(() => {
        actions.fetchAccounts();
        actions.fetchRules();
        actions.fetchSettings();
    }, []);

    useEffect(() => {
        if (state.settings) {
            setLocalSettings(state.settings);
        }
    }, [state.settings]);

    // Ref for scrolling
    const credentialsRef = useRef<HTMLDivElement>(null);

    // Handle "Connect Gmail" button click - show modal
    const handleConnectGmail = () => {
        // Reset modal state
        setGmailModalStep('credentials');
        setCredentialsJson('');
        setGmailClientId('');
        setGmailClientSecret('');
        setGmailAuthCode('');
        setShowGmailModal(true);
    };

    // Parse credentials.json and extract client_id/secret
    const handleCredentialsJsonChange = (json: string) => {
        setCredentialsJson(json);
        try {
            const parsed = JSON.parse(json);
            // Handle both formats: { installed: {...} } or { web: {...} } or direct
            const creds = parsed.installed || parsed.web || parsed;
            if (creds.client_id) {
                setGmailClientId(creds.client_id);
            }
            if (creds.client_secret) {
                setGmailClientSecret(creds.client_secret);
            }
            // Also show the app type for user awareness
            if (parsed.installed) {
                toast.success(t('config.toast.detectedDesktopCreds'));
            } else if (parsed.web) {
                toast.info(t('config.toast.detectedWebCreds'));
            }
        } catch {
            // Invalid JSON, ignore - user might be typing
        }
    };

    // Save credentials and start OAuth
    const handleSaveAndConnect = async () => {
        if (!gmailClientId || !gmailClientSecret) {
            toast.error(t('config.toast.missingGmailCreds'));
            return;
        }

        setSavingCredentials(true);
        try {
            // Save credentials to user_settings
            const success = await actions.updateSettings({
                ...localSettings,
                google_client_id: gmailClientId,
                google_client_secret: gmailClientSecret,
            } as any);

            if (success) {
                // Update local state
                setLocalSettings(s => ({
                    ...s,
                    google_client_id: gmailClientId,
                    google_client_secret: gmailClientSecret,
                }));

                // Get OAuth URL and open popup
                const response = await api.getGmailAuthUrl();
                if (response.data?.url) {
                    // Open OAuth in new tab (popup might be blocked)
                    window.open(response.data.url, '_blank');

                    // Move to step 2 - paste code
                    setGmailModalStep('code');
                    toast.success(t('config.toast.authorizeAndPaste'));
                } else {
                    const errMsg = typeof response.error === 'string' ? response.error : response.error?.message;
                    toast.error(errMsg || t('config.toast.oauthUrlFailed'));
                }
            } else {
                toast.error(t('config.toast.saveCredsFailed'));
            }
        } catch (error) {
            toast.error(t('config.toast.saveCredsFailed'));
        } finally {
            setSavingCredentials(false);
        }
    };

    // Submit authorization code to complete Gmail connection
    const handleSubmitAuthCode = async () => {
        if (!gmailAuthCode.trim()) {
            toast.error(t('config.toast.missingAuthCode'));
            return;
        }

        setConnectingGmail(true);
        try {
            const response = await api.connectGmail(gmailAuthCode.trim());
            if (response.data?.success) {
                toast.success(t('config.toast.gmailConnected'));
                setShowGmailModal(false);
                actions.fetchAccounts();
            } else {
                const errMsg = typeof response.error === 'string' ? response.error : response.error?.message;
                toast.error(errMsg || t('config.toast.gmailConnectFailed'));
            }
        } catch (error) {
            toast.error(t('config.toast.gmailConnectFailed'));
        } finally {
            setConnectingGmail(false);
        }
    };

    // Handle "Connect Outlook" button click - show modal
    const handleConnectOutlook = () => {
        // Reset modal state
        setOutlookModalStep('credentials');
        setOutlookClientId('');
        setOutlookTenantId('');
        setShowOutlookModal(true);
    };

    // Save Outlook credentials and start device flow
    const handleSaveOutlookAndConnect = async () => {
        if (!outlookClientId) {
            toast.error(t('config.toast.missingOutlookClientId'));
            return;
        }

        setSavingOutlookCredentials(true);
        try {
            // Save credentials to user_settings
            const success = await actions.updateSettings({
                ...localSettings,
                microsoft_client_id: outlookClientId,
                microsoft_tenant_id: outlookTenantId || 'common',
            } as any);

            if (success) {
                // Update local state
                setLocalSettings(s => ({
                    ...s,
                    microsoft_client_id: outlookClientId,
                    microsoft_tenant_id: outlookTenantId || 'common',
                }));

                // Start device flow
                const response = await api.startMicrosoftDeviceFlow();
                if (response.data) {
                    setOutlookDeviceCode(response.data);
                    setOutlookModalStep('device-code');
                    pollOutlookLogin(response.data.deviceCode, response.data.interval);
                } else {
                    const errMsg = typeof response.error === 'string' ? response.error : response.error?.message;
                    toast.error(errMsg || t('config.toast.deviceFlowFailed'));
                }
            } else {
                toast.error(t('config.toast.saveCredsFailed'));
            }
        } catch (error) {
            toast.error(t('config.toast.saveCredsFailed'));
        } finally {
            setSavingOutlookCredentials(false);
        }
    };

    const pollOutlookLogin = async (deviceCode: string, interval: number) => {
        const pollInterval = setInterval(async () => {
            try {
                const response = await api.pollMicrosoftDeviceCode(deviceCode);
                if (response.data?.status === 'completed') {
                    clearInterval(pollInterval);
                    setOutlookDeviceCode(null);
                    setIsOutlookConnecting(false);
                    setShowOutlookModal(false); // Close modal on success
                    toast.success(t('config.toast.outlookConnected'));
                    actions.fetchAccounts();
                } else if (response.error) {
                    if (typeof response.error === 'object' && response.error.code !== 'authorization_pending') {
                        // Stop polling on real errors
                    }
                }
            } catch (e) {
                // Network glitches shouldn't kill polling immediately
            }
        }, interval * 1000);

        // Safety timeout after 15 minutes
        setTimeout(() => {
            clearInterval(pollInterval);
            if (isOutlookConnecting) {
                setOutlookDeviceCode(null);
                setIsOutlookConnecting(false);
                setShowOutlookModal(false);
                toast.error(t('config.toast.connectionTimedOut'));
            }
        }, 15 * 60 * 1000);
    };

    const handleDisconnect = async (accountId: string) => {
        if (!confirm(t('config.toast.disconnectConfirm'))) return;

        const success = await actions.disconnectAccount(accountId);
        if (success) {
            toast.success(t('config.toast.accountDisconnected'));
        }
    };

    const handleSaveSettings = async () => {
        setSavingSettings(true);
        const success = await actions.updateSettings(localSettings as any);
        setSavingSettings(false);

        if (success) {
            toast.success(t('config.toast.settingsSaved'));
        }
    };

    const getProviderIcon = (provider: string) => {
        if (provider === 'gmail') {
            return (
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 font-bold">
                    G
                </div>
            );
        }
        if (provider === 'imap') {
            return (
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                    <Mail className="w-5 h-5" />
                </div>
            );
        }
        return (
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                O
            </div>
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Gmail Credentials Modal */}
            <Dialog open={showGmailModal} onOpenChange={setShowGmailModal}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 font-bold text-sm">
                                G
                            </div>
                            {t('config.gmail.connect')}
                        </DialogTitle>
                        <DialogDescription>
                            {gmailModalStep === 'credentials'
                                ? t('config.gmail.credentialsDesc')
                                : t('config.gmail.authCodeDesc')}
                        </DialogDescription>
                    </DialogHeader>

                    {gmailModalStep === 'credentials' ? (
                        <>
                            <div className="space-y-4 py-4">
                                {/* Paste JSON option */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <Upload className="w-4 h-4" />
                                        {t('config.gmail.pasteJson')}
                                    </label>
                                    <textarea
                                        className="w-full h-24 p-3 text-xs font-mono border rounded-lg bg-secondary/30 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                                        placeholder='{"installed":{"client_id":"...","client_secret":"..."}}'
                                        value={credentialsJson}
                                        onChange={(e) => handleCredentialsJsonChange(e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {t('config.gmail.downloadHelp')}
                                    </p>
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-background px-2 text-muted-foreground">{t('config.gmail.orEnterManually')}</span>
                                    </div>
                                </div>

                                {/* Manual entry */}
                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{t('config.byok.clientId')}</label>
                                        <Input
                                            placeholder={t('config.gmail.clientIdPlaceholder')}
                                            value={gmailClientId}
                                            onChange={(e) => setGmailClientId(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{t('config.byok.clientSecret')}</label>
                                        <Input
                                            type="password"
                                            placeholder={t('config.gmail.clientSecretPlaceholder')}
                                            value={gmailClientSecret}
                                            onChange={(e) => setGmailClientSecret(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowGmailModal(false)}>
                                    {t('common.cancel')}
                                </Button>
                                <Button
                                    onClick={handleSaveAndConnect}
                                    disabled={savingCredentials || !gmailClientId || !gmailClientSecret}
                                >
                                    {savingCredentials ? (
                                        <LoadingSpinner size="sm" className="mr-2" />
                                    ) : (
                                        <Check className="w-4 h-4 mr-2" />
                                    )}
                                    {t('common.save')} & {t('setup.engage')}
                                </Button>
                            </DialogFooter>
                        </>
                    ) : (
                        <>
                            {/* Step 2: Paste Authorization Code */}
                            <div className="space-y-4 py-4">
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                    <p className="text-sm text-blue-800 dark:text-blue-200">
                                        {t('config.gmail.authSteps')}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t('config.gmail.authCode')}</label>
                                    <Input
                                        placeholder={t('config.gmail.authCodePlaceholder')}
                                        value={gmailAuthCode}
                                        onChange={(e) => setGmailAuthCode(e.target.value)}
                                        className="font-mono"
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setGmailModalStep('credentials')}>
                                    {t('setup.back')}
                                </Button>
                                <Button
                                    onClick={handleSubmitAuthCode}
                                    disabled={connectingGmail || !gmailAuthCode.trim()}
                                >
                                    {connectingGmail ? (
                                        <LoadingSpinner size="sm" className="mr-2" />
                                    ) : (
                                        <Check className="w-4 h-4 mr-2" />
                                    )}
                                    {t('setup.engage')}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Outlook Credentials Modal */}
            <Dialog open={showOutlookModal} onOpenChange={setShowOutlookModal}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">
                                O
                            </div>
                            {t('config.outlook.connect')}
                        </DialogTitle>
                        <DialogDescription>
                            {outlookModalStep === 'credentials'
                                ? t('config.outlook.credentialsDesc')
                                : t('config.outlook.instructions')}
                        </DialogDescription>
                    </DialogHeader>

                    {outlookModalStep === 'credentials' ? (
                        <>
                            <div className="space-y-4 py-4">
                                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                        {t('config.outlook.note')}
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{t('config.outlook.clientId')}</label>
                                        <Input
                                            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                            value={outlookClientId}
                                            onChange={(e) => setOutlookClientId(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{t('config.outlook.tenantIdOptional')}</label>
                                        <Input
                                            placeholder={t('config.outlook.tenantPlaceholder')}
                                            value={outlookTenantId}
                                            onChange={(e) => setOutlookTenantId(e.target.value)}
                                        />
                                        <p className="text-[10px] text-muted-foreground">
                                            {t('config.outlook.tenantHelp')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowOutlookModal(false)}>
                                    {t('common.cancel')}
                                </Button>
                                <Button
                                    onClick={handleSaveOutlookAndConnect}
                                    disabled={savingOutlookCredentials || !outlookClientId}
                                >
                                    {savingOutlookCredentials ? (
                                        <LoadingSpinner size="sm" className="mr-2" />
                                    ) : (
                                        <Check className="w-4 h-4 mr-2" />
                                    )}
                                    {t('config.outlook.saveConnect')}
                                </Button>
                            </DialogFooter>
                        </>
                    ) : (
                        <>
                            {outlookDeviceCode && (
                                <div className="space-y-4 py-4">
                                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                                            {t('config.outlook.actionRequired')}
                                        </h4>
                                        <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                                            {outlookDeviceCode.message}
                                        </p>
                                        <div className="flex flex-col gap-3">
                                            <div className="flex items-center gap-2 bg-white dark:bg-black/20 p-2 rounded border border-blue-200 dark:border-blue-800">
                                                <code className="text-lg font-mono font-bold flex-1 text-center select-all">
                                                    {outlookDeviceCode.userCode}
                                                </code>
                                            </div>
                                            <Button
                                                variant="default"
                                                className="w-full bg-blue-600 hover:bg-blue-700"
                                                onClick={() => window.open(outlookDeviceCode.verificationUri, '_blank')}
                                            >
                                                Open Microsoft Login
                                                <ExternalLink className="w-4 h-4 ml-2" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="flex justify-center">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <LoadingSpinner size="sm" />
                                            {t('config.outlook.waitingAuth')}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowOutlookModal(false)}>
                                    {t('common.cancel')}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* IMAP Connect Modal */}
            <ImapConnectModal open={showImapModal} onOpenChange={setShowImapModal} />

            {/* Bring Your Own Key (BYOK) */}
            <div ref={credentialsRef}>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-orange-500" />
                            {t('config.byok.title')}
                        </CardTitle>
                        <CardDescription>
                            {t('config.byok.desc')} {t('config.byok.systemDefault')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Google */}
                        <div className="space-y-4 border-b pb-4">
                            <h4 className="font-medium flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500" /> {t('config.byok.googleTitle')}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t('config.byok.clientId')}</label>
                                    <Input
                                        type="password"
                                        placeholder={t('config.gmail.clientIdPlaceholder')}
                                        value={localSettings.google_client_id || ''}
                                        onChange={(e) => setLocalSettings(s => ({ ...s, google_client_id: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t('config.byok.clientSecret')}</label>
                                    <Input
                                        type="password"
                                        placeholder={t('config.gmail.clientSecretPlaceholder')}
                                        value={localSettings.google_client_secret || ''}
                                        onChange={(e) => setLocalSettings(s => ({ ...s, google_client_secret: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Microsoft */}
                        <div className="space-y-4">
                            <h4 className="font-medium flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500" /> {t('config.byok.microsoftTitle')}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t('config.byok.clientId')}</label>
                                    <Input
                                        type="password"
                                        value={localSettings.microsoft_client_id || ''}
                                        onChange={(e) => setLocalSettings(s => ({ ...s, microsoft_client_id: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t('config.byok.clientSecretOptional')}</label>
                                    <Input
                                        type="password"
                                        value={localSettings.microsoft_client_secret || ''}
                                        onChange={(e) => setLocalSettings(s => ({ ...s, microsoft_client_secret: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t('config.byok.tenantId')}</label>
                                    <Input
                                        placeholder={t('config.outlook.tenantPlaceholder')}
                                        value={localSettings.microsoft_tenant_id || ''}
                                        onChange={(e) => setLocalSettings(s => ({ ...s, microsoft_tenant_id: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end mt-4">
                            <Button onClick={handleSaveSettings} disabled={savingSettings} variant="secondary">
                                {savingSettings ? (
                                    <LoadingSpinner size="sm" className="mr-2" />
                                ) : (
                                    <Check className="w-4 h-4 mr-2" />
                                )}
                                {t('config.byok.save')}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Email Accounts Section - Full Width Split Layout */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-primary" />
                        {t('config.accounts.title')}
                    </CardTitle>
                    <CardDescription>{t('config.accounts.desc')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Side - Connection Buttons */}
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-semibold mb-3">{t('config.accounts.addNew')}</h3>
                                <div className="flex flex-col gap-3">
                                    <Button
                                        className="w-full border-dashed justify-start h-auto py-4"
                                        variant="outline"
                                        onClick={handleConnectGmail}
                                        disabled={isConnecting || isOutlookConnecting}
                                    >
                                        <div className="flex items-center gap-3 w-full">
                                            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 font-bold shrink-0">
                                                G
                                            </div>
                                            <div className="flex-1 text-left">
                                                <div className="font-medium">{t('config.providers.gmail')}</div>
                                                <div className="text-xs text-muted-foreground">{t('config.gmail.connectDesc')}</div>
                                            </div>
                                            {isConnecting ? (
                                                <LoadingSpinner size="sm" />
                                            ) : (
                                                <Plus className="w-5 h-5 shrink-0" />
                                            )}
                                        </div>
                                    </Button>

                                    <Button
                                        className="w-full border-dashed justify-start h-auto py-4"
                                        variant="outline"
                                        onClick={handleConnectOutlook}
                                        disabled={isConnecting || isOutlookConnecting}
                                    >
                                        <div className="flex items-center gap-3 w-full">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold shrink-0">
                                                O
                                            </div>
                                            <div className="flex-1 text-left">
                                                <div className="font-medium">{t('config.providers.outlook')}</div>
                                                <div className="text-xs text-muted-foreground">{t('config.outlook.connectDesc')}</div>
                                            </div>
                                            {isOutlookConnecting && !outlookDeviceCode ? (
                                                <LoadingSpinner size="sm" />
                                            ) : (
                                                <Plus className="w-5 h-5 shrink-0" />
                                            )}
                                        </div>
                                    </Button>

                                    <Button
                                        className="w-full border-dashed justify-start h-auto py-4"
                                        variant="outline"
                                        onClick={() => setShowImapModal(true)}
                                        disabled={isConnecting || isOutlookConnecting}
                                    >
                                        <div className="flex items-center gap-3 w-full">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold shrink-0">
                                                <Mail className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 text-left">
                                                <div className="font-medium">{t('config.providers.imap') || 'IMAP / SMTP'}</div>
                                                <div className="text-xs text-muted-foreground">{t('config.imap.connectDesc') || 'Connect any provider via App Password'}</div>
                                            </div>
                                            <Plus className="w-5 h-5 shrink-0" />
                                        </div>
                                    </Button>
                                </div>
                            </div>

                            {outlookDeviceCode && (
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg animate-in slide-in-from-top-2">
                                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                                        {t('config.outlook.signinRequired')}
                                    </h4>
                                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                                        {outlookDeviceCode.message}
                                    </p>
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-2 bg-white dark:bg-black/20 p-2 rounded border border-blue-200 dark:border-blue-800">
                                            <code className="text-lg font-mono font-bold flex-1 text-center select-all">
                                                {outlookDeviceCode.userCode}
                                            </code>
                                        </div>
                                        <Button
                                            variant="default"
                                            className="w-full bg-blue-600 hover:bg-blue-700"
                                            onClick={() => window.open(outlookDeviceCode.verificationUri, '_blank')}
                                        >
                                            {t('config.outlook.openLogin')}
                                            <ExternalLink className="w-4 h-4 ml-2" />
                                        </Button>
                                        <p className="text-xs text-center text-muted-foreground mt-2">
                                            {t('config.outlook.waitingSignin')}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Side - Connected Accounts */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold mb-3">{t('config.accounts.yourAccounts')}</h3>
                            {state.accounts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed rounded-lg">
                                    <Database className="w-12 h-12 text-muted-foreground/40 mb-3" />
                                    <p className="text-sm text-muted-foreground text-center">
                                        {t('config.accounts.noAccounts')}
                                    </p>
                                    <p className="text-xs text-muted-foreground text-center mt-1">
                                        {t('config.accounts.connectHelp')}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {state.accounts.map((account: EmailAccount) => (
                                        <div
                                            key={account.id}
                                            className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-secondary/30 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                {getProviderIcon(account.provider)}
                                                <div>
                                                    <h4 className="font-medium capitalize">{account.provider === 'imap' ? 'IMAP' : account.provider}</h4>
                                                    <p className="text-xs text-muted-foreground">
                                                        {account.email_address}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {account.is_active ? (
                                                    <span className="text-xs text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-full">
                                                        {t('common.active')}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-yellow-600 bg-yellow-500/10 px-2 py-1 rounded-full">
                                                        {t('common.inactive')}
                                                    </span>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                    onClick={() => handleDisconnect(account.id)}
                                                    title={t('config.accounts.disconnect')}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Storage Path */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-primary" />
                        {t('config.storage.title')}
                    </CardTitle>
                    <CardDescription>{t('config.storage.desc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <label className="text-sm font-medium">{t('config.storage.label')}</label>
                    <Input
                        placeholder={t('config.storage.placeholder')}
                        value={localSettings.storage_path || ''}
                        onChange={(e) => setLocalSettings(s => ({ ...s, storage_path: e.target.value }))}
                    />
                    <p className="text-[10px] text-muted-foreground italic">
                        {t('config.storage.help')}
                    </p>
                </CardContent>
            </Card>

            {/* Intelligent Rename */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Power className="w-5 h-5 text-indigo-500" />
                        {t('config.rename.title')}
                    </CardTitle>
                    <CardDescription>{t('config.rename.desc')}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-sm font-medium">{t('config.rename.label')}</p>
                        <p className="text-xs text-muted-foreground">{t('config.rename.help')}</p>
                    </div>
                    <Button
                        variant={localSettings.intelligent_rename ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setLocalSettings(s => ({ ...s, intelligent_rename: !s.intelligent_rename }))}
                    >
                        <Power className="w-4 h-4 mr-1" />
                        {localSettings.intelligent_rename ? t('common.enabled') : t('common.disabled')}
                    </Button>
                </CardContent>
            </Card>

            {/* Sync Interval */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" />
                        {t('config.sync.title')}
                    </CardTitle>
                    <CardDescription>{t('config.sync.desc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <label className="text-sm font-medium">{t('config.sync.label')}</label>
                    <Input
                        type="number"
                        min={1}
                        max={1440}
                        value={localSettings.sync_interval_minutes || 5}
                        onChange={(e) => setLocalSettings(s => ({ ...s, sync_interval_minutes: parseInt(e.target.value, 10) || 5 }))}
                    />
                    <p className="text-[10px] text-muted-foreground italic">
                        {t('config.sync.help')}
                    </p>
                </CardContent>
            </Card>

            {/* AI Model Configuration */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 text-indigo-500" />
                        {t('config.model.title')}
                    </CardTitle>
                    <CardDescription>{t('config.model.desc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="text-sm font-semibold">{t('config.llm.title')}</div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t('config.model.provider')}</label>
                                {isLoadingProviders ? (
                                    <div className="h-10 border rounded-md flex items-center px-3 bg-muted/20">
                                        <LoadingSpinner size="sm" className="mr-2" />
                                        <span className="text-xs text-muted-foreground italic">{t('config.model.discovering')}</span>
                                    </div>
                                ) : (
                                    <>
                                        <select
                                            className="w-full h-10 px-3 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                            value={localSettings.llm_provider || DEFAULT_PROVIDER}
                                            onChange={(e) => handleProviderChange(e.target.value)}
                                            disabled={isLoadingProviders}
                                        >
                                            <option value={DEFAULT_PROVIDER}>{t('config.model.defaultProvider')}</option>
                                            {providersWithSaved.filter(p => p.provider !== DEFAULT_PROVIDER).map(p => (
                                                <option key={p.provider} value={p.provider}>
                                                    {p.name || p.provider}
                                                </option>
                                            ))}
                                        </select>
                                        {providerError && (
                                            <div className="text-[10px] text-amber-500 mt-1 px-1 bg-amber-50/50 rounded">
                                                ⚠️ {providerError}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t('config.model.name')}</label>
                                {modelsWithSaved.length > 0 || isLoadingProviders ? (
                                    <select
                                        className="w-full h-10 px-3 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        value={localSettings.llm_model || ''}
                                        onChange={(e) => setLocalSettings(s => ({ ...s, llm_model: e.target.value }))}
                                        disabled={isLoadingProviders}
                                    >
                                        {!localSettings.llm_model && <option value="">{t('config.model.selectModel')}</option>}
                                        {modelsWithSaved.map((m: LLMModel) => (
                                            <option key={m.id} value={m.id}>
                                                {m.name || m.id}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <Input
                                        placeholder={t('config.model.modelPlaceholder')}
                                        value={localSettings.llm_model || ''}
                                        onChange={(e) => setLocalSettings(s => ({ ...s, llm_model: e.target.value }))}
                                    />
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="text-sm font-semibold">{t('config.embed.title')}</div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t('config.embed.provider')}</label>
                                {isLoadingEmbedProviders ? (
                                    <div className="h-10 border rounded-md flex items-center px-3 bg-muted/20">
                                        <LoadingSpinner size="sm" className="mr-2" />
                                        <span className="text-xs text-muted-foreground italic">{t('config.embed.discovering')}</span>
                                    </div>
                                ) : (
                                    <>
                                        <select
                                            className="w-full h-10 px-3 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                            value={localSettings.embedding_provider || DEFAULT_PROVIDER}
                                            onChange={(e) => handleEmbedProviderChange(e.target.value)}
                                            disabled={isLoadingEmbedProviders}
                                        >
                                            <option value={DEFAULT_PROVIDER}>{t('config.embed.defaultProvider')}</option>
                                            {embedProvidersWithSaved.filter(p => p.provider !== DEFAULT_PROVIDER).map(p => (
                                                <option key={p.provider} value={p.provider}>
                                                    {p.name || p.provider}
                                                </option>
                                            ))}
                                        </select>
                                        {embedProviderError && (
                                            <div className="text-[10px] text-amber-500 mt-1 px-1 bg-amber-50/50 rounded">
                                                ⚠️ {embedProviderError}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t('config.embed.model')}</label>
                                {embedModelsWithSaved.length > 0 || isLoadingEmbedProviders ? (
                                    <select
                                        className="w-full h-10 px-3 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        value={localSettings.embedding_model || ''}
                                        onChange={(e) => setLocalSettings(s => ({ ...s, embedding_model: e.target.value }))}
                                        disabled={isLoadingEmbedProviders}
                                    >
                                        {!localSettings.embedding_model && <option value="">{t('config.embed.autoModel')}</option>}
                                        {embedModelsWithSaved.map((m: LLMModel) => (
                                            <option key={m.id} value={m.id}>
                                                {m.name || m.id}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <Input
                                        placeholder={t('config.embed.modelPlaceholder')}
                                        value={localSettings.embedding_model || ''}
                                        onChange={(e) => setLocalSettings(s => ({ ...s, embedding_model: e.target.value }))}
                                    />
                                )}
                                <p className="text-[10px] text-muted-foreground italic">
                                    {t('config.embed.help')}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end mt-4 gap-2">
                        <Button
                            variant="outline"
                            onClick={handleTestConnection}
                            disabled={testingLlm}
                        >
                            {testingLlm ? (
                                <LoadingSpinner size="sm" className="mr-2" />
                            ) : (
                                <RefreshCw className="w-4 h-4 mr-2" />
                            )}
                            {t('config.model.checkConnection')}
                        </Button>
                        <Button onClick={handleSaveSettings} disabled={savingSettings}>
                            {savingSettings ? (
                                <LoadingSpinner size="sm" className="mr-2" />
                            ) : (
                                <Check className="w-4 h-4 mr-2" />
                            )}
                            {t('config.model.saveConfig')}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Voice & Speech Settings */}
            <TTSSettings />
        </div>
    );
}
