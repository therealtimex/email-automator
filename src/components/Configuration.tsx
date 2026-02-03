import { useEffect, useState, useRef, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ShieldCheck, Database, RefreshCw, Plus, Check, Trash2, Power, ExternalLink, Upload, Paperclip, X, Clock, Edit2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { toast } from './Toast';
import { LoadingSpinner } from './LoadingSpinner';
import { EmailAccount, Rule, UserSettings, RuleAttachment } from '../lib/types';
import { usePageAgent } from '../hooks/usePageAgent';
import { TTSSettings } from './TTSSettings';
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
        system_instruction: "You are the Configuration Wizard. Guide the user through setting up their accounts, rules, and system preferences. Explain what each setting does and help them troubleshoot connections.",
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

    // Rule creation state
    const [showRuleModal, setShowRuleModal] = useState(false);
    const [newRuleName, setNewRuleName] = useState('');
    const [newRuleKey, setNewRuleKey] = useState('category');
    const [newRuleValue, setNewRuleValue] = useState('newsletter');
    const [newRuleActions, setNewRuleActions] = useState<string[]>(['archive']);
    const [newRuleOlderThan, setNewRuleOlderThan] = useState('');
    const [newRuleInstructions, setNewRuleInstructions] = useState('');
    const [newRuleDescription, setNewRuleDescription] = useState('');
    const [newRuleIntent, setNewRuleIntent] = useState('');
    const [newRuleAttachments, setNewRuleAttachments] = useState<RuleAttachment[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [savingRule, setSavingRule] = useState(false);
    const [chatProviders, setChatProviders] = useState<LLMProvider[]>([]);
    const [isLoadingProviders, setIsLoadingProviders] = useState(false);
    const [providerError, setProviderError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProviders = async () => {
            setIsLoadingProviders(true);
            setProviderError(null);
            try {
                const response = await api.getChatProviders();
                if (response.data?.success) {
                    setChatProviders(response.data.providers || []);
                } else {
                    setProviderError(response.data?.message || 'Failed to load providers');
                }
            } catch (error) {
                console.error('Failed to fetch providers:', error);
                setProviderError('Failed to load providers. Using defaults.');
            } finally {
                setIsLoadingProviders(false);
            }
        };
        fetchProviders();
    }, []);

    const selectedProvider = chatProviders.find(p => p.provider === (localSettings.llm_provider || DEFAULT_PROVIDER));
    const availableModels = selectedProvider?.models || [];

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

    const handleProviderChange = (providerId: string) => {
        const provider = chatProviders.find(p => p.provider === providerId);
        setLocalSettings(s => ({
            ...s,
            llm_provider: providerId,
            llm_model: provider?.models?.[0]?.id || ''
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
                toast.error(response.data?.message || 'Connection failed');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Connection failed');
        } finally {
            setTestingLlm(false);
        }
    };

    const [loadingSetting, setLoadingSetting] = useState<string | null>(null);
    const [editingRule, setEditingRule] = useState<Rule | null>(null);

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

    const handleToggleSpam = async () => {
        const rule = state.rules.find(r => r.name === 'Auto-Trash Spam');
        if (!rule) {
            toast.error('System rule not found. Please sync your database.');
            return;
        }
        setLoadingSetting('auto_trash_spam');
        await actions.toggleRule(rule.id);
        setLoadingSetting(null);
    };

    const handleToggleDrafts = async () => {
        const rule = state.rules.find(r => r.name === 'Smart Drafts');
        if (!rule) {
            toast.error('System rule not found. Please sync your database.');
            return;
        }
        setLoadingSetting('smart_drafts');
        await actions.toggleRule(rule.id);
        setLoadingSetting(null);
    };

    const handleEditClick = (rule: Rule) => {
        setEditingRule(rule);
        setNewRuleName(rule.name);

        // Extract condition details
        const condition = rule.condition as any;
        const keys = Object.keys(condition).filter(k => k !== 'older_than_days');
        const mainKey = keys[0] || 'category';
        setNewRuleKey(mainKey);
        setNewRuleValue(condition[mainKey] || '');
        setNewRuleOlderThan(condition.older_than_days?.toString() || '');

        // Actions
        const ruleActions = rule.actions && rule.actions.length > 0
            ? rule.actions
            : (rule.action ? [rule.action] : ['archive']);
        setNewRuleActions(ruleActions);

        setNewRuleInstructions(rule.instructions || '');
        setNewRuleDescription(rule.description || '');
        setNewRuleIntent(rule.intent || '');
        setNewRuleAttachments(rule.attachments || []);
        setShowRuleModal(true);
    };

    // Ref for scrolling
    const credentialsRef = useRef<HTMLDivElement>(null);

    // Start OAuth flow (called after credentials are saved)
    const startGmailOAuth = async () => {
        setIsConnecting(true);
        try {
            const response = await api.getGmailAuthUrl();
            if (response.data?.url) {
                // Open OAuth popup
                const popup = window.open(response.data.url, 'gmail-auth', 'width=600,height=700');

                // Listen for callback
                const checkPopup = setInterval(() => {
                    if (popup?.closed) {
                        clearInterval(checkPopup);
                        setIsConnecting(false);
                        actions.fetchAccounts();
                    }
                }, 1000);
            } else if (response.error) {
                const errMsg = typeof response.error === 'string' ? response.error : response.error.message;
                console.error('[Configuration] Gmail auth error:', response.error);
                toast.error(errMsg || 'Failed to start connection. Please ensure you are logged in.');
                setIsConnecting(false);
            }
        } catch (error) {
            toast.error('Failed to start Gmail connection');
            setIsConnecting(false);
        }
    };

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
                toast.success('Detected Desktop app credentials');
            } else if (parsed.web) {
                toast.info('Detected Web app - make sure redirect URI is configured in Google Cloud Console');
            }
        } catch {
            // Invalid JSON, ignore - user might be typing
        }
    };

    // Save credentials and start OAuth
    const handleSaveAndConnect = async () => {
        if (!gmailClientId || !gmailClientSecret) {
            toast.error('Please provide both Client ID and Client Secret');
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
                    toast.success('Please authorize in the opened tab, then paste the code here');
                } else {
                    const errMsg = typeof response.error === 'string' ? response.error : response.error?.message;
                    toast.error(errMsg || 'Failed to get OAuth URL');
                }
            } else {
                toast.error('Failed to save credentials');
            }
        } catch (error) {
            toast.error('Failed to save credentials');
        } finally {
            setSavingCredentials(false);
        }
    };

    // Submit authorization code to complete Gmail connection
    const handleSubmitAuthCode = async () => {
        if (!gmailAuthCode.trim()) {
            toast.error('Please paste the authorization code');
            return;
        }

        setConnectingGmail(true);
        try {
            const response = await api.connectGmail(gmailAuthCode.trim());
            if (response.data?.success) {
                toast.success('Gmail account connected successfully!');
                setShowGmailModal(false);
                actions.fetchAccounts();
            } else {
                const errMsg = typeof response.error === 'string' ? response.error : response.error?.message;
                toast.error(errMsg || 'Failed to connect Gmail');
            }
        } catch (error) {
            toast.error('Failed to connect Gmail');
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
            toast.error('Please provide the Client ID');
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
                    toast.error(errMsg || 'Failed to start device flow');
                }
            } else {
                toast.error('Failed to save credentials');
            }
        } catch (error) {
            toast.error('Failed to save credentials');
        } finally {
            setSavingOutlookCredentials(false);
        }
    };

    // Original device flow start (used after credentials saved)
    const startOutlookDeviceFlow = async () => {
        setIsOutlookConnecting(true);
        try {
            const response = await api.startMicrosoftDeviceFlow();
            if (response.data) {
                setOutlookDeviceCode(response.data);
                pollOutlookLogin(response.data.deviceCode, response.data.interval);
            } else {
                toast.error('Failed to start Outlook connection');
                setIsOutlookConnecting(false);
            }
        } catch (error) {
            toast.error('Failed to start Outlook connection');
            setIsOutlookConnecting(false);
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
                    toast.success('Outlook account connected');
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
                toast.error('Connection timed out. Please try again.');
            }
        }, 15 * 60 * 1000);
    };

    const handleSaveRule = async () => {
        if (!newRuleName) {
            toast.error('Please name your rule');
            return;
        }

        if (newRuleActions.length === 0) {
            toast.error('Please select at least one action');
            return;
        }

        setSavingRule(true);
        try {
            const condition: Record<string, any> = { [newRuleKey]: newRuleValue };
            if (newRuleOlderThan) {
                condition.older_than_days = parseInt(newRuleOlderThan, 10);
            }

            const hasDraftAction = newRuleActions.includes('draft');

            const ruleData = {
                name: newRuleName,
                description: newRuleDescription || undefined,
                intent: newRuleIntent || undefined,
                condition,
                actions: newRuleActions as any[],
                instructions: hasDraftAction ? newRuleInstructions : undefined,
                attachments: hasDraftAction ? newRuleAttachments : [],
                is_enabled: true
            };

            let success = false;
            if (editingRule) {
                success = await actions.updateRule(editingRule.id, ruleData);
            } else {
                success = await actions.createRule(ruleData);
            }

            if (success) {
                toast.success(editingRule ? 'Rule updated' : 'Rule created');
                setShowRuleModal(false);
                setEditingRule(null);
                setNewRuleName('');
                setNewRuleActions(['archive']);
                setNewRuleOlderThan('');
                setNewRuleInstructions('');
                setNewRuleDescription('');
                setNewRuleIntent('');
                setNewRuleAttachments([]);
                actions.fetchRules();
            } else {
                toast.error(`Failed to ${editingRule ? 'update' : 'create'} rule`);
            }
        } catch (error) {
            toast.error('An error occurred while saving the rule');
        } finally {
            setSavingRule(false);
        }
    };

    const handleDisconnect = async (accountId: string) => {
        if (!confirm('Are you sure you want to disconnect this account?')) return;

        const success = await actions.disconnectAccount(accountId);
        if (success) {
            toast.success('Account disconnected');
        }
    };

    const handleSaveSettings = async () => {
        setSavingSettings(true);
        const success = await actions.updateSettings(localSettings as any);
        setSavingSettings(false);

        if (success) {
            toast.success('Settings saved');
        }
    };


    const handleToggleRule = async (ruleId: string) => {
        await actions.toggleRule(ruleId);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        const file = files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${state.user.id}/${fileName}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('rule-attachments')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const newAttachment: RuleAttachment = {
                name: file.name,
                path: filePath,
                type: file.type,
                size: file.size
            };

            setNewRuleAttachments(prev => [...prev, newAttachment]);
            toast.success('File uploaded');
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Failed to upload file');
        } finally {
            setIsUploading(false);
            // Reset input
            e.target.value = '';
        }
    };

    const removeAttachment = (path: string) => {
        setNewRuleAttachments(prev => prev.filter(a => a.path !== path));
    };

    const getProviderIcon = (provider: string) => {
        if (provider === 'gmail') {
            return (
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 font-bold">
                    G
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
                                        <label className="text-sm font-medium">Client ID</label>
                                        <Input
                                            placeholder="xxx.apps.googleusercontent.com"
                                            value={gmailClientId}
                                            onChange={(e) => setGmailClientId(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Client Secret</label>
                                        <Input
                                            type="password"
                                            placeholder="GOCSPX-..."
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
                                        1. A new tab opened with Google Sign-In<br />
                                        2. Sign in and authorize the app<br />
                                        3. Copy the authorization code shown<br />
                                        4. Paste it below
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Authorization Code</label>
                                    <Input
                                        placeholder="4/0AQlEd8x..."
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
                                        Note: You need an Azure App Registration for this to work.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Client ID (Application ID)</label>
                                        <Input
                                            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                            value={outlookClientId}
                                            onChange={(e) => setOutlookClientId(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Tenant ID (Optional)</label>
                                        <Input
                                            placeholder="common"
                                            value={outlookTenantId}
                                            onChange={(e) => setOutlookTenantId(e.target.value)}
                                        />
                                        <p className="text-[10px] text-muted-foreground">
                                            Default is "common". Use your specific Tenant ID for organization accounts.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowOutlookModal(false)}>
                                    Cancel
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
                                    Save & Connect
                                </Button>
                            </DialogFooter>
                        </>
                    ) : (
                        <>
                            {outlookDeviceCode && (
                                <div className="space-y-4 py-4">
                                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                                            Action Required
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
                                            Waiting for authorization...
                                        </div>
                                    </div>
                                </div>
                            )}

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowOutlookModal(false)}>
                                    Cancel
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Create Rule Modal */}
            <Dialog open={showRuleModal} onOpenChange={(open) => {
                setShowRuleModal(open);
                if (!open) setEditingRule(null);
            }}>
                <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0">
                    <DialogHeader className="p-6 border-b">
                        <DialogTitle>{editingRule ? t('config.rules.edit') : t('config.rules.create')}</DialogTitle>
                        <DialogDescription>
                            {t('config.rules.desc')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('config.rules.name')}</label>
                            <Input
                                placeholder={t('config.rules.namePlaceholder')}
                                value={newRuleName}
                                onChange={(e) => setNewRuleName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('config.rules.description')}</label>
                            <textarea
                                className="w-full p-2 border rounded-md bg-background min-h-[60px] text-sm"
                                placeholder={t('config.rules.descriptionPlaceholder')}
                                value={newRuleDescription}
                                onChange={(e) => setNewRuleDescription(e.target.value)}
                            />
                            <p className="text-[10px] text-muted-foreground">
                                {t('config.rules.semanticHelp')}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('config.rules.intent')}</label>
                            <Input
                                placeholder={t('config.rules.intentPlaceholder')}
                                value={newRuleIntent}
                                onChange={(e) => setNewRuleIntent(e.target.value)}
                            />
                            <p className="text-[10px] text-muted-foreground">
                                {t('config.rules.intentHelp')}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t('config.rules.conditionField')}</label>
                                <select
                                    className="w-full p-2 border rounded-md bg-background text-sm"
                                    value={newRuleKey}
                                    onChange={(e) => {
                                        setNewRuleKey(e.target.value);
                                        // Set default values for certain keys
                                        if (e.target.value === 'category') setNewRuleValue('newsletter');
                                        else if (e.target.value === 'sentiment') setNewRuleValue('Positive');
                                        else if (e.target.value === 'priority') setNewRuleValue('High');
                                        else setNewRuleValue('');
                                    }}
                                >
                                    <optgroup label={t('config.rules.aiAnalysis')}>
                                        <option value="category">{t('config.rules.category')}</option>
                                        <option value="sentiment">{t('config.rules.sentiment')}</option>
                                        <option value="priority">{t('config.rules.priority')}</option>
                                    </optgroup>
                                    <optgroup label={t('config.rules.metadata')}>
                                        <option value="sender_email">{t('config.rules.senderEmail')}</option>
                                        <option value="sender_domain">{t('config.rules.senderDomain')}</option>
                                        <option value="sender_contains">{t('config.rules.senderContains')}</option>
                                        <option value="subject_contains">{t('config.rules.subjectContains')}</option>
                                        <option value="body_contains">{t('config.rules.bodyContains')}</option>
                                    </optgroup>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t('config.rules.equalsValue')}</label>
                                {newRuleKey === 'category' ? (
                                    <select
                                        className="w-full p-2 border rounded-md bg-background text-sm"
                                        value={newRuleValue}
                                        onChange={(e) => setNewRuleValue(e.target.value)}
                                    >
                                        <option value="newsletter">Newsletter</option>
                                        <option value="spam">Spam</option>
                                        <option value="promotional">Promotional</option>
                                        <option value="transactional">Transactional</option>
                                        <option value="social">Social</option>
                                        <option value="support">Support</option>
                                        <option value="client">Client</option>
                                        <option value="internal">Internal</option>
                                        <option value="personal">Personal</option>
                                        <option value="other">Other</option>
                                    </select>
                                ) : newRuleKey === 'sentiment' ? (
                                    <select
                                        className="w-full p-2 border rounded-md bg-background text-sm"
                                        value={newRuleValue}
                                        onChange={(e) => setNewRuleValue(e.target.value)}
                                    >
                                        <option value="Positive">Positive</option>
                                        <option value="Neutral">Neutral</option>
                                        <option value="Negative">Negative</option>
                                    </select>
                                ) : newRuleKey === 'priority' ? (
                                    <select
                                        className="w-full p-2 border rounded-md bg-background text-sm"
                                        value={newRuleValue}
                                        onChange={(e) => setNewRuleValue(e.target.value)}
                                    >
                                        <option value="High">High</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Low">Low</option>
                                    </select>
                                ) : (
                                    <Input
                                        placeholder={
                                            newRuleKey === 'sender_domain' ? 'rta.vn' :
                                                newRuleKey === 'sender_email' ? 'john@example.com' :
                                                    t('config.rules.keywordsPlaceholder')
                                        }
                                        value={newRuleValue}
                                        onChange={(e) => setNewRuleValue(e.target.value)}
                                    />
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                {t('config.rules.olderThan')}
                            </label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    className="w-24"
                                    value={newRuleOlderThan}
                                    onChange={(e) => setNewRuleOlderThan(e.target.value)}
                                />
                                <span className="text-sm text-muted-foreground">days</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                                {t('config.rules.olderThanHelp')}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('config.rules.performActions')}</label>
                            <p className="text-xs text-muted-foreground mb-2">
                                Select one or more actions to execute when the rule matches
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { value: 'archive', label: t('common.archive') },
                                    { value: 'delete', label: t('common.delete') },
                                    { value: 'draft', label: t('common.draft') },
                                    { value: 'star', label: t('common.star') },
                                ].map((option) => (
                                    <label
                                        key={option.value}
                                        className={`flex items-center gap-2 p-2 border rounded-md cursor-pointer transition-colors ${newRuleActions.includes(option.value)
                                            ? 'bg-primary/10 border-primary'
                                            : 'bg-background hover:bg-secondary/50'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={newRuleActions.includes(option.value)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setNewRuleActions([...newRuleActions, option.value]);
                                                } else {
                                                    setNewRuleActions(newRuleActions.filter(a => a !== option.value));
                                                }
                                            }}
                                            className="rounded border-gray-300"
                                        />
                                        <span className="text-sm">{option.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {newRuleActions.includes('draft') && (
                            <>
                                <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                                    <label className="text-sm font-medium">{t('config.rules.draftInstructions')}</label>
                                    <textarea
                                        className="w-full p-2 border rounded-md bg-background min-h-[80px] text-sm"
                                        placeholder="e.g. Tell them I'm busy until Friday, but interested in the proposal."
                                        value={newRuleInstructions}
                                        onChange={(e) => setNewRuleInstructions(e.target.value)}
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        {t('config.rules.contextHelp')}
                                    </p>
                                </div>

                                <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <Paperclip className="w-4 h-4" />
                                        Attachments (Optional)
                                    </label>

                                    <div className="flex flex-col gap-2">
                                        {newRuleAttachments.map(file => (
                                            <div key={file.path} className="flex items-center justify-between p-2 bg-secondary/50 rounded border text-xs">
                                                <span className="truncate max-w-[200px]">{file.name}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0 text-destructive"
                                                    onClick={() => removeAttachment(file.path)}
                                                >
                                                    <X className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        ))}

                                        <div className="relative">
                                            <input
                                                type="file"
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                onChange={handleFileUpload}
                                                disabled={isUploading}
                                            />
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full border-dashed"
                                                disabled={isUploading}
                                            >
                                                {isUploading ? (
                                                    <LoadingSpinner size="sm" className="mr-2" />
                                                ) : (
                                                    <Plus className="w-3 h-3 mr-2" />
                                                )}
                                                {isUploading ? t('config.rules.uploading') : t('config.rules.addAttachment')}
                                            </Button>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">
                                        {t('config.rules.attachmentHelp')}
                                    </p>
                                </div>
                            </>
                        )}
                    </div>

                    <DialogFooter className="p-6 border-t bg-secondary/5">
                        <Button variant="outline" onClick={() => setShowRuleModal(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={handleSaveRule} disabled={savingRule}>
                            {savingRule ? <LoadingSpinner size="sm" className="mr-2" /> : (editingRule ? <Check className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />)}
                            {editingRule ? t('config.rules.saveChanges') : t('config.rules.createRule')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                                                <div className="font-medium">Gmail</div>
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
                                                <div className="font-medium">Outlook</div>
                                                <div className="text-xs text-muted-foreground">{t('config.outlook.connectDesc')}</div>
                                            </div>
                                            {isOutlookConnecting && !outlookDeviceCode ? (
                                                <LoadingSpinner size="sm" />
                                            ) : (
                                                <Plus className="w-5 h-5 shrink-0" />
                                            )}
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
                                            Open Microsoft Login
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
                                                    <h4 className="font-medium capitalize">{account.provider}</h4>
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

            {/* LLM Settings Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 text-indigo-500" />
                        {t('config.model.title')}
                    </CardTitle>
                    <CardDescription>{t('config.model.desc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('config.model.provider')}</label>
                            {isLoadingProviders ? (
                                <div className="h-10 border rounded-md flex items-center px-3 bg-muted/20">
                                    <LoadingSpinner size="sm" className="mr-2" />
                                    <span className="text-xs text-muted-foreground italic">Discovering...</span>
                                </div>
                            ) : (
                                <>
                                    <select
                                        className="w-full h-10 px-3 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        value={localSettings.llm_provider || DEFAULT_PROVIDER}
                                        onChange={(e) => handleProviderChange(e.target.value)}
                                        disabled={isLoadingProviders}
                                    >
                                        <option value={DEFAULT_PROVIDER}>RealTimeX AI (Default)</option>
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
                                    placeholder="e.g. gpt-4o-mini"
                                    value={localSettings.llm_model || ''}
                                    onChange={(e) => setLocalSettings(s => ({ ...s, llm_model: e.target.value }))}
                                />
                            )}
                        </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-border/50">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Database className="w-4 h-4" />
                            {t('config.model.storagePath')}
                        </label>
                        <Input
                            placeholder={t('config.model.storagePlaceholder')}
                            value={localSettings.storage_path || ''}
                            onChange={(e) => setLocalSettings(s => ({ ...s, storage_path: e.target.value }))}
                        />
                        <p className="text-[10px] text-muted-foreground italic">
                            {t('config.model.storageHelp')}
                        </p>
                    </div>

                    <div className="flex justify-between items-center py-3 border-t border-border/50">
                        <div>
                            <h4 className="font-medium text-sm">{t('config.model.intelligentRename')}</h4>
                            <p className="text-xs text-muted-foreground">
                                {t('config.model.renameHelp')}
                            </p>
                        </div>
                        <Button
                            variant={localSettings.intelligent_rename ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setLocalSettings(s => ({ ...s, intelligent_rename: !s.intelligent_rename }))}
                        >
                            <Power className="w-4 h-4 mr-1" />
                            {localSettings.intelligent_rename ? t('common.enabled') : t('common.disabled')}
                        </Button>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-border/50">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {t('config.model.syncInterval')}
                        </label>
                        <Input
                            type="number"
                            min={1}
                            max={1440}
                            value={localSettings.sync_interval_minutes || 5}
                            onChange={(e) => setLocalSettings(s => ({ ...s, sync_interval_minutes: parseInt(e.target.value, 10) || 5 }))}
                        />
                        <p className="text-[10px] text-muted-foreground italic">
                            {t('config.model.syncHelp')}
                        </p>
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

            {/* Provider Credentials (BYOK) Section */}
            <div ref={credentialsRef}>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-orange-500" />
                            {t('config.byok.title')}
                        </CardTitle>
                        <CardDescription>
                            {t('config.byok.desc')}
                            {t('config.byok.systemDefault')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Google */}
                        <div className="space-y-4 border-b pb-4">
                            <h4 className="font-medium flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500" /> Google / Gmail
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Client ID</label>
                                    <Input
                                        type="password"
                                        placeholder="...apps.googleusercontent.com"
                                        value={localSettings.google_client_id || ''}
                                        onChange={(e) => setLocalSettings(s => ({ ...s, google_client_id: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Client Secret</label>
                                    <Input
                                        type="password"
                                        placeholder="GOCSPX-..."
                                        value={localSettings.google_client_secret || ''}
                                        onChange={(e) => setLocalSettings(s => ({ ...s, google_client_secret: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Microsoft */}
                        <div className="space-y-4">
                            <h4 className="font-medium flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500" /> Microsoft / Outlook
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Client ID</label>
                                    <Input
                                        type="password"
                                        value={localSettings.microsoft_client_id || ''}
                                        onChange={(e) => setLocalSettings(s => ({ ...s, microsoft_client_id: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Client Secret (Optional)</label>
                                    <Input
                                        type="password"
                                        value={localSettings.microsoft_client_secret || ''}
                                        onChange={(e) => setLocalSettings(s => ({ ...s, microsoft_client_secret: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Tenant ID</label>
                                    <Input
                                        placeholder="common"
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
        </div>
    );
}

