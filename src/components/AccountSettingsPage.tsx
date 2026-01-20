import { useState, useEffect } from 'react';
import { User, Shield, Database, Save, Loader2, LogOut, Trash2, Settings, CheckCircle, XCircle, ExternalLink, Key, Camera, Volume2, VolumeX } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { toast } from './Toast';
import { LoadingSpinner } from './LoadingSpinner';
import { getSupabaseConfig, clearSupabaseConfig, getConfigSource } from '../lib/supabase-config';
import { SetupWizard } from './SetupWizard';
import { sounds } from '../lib/sounds';

type SettingsTab = 'profile' | 'security' | 'database';

export function AccountSettingsPage() {
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
    const { state, actions } = useApp();

    useEffect(() => {
        actions.fetchProfile();
    }, []);

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'database', label: 'Supabase', icon: Database },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
                <p className="text-muted-foreground">Manage your profile, security, and connection preferences.</p>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Tabs */}
                <aside className="w-full md:w-64 flex flex-col justify-between">
                    <nav className="space-y-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as SettingsTab)}
                                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                        isActive 
                                            ? 'bg-primary text-primary-foreground' 
                                            : 'hover:bg-secondary text-muted-foreground'
                                    }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </nav>

                    <div className="mt-8 px-4 py-4 border-t border-border/40 text-center md:text-left">
                        <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-1">Version</p>
                        <p className="text-xs font-mono text-muted-foreground/70">v{import.meta.env.VITE_APP_VERSION}</p>
                    </div>
                </aside>

                {/* Content Area */}
                <div className="flex-1 space-y-6">
                    {activeTab === 'profile' && <ProfileSection />}
                    {activeTab === 'security' && <SecuritySection />}
                    {activeTab === 'database' && <DatabaseSection />}
                </div>
            </div>
        </div>
    );
}

function ProfileSection() {
    const { state, actions } = useApp();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [soundsEnabled, setSoundsEnabled] = useState(sounds.isEnabled());

    useEffect(() => {
        if (state.profile) {
            setFirstName(state.profile.first_name || '');
            setLastName(state.profile.last_name || '');
        }
    }, [state.profile]);

    const toggleSounds = () => {
        const next = !soundsEnabled;
        sounds.setEnabled(next);
        setSoundsEnabled(next);
        if (next) {
            sounds.playSuccess();
            toast.success('Sound effects enabled');
        } else {
            toast.info('Sound effects disabled');
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        const success = await actions.updateProfile({
            first_name: firstName,
            last_name: lastName
        });
        setIsSaving(false);
        if (success) {
            toast.success('Profile updated');
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !state.user) return;

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${state.user.id}/avatar.${fileExt}`;
            
            // Upload to Supabase Storage
            const { data, error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            // Update profile
            await actions.updateProfile({ avatar_url: publicUrl });
            toast.success('Avatar updated');
        } catch (error) {
            console.error('Avatar upload error:', error);
            toast.error('Failed to upload avatar');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal details and avatar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-full bg-secondary overflow-hidden border-2 border-border flex items-center justify-center">
                            {state.profile?.avatar_url ? (
                                <img src={state.profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-12 h-12 text-muted-foreground" />
                            )}
                        </div>
                        <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                            <Camera className="w-6 h-6 text-white" />
                            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={isUploading} />
                        </label>
                        {isUploading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-full">
                                <LoadingSpinner size="sm" />
                            </div>
                        )}
                    </div>
                    
                    <div className="flex-1 space-y-4 w-full">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="first-name">First Name</Label>
                                <Input 
                                    id="first-name" 
                                    value={firstName} 
                                    onChange={(e) => setFirstName(e.target.value)} 
                                    placeholder="John"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="last-name">Last Name</Label>
                                <Input 
                                    id="last-name" 
                                    value={lastName} 
                                    onChange={(e) => setLastName(e.target.value)} 
                                    placeholder="Doe"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input 
                                id="email" 
                                value={state.profile?.email || ''} 
                                disabled 
                                className="bg-secondary/50"
                            />
                            <p className="text-[10px] text-muted-foreground">Email cannot be changed directly.</p>
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t flex items-center justify-between">
                    <div className="space-y-0.5">
                        <label className="text-sm font-medium">Sound & Haptics</label>
                        <p className="text-xs text-muted-foreground">Audio feedback when processing emails and completing tasks.</p>
                    </div>
                    <Button 
                        variant={soundsEnabled ? 'default' : 'outline'}
                        size="sm"
                        onClick={toggleSounds}
                        className="gap-2"
                    >
                        {soundsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                        {soundsEnabled ? 'Enabled' : 'Disabled'}
                    </Button>
                </div>

                <div className="flex justify-end pt-4 border-t">
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <LoadingSpinner size="sm" className="mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Changes
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function SecuritySection() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handlePasswordChange = async () => {
        if (!password) {
            toast.error('Please enter a new password');
            return;
        }
        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        if (password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setIsSaving(true);
        try {
            const { api } = await import('../lib/api');
            const result = await api.changePassword(password);
            if (result.success) {
                toast.success('Password changed successfully');
                setPassword('');
                setConfirmPassword('');
            } else {
                toast.error(result.error?.message || 'Failed to change password');
            }
        } catch (error) {
            toast.error('An error occurred');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>Manage your password and account security.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input 
                        id="new-password" 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        placeholder="••••••••"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input 
                        id="confirm-password" 
                        type="password" 
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)} 
                        placeholder="••••••••"
                    />
                </div>
                
                <div className="flex justify-end pt-4 border-t">
                    <Button onClick={handlePasswordChange} disabled={isSaving}>
                        {isSaving ? <LoadingSpinner size="sm" className="mr-2" /> : <Key className="w-4 h-4 mr-2" />}
                        Update Password
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function DatabaseSection() {
    const [showWizard, setShowWizard] = useState(false);
    const config = getSupabaseConfig();
    const source = getConfigSource();

    const handleClearConfig = () => {
        if (confirm('Are you sure you want to disconnect from this Supabase project? This will log you out and clear local configuration.')) {
            clearSupabaseConfig();
            window.location.reload();
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-primary" />
                        Supabase Connection
                    </CardTitle>
                    <CardDescription>Manage your database configuration (BYOK - Bring Your Own Keys).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {config ? (
                        <>
                            {/* Status Card */}
                            <div className="flex items-start gap-4 p-4 border rounded-xl bg-emerald-500/5 border-emerald-500/20">
                                <CheckCircle className="w-6 h-6 text-emerald-500 mt-0.5" />
                                <div className="flex-1 space-y-1">
                                    <p className="font-semibold text-emerald-700 dark:text-emerald-400">Connected</p>
                                    <p className="text-sm font-mono break-all opacity-80">{config.url}</p>
                                </div>
                            </div>

                            {source === 'env' && (
                                <Alert className="bg-amber-500/5 border-amber-500/20">
                                    <Settings className="h-4 w-4 text-amber-500" />
                                    <AlertDescription className="text-amber-700 dark:text-amber-400 text-xs">
                                        Configuration is loaded from environment variables. Use the UI to override them.
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Button variant="outline" onClick={() => setShowWizard(true)} className="w-full">
                                    <Settings className="w-4 h-4 mr-2" />
                                    Change Connection
                                </Button>
                                {source === 'ui' && (
                                    <Button variant="outline" onClick={handleClearConfig} className="w-full text-destructive hover:bg-destructive/10">
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Clear Config
                                    </Button>
                                )}
                            </div>

                            <div className="space-y-2 pt-4 border-t">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Anon Public Key</Label>
                                <div className="p-2 bg-secondary/50 rounded-lg font-mono text-xs break-all">
                                    {config.anonKey.substring(0, 20)}...{config.anonKey.substring(config.anonKey.length - 10)}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                            <XCircle className="w-12 h-12 text-destructive opacity-20" />
                            <div>
                                <p className="font-medium">No Connection Detected</p>
                                <p className="text-sm text-muted-foreground">Configure a Supabase project to get started.</p>
                            </div>
                            <Button onClick={() => setShowWizard(true)}>
                                <Database className="w-4 h-4 mr-2" />
                                Setup Supabase
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <SetupWizard open={showWizard} onComplete={() => setShowWizard(false)} canClose={true} />
        </>
    );
}
