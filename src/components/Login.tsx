import { useState, useEffect } from 'react';
import { Mail, Loader2, LogIn, UserPlus, KeyRound, ArrowLeft, Eye, EyeOff, Shield, Settings, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { OtpInput } from './ui/otp-input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { ModeToggle } from './mode-toggle';
import { toast } from './Toast';
import { Logo } from './Logo';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSwitcher } from './LanguageSwitcher';

interface LoginProps {
    onSuccess?: () => void;
    onConfigure?: () => void;
    isInitialized?: boolean;
}

export function Login({ onSuccess, onConfigure, isInitialized: propInitialized }: LoginProps) {
    const { t } = useLanguage();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');

    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingInit, setIsCheckingInit] = useState(propInitialized === undefined);
    const [isInitialized, setIsInitialized] = useState(propInitialized ?? false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Login Mode
    const [loginMode, setLoginMode] = useState<'password' | 'otp'>('password');
    const [otpStep, setOtpStep] = useState<'email' | 'verify'>('email');
    const [otp, setOtp] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);


    // Check initialization status on mount if not provided as prop
    useEffect(() => {
        if (propInitialized === undefined) {
            checkInitialization();
        } else {
            setIsSignUp(!propInitialized);
        }
    }, [propInitialized]);

    const checkInitialization = async () => {
        try {
            const { data, error } = await supabase.from('init_state').select('is_initialized');
            if (error) {
                if ((error as any).code === '42P01') {
                    console.info('[Login] init_state relation missing - fresh database detected.');
                    setIsInitialized(false);
                    setIsSignUp(true);
                    return;
                }
                console.warn('[Login] Init check error:', error);
                setIsInitialized(false);
                setIsSignUp(true);
                setError(error.message);
                return;
            }
            const initialized = data && data.length > 0 && data[0].is_initialized > 0;
            setIsInitialized(initialized);
            setIsSignUp(!initialized);
        } catch (err: any) {
            console.warn('[Login] Init check exception:', err);
            setIsInitialized(false);
            setIsSignUp(true);
            setError(err.message || 'Connection failed');
        } finally {
            setIsCheckingInit(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            if (!isInitialized) {
                // Admin Signup Flow
                const { data, error } = await supabase.functions.invoke('setup', {
                    body: {
                        email,
                        password,
                        first_name: firstName,
                        last_name: lastName
                    }
                });

                if (error || !data) {
                    if (error?.message?.includes('First user already exists')) {
                        toast.info('System already initialized. Please log in.');
                        setIsInitialized(true);
                        return;
                    }
                    throw new Error(error?.message || 'Failed to create admin account');
                }

                toast.success('Admin account created! Signing you in...');

                // Auto login after creation
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (signInError) throw signInError;

                // Force re-check of initialization status
                setIsInitialized(true);
                onSuccess?.();
            } else if (loginMode === 'password') {
                // Regular Login Flow
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                toast.success('Logged in successfully');
                onSuccess?.();
            } else {
                // OTP Flow - Step 1: Send Code
                if (otpStep === 'email') {
                    const { error } = await supabase.auth.signInWithOtp({
                        email,
                        options: { shouldCreateUser: false } // Only allow existing users to login this way
                    });
                    if (error) throw error;
                    setOtpStep('verify');
                    toast.success('Validation code sent to your email');
                }
            }
        } catch (err: any) {
            // Show full error message to user (e.g. "Invalid login credentials")
            setError(err?.message || 'Authentication failed');
            console.error('[Login] Error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        setIsLoading(true);
        setError('');
        try {
            const { data, error } = await supabase.auth.verifyOtp({
                email,
                token: otp,
                type: 'magiclink'
            });
            if (error) throw error;
            if (!data.session) throw new Error('Failed to create session');

            toast.success('Logged in successfully');
            onSuccess?.();
        } catch (err: any) {
            setError(err?.message || 'Invalid code');
        } finally {
            setIsLoading(false);
        }
    };

    if (isCheckingInit) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Initializing Engine...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-8 relative overflow-hidden">

            <div className="absolute top-6 right-6 flex items-center gap-4 z-50">
                {onConfigure && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onConfigure}
                        className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-all"
                    >
                        <Settings className="w-3.5 h-3.5 mr-2" />
                        Configure
                    </Button>
                )}
                <ModeToggle />
                <LanguageSwitcher />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="glass p-10 space-y-8 relative overflow-hidden">

                    <div className="text-center space-y-3">
                        <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-6">
                            <Logo className="w-10 h-10 text-primary-foreground" />
                        </div>
                        <h2 className="text-3xl font-black italic tracking-tighter uppercase text-foreground">
                            {isSignUp ? t('login.initialize') : t('login.secureLogin')}
                        </h2>
                        <p className="text-[10px] text-muted-foreground font-bold tracking-[0.2em] uppercase">
                            {isSignUp
                                ? 'Create your primary administrator account'
                                : (loginMode === 'otp' ? 'Magic link authentication' : 'Personal Access Key Required')}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <AnimatePresence mode="wait">
                            {isSignUp && (
                                <motion.div
                                    key="signup-fields"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="grid grid-cols-2 gap-4"
                                >
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">First Name</label>
                                        <Input
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            required={isSignUp}
                                            placeholder={t('login.firstNamePlaceholder')}
                                            className="bg-background"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Last Name</label>
                                        <Input
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            required={isSignUp}
                                            placeholder={t('login.lastNamePlaceholder')}
                                            className="bg-background"
                                        />
                                    </div>
                                </motion.div>
                            )}

                            {loginMode === 'password' || otpStep === 'email' ? (
                                <motion.div
                                    key="email-field"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="space-y-1"
                                >
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Email Coordinates</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/30" size={16} />
                                        <Input
                                            type="email"
                                            placeholder={t('login.emailPlaceholder')}
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="pl-10 bg-background"
                                            autoComplete="email"
                                            disabled={otpStep === 'verify'}
                                        />
                                    </div>
                                </motion.div>
                            ) : null}

                            {loginMode === 'password' && (
                                <motion.div
                                    key="password-field"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="space-y-1"
                                >
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Access Password</label>
                                    <div className="relative">
                                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/30" size={16} />
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            minLength={6}
                                            className="pl-10 pr-10 bg-background"
                                            autoComplete={isSignUp ? 'new-password' : 'current-password'}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/30 hover:text-primary transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {loginMode === 'otp' && otpStep === 'verify' && (
                                <motion.div
                                    key="otp-field"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="space-y-6 py-4"
                                >
                                    <div className="flex justify-center">
                                        <OtpInput
                                            value={otp}
                                            onChange={setOtp}
                                            length={6}
                                            onComplete={() => { }}
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="link"
                                        className="w-full text-[10px] font-bold uppercase tracking-widest text-primary/60"
                                        onClick={() => setOtpStep('email')}
                                    >
                                        Change Coordinates
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={handleVerifyOtp}
                                        disabled={isLoading || otp.length !== 6}
                                        className="w-full h-12 shadow-md"
                                    >
                                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Shield size={18} className="mr-2" />}
                                        Verify Access
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-destructive/10 text-destructive text-[11px] font-bold p-3 rounded-xl border border-destructive/20 flex items-start gap-2"
                            >
                                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                <p>{error}</p>
                            </motion.div>
                        )}

                        {loginMode !== 'otp' || otpStep === 'email' ? (
                            <Button
                                type="submit"
                                disabled={isLoading || !email || (loginMode === 'password' && !password)}
                                className="w-full h-12 shadow-md mt-4"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        {isSignUp ? <UserPlus className="w-5 h-5 mr-2" /> : (loginMode === 'otp' ? <Mail className="w-5 h-5 mr-2" /> : <LogIn className="w-5 h-5 mr-2" />)}
                                        {isSignUp ? t('login.initializeMaster') : (loginMode === 'otp' ? t('login.sendMagicLink') : t('login.openDashboard'))}
                                    </>
                                )}
                            </Button>
                        ) : null}
                    </form>

                    <div className="space-y-4 pt-4 border-t border-border/10">
                        {!isSignUp && (
                            <div className="flex flex-col gap-2">
                                {loginMode === 'password' ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setLoginMode('otp');
                                            setOtpStep('email');
                                            setError('');
                                        }}
                                        className="w-full flex items-center justify-center gap-2 py-3 glass hover:bg-white/5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-all rounded-xl"
                                    >
                                        <KeyRound size={14} /> Magic Link Login
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setLoginMode('password');
                                            setError('');
                                        }}
                                        className="w-full flex items-center justify-center gap-2 py-3 glass hover:bg-white/5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-all rounded-xl"
                                    >
                                        <ArrowLeft size={14} /> Password Access
                                    </button>
                                )}
                            </div>
                        )}

                        <p className="text-center text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                            {isSignUp ? 'Already have an account?' : 'Need a new account?'} {' '}
                            <button
                                onClick={() => {
                                    setIsSignUp(!isSignUp);
                                    setLoginMode('password');
                                    setError('');
                                }}
                                className="text-primary hover:underline ml-1"
                            >
                                {isSignUp ? 'Login Instead' : 'Create Account'}
                            </button>
                        </p>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.4em]">
                        Powered by RealTimeX Intelligence
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
