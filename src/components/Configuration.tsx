import { useEffect, useState } from 'react';
import { ShieldCheck, Database, RefreshCw, Plus, Check, Trash2, Power, ExternalLink } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { toast } from './Toast';
import { LoadingSpinner } from './LoadingSpinner';
import { EmailAccount, Rule, UserSettings } from '../lib/types';

export function Configuration() {
    const { state, actions } = useApp();
    const [isConnecting, setIsConnecting] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);
    const [localSettings, setLocalSettings] = useState<Partial<UserSettings>>({});

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

    const handleConnectGmail = async () => {
        setIsConnecting(true);
        try {
            const response = await api.getGmailAuthUrl();
            if (response.data?.url) {
                // Open OAuth popup
                const popup = window.open(response.data.url, 'gmail-auth', 'width=600,height=700');
                
                // Listen for callback (in production, use proper OAuth callback handling)
                const checkPopup = setInterval(() => {
                    if (popup?.closed) {
                        clearInterval(checkPopup);
                        setIsConnecting(false);
                        actions.fetchAccounts();
                    }
                }, 1000);
            }
        } catch (error) {
            toast.error('Failed to start Gmail connection');
            setIsConnecting(false);
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
        const success = await actions.updateSettings(localSettings);
        setSavingSettings(false);
        
        if (success) {
            toast.success('Settings saved');
        }
    };

    const handleToggleRule = async (ruleId: string) => {
        await actions.toggleRule(ruleId);
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

                        <Button 
                            className="w-full border-dashed" 
                            variant="outline"
                            onClick={handleConnectGmail}
                            disabled={isConnecting}
                        >
                            {isConnecting ? (
                                <LoadingSpinner size="sm" className="mr-2" />
                            ) : (
                                <Plus className="w-4 h-4 mr-2" />
                            )}
                            Connect Gmail Account
                        </Button>
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
                            <Button
                                variant={localSettings.auto_trash_spam ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setLocalSettings(s => ({ ...s, auto_trash_spam: !s.auto_trash_spam }))}
                            >
                                <Power className="w-4 h-4 mr-1" />
                                {localSettings.auto_trash_spam ? 'On' : 'Off'}
                            </Button>
                        </div>
                        
                        <div className="flex justify-between items-center py-3 border-b border-border">
                            <div>
                                <h4 className="font-medium text-sm">Smart Drafts</h4>
                                <p className="text-xs text-muted-foreground">
                                    Generate draft replies for important emails
                                </p>
                            </div>
                            <Button
                                variant={localSettings.smart_drafts ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setLocalSettings(s => ({ ...s, smart_drafts: !s.smart_drafts }))}
                            >
                                <Power className="w-4 h-4 mr-1" />
                                {localSettings.smart_drafts ? 'On' : 'Off'}
                            </Button>
                        </div>

                        {/* Custom Rules */}
                        {state.rules.length > 0 && (
                            <div className="pt-2">
                                <h4 className="text-sm font-medium mb-2">Custom Rules</h4>
                                {state.rules.map((rule: Rule) => (
                                    <div 
                                        key={rule.id}
                                        className="flex justify-between items-center py-2 px-3 bg-secondary/30 rounded-lg mb-2"
                                    >
                                        <div>
                                            <span className="text-sm">{rule.name}</span>
                                            <span className="text-xs text-muted-foreground ml-2">
                                                → {rule.action}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleToggleRule(rule.id)}
                                            >
                                                {rule.is_enabled ? (
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                ) : (
                                                    <span className="w-2 h-2 rounded-full bg-gray-400" />
                                                )}
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
                                ))}
                            </div>
                        )}
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
                            <label className="text-sm font-medium">Sync Interval (minutes)</label>
                            <Input 
                                type="number"
                                min={1}
                                max={60}
                                value={localSettings.sync_interval_minutes || 5}
                                onChange={(e) => setLocalSettings(s => ({ 
                                    ...s, 
                                    sync_interval_minutes: parseInt(e.target.value, 10) || 5 
                                }))}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end mt-4">
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
        </div>
    );
}
