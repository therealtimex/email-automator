import { useEffect, useState, useRef } from 'react';
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

export function Configuration() {
    const { state, actions } = useApp();
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

    const handleTestConnection = async () => {
        setTestingLlm(true);
        try {
            const result = await api.testLlm({
                llm_model: localSettings.llm_model || null,
                llm_base_url: localSettings.llm_base_url || null,
                llm_api_key: localSettings.llm_api_key || null,
            });

            if (result.data?.success) {
                toast.success(result.data.message);
            } else {
                toast.error(result.data?.message || 'Connection test failed');
            }
        } catch (error) {
            toast.error('Failed to test connection');
        } finally {
            setTestingLlm(false);
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
                            Connect Gmail Account
                        </DialogTitle>
                        <DialogDescription>
                            {gmailModalStep === 'credentials'
                                ? 'Enter your Google OAuth credentials to connect your Gmail account.'
                                : 'Paste the authorization code from Google to complete the connection.'}
                        </DialogDescription>
                    </DialogHeader>

                    {gmailModalStep === 'credentials' ? (
                        <>
                            <div className="space-y-4 py-4">
                                {/* Paste JSON option */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <Upload className="w-4 h-4" />
                                        Paste credentials.json
                                    </label>
                                    <textarea
                                        className="w-full h-24 p-3 text-xs font-mono border rounded-lg bg-secondary/30 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                                        placeholder='{"installed":{"client_id":"...","client_secret":"..."}}'
                                        value={credentialsJson}
                                        onChange={(e) => handleCredentialsJsonChange(e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Download from Google Cloud Console → APIs & Services → Credentials
                                    </p>
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-background px-2 text-muted-foreground">or enter manually</span>
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
                                    Cancel
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
                                    Save & Connect
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
                                    Back
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
                                    Connect
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
                            Connect Outlook Account
                        </DialogTitle>
                        <DialogDescription>
                            {outlookModalStep === 'credentials'
                                ? 'Enter your Microsoft Azure App credentials to connect your Outlook account.'
                                : 'Follow the instructions to authorize the application.'}
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
                        <DialogTitle>{editingRule ? 'Edit Auto-Pilot Rule' : 'Create Auto-Pilot Rule'}</DialogTitle>
                        <DialogDescription>
                            Define a condition based on AI analysis to trigger an action.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Rule Name</label>
                            <Input
                                placeholder="e.g. Archive Newsletters"
                                value={newRuleName}
                                onChange={(e) => setNewRuleName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <textarea
                                className="w-full p-2 border rounded-md bg-background min-h-[60px] text-sm"
                                placeholder="e.g. Handle all marketing newsletters and promotional content from subscription services"
                                value={newRuleDescription}
                                onChange={(e) => setNewRuleDescription(e.target.value)}
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Describe what this rule is for. The AI uses this to semantically match emails.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Intent</label>
                            <Input
                                placeholder="e.g. Politely decline all sales pitches"
                                value={newRuleIntent}
                                onChange={(e) => setNewRuleIntent(e.target.value)}
                            />
                            <p className="text-[10px] text-muted-foreground">
                                The goal of this rule. Used to generate appropriate draft replies.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">If Condition Field</label>
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
                                    <optgroup label="AI Analysis">
                                        <option value="category">Category</option>
                                        <option value="sentiment">Sentiment</option>
                                        <option value="priority">Priority</option>
                                    </optgroup>
                                    <optgroup label="Metadata">
                                        <option value="sender_email">Specific Email (Exact)</option>
                                        <option value="sender_domain">Email Domain (@...)</option>
                                        <option value="sender_contains">Sender contains...</option>
                                        <option value="subject_contains">Subject contains...</option>
                                        <option value="body_contains">Body contains...</option>
                                    </optgroup>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Equals Value</label>
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
                                            'Keywords...'
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
                                Only if email is older than... (Optional)
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
                                Leave empty or 0 to apply rule immediately upon receipt.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Then Perform Action(s)</label>
                            <p className="text-xs text-muted-foreground mb-2">
                                Select one or more actions to execute when the rule matches
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { value: 'archive', label: 'Archive Email' },
                                    { value: 'delete', label: 'Delete Email' },
                                    { value: 'draft', label: 'Draft Reply' },
                                    { value: 'read', label: 'Mark as Read' },
                                    { value: 'star', label: 'Star / Flag' },
                                ].map((option) => (
                                    <label
                                        key={option.value}
                                        className={`flex items-center gap-2 p-2 border rounded-md cursor-pointer transition-colors ${
                                            newRuleActions.includes(option.value)
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
                                    <label className="text-sm font-medium">Draft Instructions (Context)</label>
                                    <textarea
                                        className="w-full p-2 border rounded-md bg-background min-h-[80px] text-sm"
                                        placeholder="e.g. Tell them I'm busy until Friday, but interested in the proposal."
                                        value={newRuleInstructions}
                                        onChange={(e) => setNewRuleInstructions(e.target.value)}
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        Specific context for the AI ghostwriter.
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
                                                {isUploading ? 'Uploading...' : 'Add Attachment'}
                                            </Button>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">
                                        Files will be attached to every draft generated by this rule.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>

                    <DialogFooter className="p-6 border-t bg-secondary/5">
                        <Button variant="outline" onClick={() => setShowRuleModal(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveRule} disabled={savingRule}>
                            {savingRule ? <LoadingSpinner size="sm" className="mr-2" /> : (editingRule ? <Check className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />)}
                            {editingRule ? 'Save Changes' : 'Create Rule'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Email Accounts Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="w-5 h-5 text-primary" />
                            Connected Accounts
                        </CardTitle>
                        <CardDescription>Manage your email providers</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {state.accounts.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No accounts connected yet
                            </p>
                        ) : (
                            state.accounts.map((account: EmailAccount) => (
                                <div
                                    key={account.id}
                                    className="flex items-center justify-between p-4 border rounded-lg bg-card"
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
                                                Active
                                            </span>
                                        ) : (
                                            <span className="text-xs text-yellow-600 bg-yellow-500/10 px-2 py-1 rounded-full">
                                                Inactive
                                            </span>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => handleDisconnect(account.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}

                        <div className="flex flex-col gap-2">
                            <Button
                                className="w-full border-dashed"
                                variant="outline"
                                onClick={handleConnectGmail}
                                disabled={isConnecting || isOutlookConnecting}
                            >
                                {isConnecting ? (
                                    <LoadingSpinner size="sm" className="mr-2" />
                                ) : (
                                    <Plus className="w-4 h-4 mr-2" />
                                )}
                                Connect Gmail Account
                            </Button>

                            <Button
                                className="w-full border-dashed"
                                variant="outline"
                                onClick={handleConnectOutlook}
                                disabled={isConnecting || isOutlookConnecting}
                            >
                                {isOutlookConnecting && !outlookDeviceCode ? (
                                    <LoadingSpinner size="sm" className="mr-2" />
                                ) : (
                                    <Plus className="w-4 h-4 mr-2" />
                                )}
                                Connect Outlook Account
                            </Button>
                        </div>

                        {outlookDeviceCode && (
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg animate-in slide-in-from-top-2">
                                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                                    Microsoft Sign-In Required
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
                                        Waiting for you to sign in...
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Auto-Pilot Rules Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-emerald-500" />
                            Auto-Pilot Rules
                        </CardTitle>
                        <CardDescription>Configure AI automation behavior</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Built-in toggles */}
                        <div className="flex justify-between items-center py-3 border-b border-border">
                            <div>
                                <h4 className="font-medium text-sm">Auto-Trash Spam</h4>
                                <p className="text-xs text-muted-foreground">
                                    Automatically delete emails categorized as spam
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => {
                                        const rule = state.rules.find(r => r.name === 'Auto-Trash Spam');
                                        if (rule) handleEditClick(rule);
                                    }}
                                    title="Edit Logic"
                                >
                                    <Edit2 className="w-4 h-4 text-muted-foreground" />
                                </Button>
                                <Button
                                    variant={state.rules.find(r => r.name === 'Auto-Trash Spam')?.is_enabled ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={handleToggleSpam}
                                    disabled={loadingSetting === 'auto_trash_spam'}
                                >
                                    {loadingSetting === 'auto_trash_spam' ? (
                                        <LoadingSpinner size="sm" className="mr-1" />
                                    ) : (
                                        <Power className="w-4 h-4 mr-1" />
                                    )}
                                    {state.rules.find(r => r.name === 'Auto-Trash Spam')?.is_enabled ? 'On' : 'Off'}
                                </Button>
                            </div>
                        </div>

                        <div className="flex justify-between items-center py-3 border-b border-border">
                            <div>
                                <h4 className="font-medium text-sm">Smart Drafts</h4>
                                <p className="text-xs text-muted-foreground">
                                    Generate draft replies for important emails
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => {
                                        const rule = state.rules.find(r => r.name === 'Smart Drafts');
                                        if (rule) handleEditClick(rule);
                                    }}
                                    title="Edit Logic"
                                >
                                    <Edit2 className="w-4 h-4 text-muted-foreground" />
                                </Button>
                                <Button
                                    variant={state.rules.find(r => r.name === 'Smart Drafts')?.is_enabled ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={handleToggleDrafts}
                                    disabled={loadingSetting === 'smart_drafts'}
                                >
                                    {loadingSetting === 'smart_drafts' ? (
                                        <LoadingSpinner size="sm" className="mr-1" />
                                    ) : (
                                        <Power className="w-4 h-4 mr-1" />
                                    )}
                                    {state.rules.find(r => r.name === 'Smart Drafts')?.is_enabled ? 'On' : 'Off'}
                                </Button>
                            </div>
                        </div>

                        {/* Custom Rules */}
                        <div className="pt-2">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-medium">Custom Rules</h4>
                                <Button variant="ghost" size="sm" onClick={() => {
                                    setEditingRule(null);
                                    setNewRuleName('');
                                    setNewRuleDescription('');
                                    setNewRuleIntent('');
                                    setNewRuleActions(['archive']);
                                    setNewRuleOlderThan('');
                                    setNewRuleInstructions('');
                                    setNewRuleAttachments([]);
                                    setShowRuleModal(true);
                                }}>
                                    <Plus className="w-4 h-4 mr-1" /> Add Rule
                                </Button>
                            </div>

                            {state.rules.length === 0 && (
                                <p className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-lg">
                                    No custom rules yet
                                </p>
                            )}

                            {state.rules.length > 0 && state.rules
                                .filter(r => r.name !== 'Auto-Trash Spam' && r.name !== 'Smart Drafts')
                                .map((rule: Rule) => {
                                const ruleActions = rule.actions && rule.actions.length > 0
                                    ? rule.actions
                                    : (rule.action ? [rule.action] : []);
                                return (
                                <div
                                    key={rule.id}
                                    className="p-3 bg-secondary/30 rounded-lg mb-2"
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <div>
                                            <span className="text-sm font-medium">{rule.name}</span>
                                            <span className="text-xs text-muted-foreground ml-2">
                                                → {ruleActions.join(' + ')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0"
                                                onClick={() => handleEditClick(rule)}
                                                title="Edit Rule"
                                            >
                                                <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                                            </Button>
                                            <Button
                                                variant={rule.is_enabled ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => handleToggleRule(rule.id)}
                                                className="h-7 px-2"
                                            >
                                                <Power className="w-3.5 h-3.5 mr-1" />
                                                {rule.is_enabled ? 'On' : 'Off'}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive"
                                                onClick={() => actions.deleteRule(rule.id)}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                    {rule.instructions && (
                                        <p className="text-[10px] text-muted-foreground italic border-t border-border/50 pt-1 mt-1 truncate">
                                            "{rule.instructions}"
                                        </p>
                                    )}
                                    {rule.attachments && rule.attachments.length > 0 && (
                                        <div className="flex gap-1 mt-1">
                                            {rule.attachments.map(a => (
                                                <div key={a.path} className="flex items-center gap-1 text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">
                                                    <Paperclip className="w-2.5 h-2.5" />
                                                    {a.name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );})}
                        </div>

                    </CardContent>
                </Card>
            </div>

            {/* LLM Settings Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 text-indigo-500" />
                        Model Configuration
                    </CardTitle>
                    <CardDescription>Configure Local LLM or API settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Model Name</label>
                            <Input
                                placeholder="gpt-4o-mini"
                                value={localSettings.llm_model || ''}
                                onChange={(e) => setLocalSettings(s => ({ ...s, llm_model: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Base URL</label>
                            <Input
                                placeholder="https://api.openai.com/v1"
                                value={localSettings.llm_base_url || ''}
                                onChange={(e) => setLocalSettings(s => ({ ...s, llm_base_url: e.target.value }))}
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Use http://localhost:11434/v1 for Ollama
                            </p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">API Key</label>
                            <Input
                                type="password"
                                placeholder="sk-..."
                                value={localSettings.llm_api_key || ''}
                                onChange={(e) => setLocalSettings(s => ({ ...s, llm_api_key: e.target.value }))}
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-2 pt-2 border-t border-border/50">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Database className="w-4 h-4" />
                            Local Storage Path (.eml)
                        </label>
                        <Input
                            placeholder="e.g. ./data/emails or ~/.email-automator/emails"
                            value={localSettings.storage_path || ''}
                            onChange={(e) => setLocalSettings(s => ({ ...s, storage_path: e.target.value }))}
                        />
                        <p className="text-[10px] text-muted-foreground italic">
                            Directory where raw emails (.eml) are saved. Default: ./data/emails (falls back to ~/.email-automator/emails if restricted).
                        </p>
                    </div>

                    <div className="flex justify-between items-center py-3 border-t border-border/50">
                        <div>
                            <h4 className="font-medium text-sm">Intelligent Rename</h4>
                            <p className="text-xs text-muted-foreground">
                                Use slugified-hyphenated filenames (e.g. 20240119-1430-subject-id.eml)
                            </p>
                        </div>
                        <Button
                            variant={localSettings.intelligent_rename ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setLocalSettings(s => ({ ...s, intelligent_rename: !s.intelligent_rename }))}
                        >
                            <Power className="w-4 h-4 mr-1" />
                            {localSettings.intelligent_rename ? 'On' : 'Off'}
                        </Button>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-border/50">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Background Sync Interval (minutes)
                        </label>
                        <Input
                            type="number"
                            min={1}
                            max={1440}
                            value={localSettings.sync_interval_minutes || 5}
                            onChange={(e) => setLocalSettings(s => ({ ...s, sync_interval_minutes: parseInt(e.target.value, 10) || 5 }))}
                        />
                        <p className="text-[10px] text-muted-foreground italic">
                            How often the system checks for new emails in the background.
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
                            Check Connection
                        </Button>
                        <Button onClick={handleSaveSettings} disabled={savingSettings}>
                            {savingSettings ? (
                                <LoadingSpinner size="sm" className="mr-2" />
                            ) : (
                                <Check className="w-4 h-4 mr-2" />
                            )}
                            Save Configuration
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Provider Credentials (BYOK) Section */}
            <div ref={credentialsRef}>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-orange-500" />
                            Provider Credentials (Advanced)
                        </CardTitle>
                        <CardDescription>
                            Bring Your Own Keys (BYOK). Configure your own OAuth credentials here.
                            Leave empty to use system defaults.
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
                                Save Credentials
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

