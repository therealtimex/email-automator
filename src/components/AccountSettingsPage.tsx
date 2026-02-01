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
import { checkMigrationStatus, type MigrationStatus } from '../lib/migration-check';
import { useLanguage } from '../context/LanguageContext';

type SettingsTab = 'profile' | 'security' | 'database';

export function AccountSettingsPage() {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
    const { state, actions } = useApp();

    useEffect(() => {
        actions.fetchProfile();
    }, []);

    const tabs = [
        { id: 'profile', label: t('account.profile'), icon: User },
        { id: 'security', label: t('account.security'), icon: Shield },
        { id: 'database', label: t('account.database'), icon: Database },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">{t('account.title')}</h1>
                <p className="text-muted-foreground">{t('account.subtitle')}</p>
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
                                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${isActive
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

                    <div className="mt-auto space-y-1">
                        <button
                            onClick={async () => {
                                await supabase.auth.signOut();
                                toast.success(t('account.logoutSuccess'));
                                window.location.reload();
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors hover:bg-destructive/10 text-destructive"
                        >
                            <LogOut className="w-4 h-4" />
                            {t('account.logout')}
                        </button>

                        <div className="px-4 py-4 border-t border-border/40 text-center md:text-left">
                            <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-1">{t('account.version')}</p>
                            <p className="text-xs font-mono text-muted-foreground/70">v{import.meta.env.VITE_APP_VERSION}</p>
                        </div>
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
    const { t } = useLanguage();
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
            toast.success(t('account.profile.soundsEnabled'));
        } else {
            toast.info(t('account.profile.soundsDisabled'));
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
            toast.success(t('account.profile.updated'));
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
            toast.success(t('account.profile.avatarUpdated'));
        } catch (error) {
            console.error('Avatar upload error:', error);
            toast.error(t('account.profile.avatarError'));
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('account.profile.title')}</CardTitle>
                <CardDescription>{t('account.profile.desc')}</CardDescription>
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
                                <Label htmlFor="first-name">{t('account.profile.firstName')}</Label>
                                <Input
                                    id="first-name"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    placeholder={t('account.profile.firstNamePlaceholder')}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="last-name">{t('account.profile.lastName')}</Label>
                                <Input
                                    id="last-name"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    placeholder={t('account.profile.lastNamePlaceholder')}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">{t('account.profile.email')}</Label>
                            <Input
                                id="email"
                                value={state.profile?.email || ''}
                                disabled
                                className="bg-secondary/50"
                            />
                            <p className="text-[10px] text-muted-foreground">{t('account.profile.emailHelp')}</p>
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t flex items-center justify-between">
                    <div className="space-y-0.5">
                        <label className="text-sm font-medium">{t('account.profile.sounds')}</label>
                        <p className="text-xs text-muted-foreground">{t('account.profile.soundsHelp')}</p>
                    </div>
                    <Button
                        variant={soundsEnabled ? 'default' : 'outline'}
                        size="sm"
                        onClick={toggleSounds}
                        className="gap-2"
                    >
                        {soundsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                        {soundsEnabled ? t('common.enabled') : t('common.disabled')}
                    </Button>
                </div>

                <div className="flex justify-end pt-4 border-t">
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <LoadingSpinner size="sm" className="mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        {t('common.saveChanges')}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function SecuritySection() {
    const { t } = useLanguage();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handlePasswordChange = async () => {
        if (!password) {
            toast.error(t('account.security.enterPassword'));
            return;
        }
        if (password !== confirmPassword) {
            toast.error(t('account.security.passwordsMismatch'));
            return;
        }
        if (password.length < 6) {
            toast.error(t('account.security.passwordTooShort'));
            return;
        }

        setIsSaving(true);
        try {
            const { api } = await import('../lib/api');
            const result = await api.changePassword(password);
            if (result.success) {
                toast.success(t('account.security.passwordChanged'));
                setPassword('');
                setConfirmPassword('');
            } else {
                toast.error(result.error?.message || 'Failed to change password');
            }
        } catch (error) {
            toast.error(t('common.errorOccurred'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('account.security.title')}</CardTitle>
                <CardDescription>{t('account.security.desc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="new-password">{t('account.security.newPassword')}</Label>
                    <Input
                        id="new-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="confirm-password">{t('account.security.confirmPassword')}</Label>
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
                        {t('account.security.updatePassword')}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function DatabaseSection() {
    const { t } = useLanguage();
    const [showWizard, setShowWizard] = useState(false);
    const [migrationInfo, setMigrationInfo] = useState<MigrationStatus | null>(null);
    const config = getSupabaseConfig();
    const source = getConfigSource();

    useEffect(() => {
        if (config) {
            checkMigrationStatus(supabase).then(setMigrationInfo);
        }
    }, []);

    const handleClearConfig = () => {
        if (confirm(t('account.database.clearConfirm'))) {
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
                        {t('account.database.title')}
                    </CardTitle>
                    <CardDescription>{t('account.database.desc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {config ? (
                        <>
                            {/* Status Card */}
                            <div className="flex items-start gap-4 p-4 border rounded-xl bg-emerald-500/5 border-emerald-500/20">
                                <CheckCircle className="w-6 h-6 text-emerald-500 mt-0.5" />
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <p className="font-semibold text-emerald-700 dark:text-emerald-400">{t('account.database.connected')}</p>
                                        {migrationInfo?.latestMigrationTimestamp && (
                                            <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-500/20" title="Database Schema Version">
                                                Schema {migrationInfo.latestMigrationTimestamp}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm font-mono break-all opacity-80">{config.url}</p>
                                </div>
                            </div>

                            {source === 'env' && (
                                <Alert className="bg-amber-500/5 border-amber-500/20">
                                    <Settings className="h-4 w-4 text-amber-500" />
                                    <AlertDescription className="text-amber-700 dark:text-amber-400 text-xs">
                                        {t('account.database.envAlert')}
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Button variant="outline" onClick={() => setShowWizard(true)} className="w-full">
                                    <Settings className="w-4 h-4 mr-2" />
                                    {t('account.database.changeConnection')}
                                </Button>
                                {source === 'ui' && (
                                    <Button variant="outline" onClick={handleClearConfig} className="w-full text-destructive hover:bg-destructive/10">
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        {t('account.database.clearConfig')}
                                    </Button>
                                )}
                            </div>

                            <div className="space-y-2 pt-4 border-t">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('account.database.anonKey')}</Label>
                                <div className="p-2 bg-secondary/50 rounded-lg font-mono text-xs break-all">
                                    {config.anonKey.substring(0, 20)}...{config.anonKey.substring(config.anonKey.length - 10)}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                            <XCircle className="w-12 h-12 text-destructive opacity-20" />
                            <div>
                                <p className="font-medium">{t('account.database.noConnection')}</p>
                                <p className="text-sm text-muted-foreground">{t('account.database.configureHelp')}</p>
                            </div>
                            <Button onClick={() => setShowWizard(true)}>
                                <Database className="w-4 h-4 mr-2" />
                                {t('account.database.setup')}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <SetupWizard open={showWizard} onComplete={() => setShowWizard(false)} canClose={true} />
        </>
    );
}
