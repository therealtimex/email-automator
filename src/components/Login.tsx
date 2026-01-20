import { useState, useEffect } from 'react';
import { Mail, Loader2, LogIn, UserPlus, KeyRound, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { OtpInput } from './ui/otp-input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { ModeToggle } from './mode-toggle';
import { toast } from './Toast';
import { Logo } from './Logo';

interface LoginProps {
    onSuccess?: () => void;
    onConfigure?: () => void;
}

export function Login({ onSuccess, onConfigure }: LoginProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');

    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingInit, setIsCheckingInit] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState('');

    // Login Mode
    const [loginMode, setLoginMode] = useState<'password' | 'otp'>('password');
    const [otpStep, setOtpStep] = useState<'email' | 'verify'>('email');
    const [otp, setOtp] = useState('');


    // Check initialization status on mount
    useEffect(() => {
        checkInitialization();
    }, []);

    const checkInitialization = async () => {
        try {
            const { data, error } = await supabase.from('init_state').select('is_initialized');
            if (error) {
                // If relation doesn't exist (42P01), it's definitely not initialized
                if ((error as any).code === '42P01') {
                    console.info('[Login] init_state relation missing - fresh database detected.');
                    setIsInitialized(false);
                    return;
                }

                // For other errors (API key issues, etc.), don't assume initialized
                console.warn('[Login] Init check error:', error);
                setIsInitialized(false);
                setError(error.message);
                return;
            }

            // The view returns { is_initialized: 1 } if initialized, or 0/null if not
            const initialized = data && data.length > 0 && data[0].is_initialized > 0;
            setIsInitialized(initialized);
        } catch (err: any) {
            console.warn('[Login] Init check exception:', err);
            setIsInitialized(false);
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
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-8 relative">
            <div className="absolute top-4 right-4">
                <ModeToggle />
            </div>
            <Card className="w-full max-w-md shadow-2xl">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                        <Logo className="w-12 h-12" />
                    </div>
                    <CardTitle className="text-2xl">
                        {!isInitialized ? 'Welcome to Email Automator' : 'Welcome Back'}
                    </CardTitle>
                    <CardDescription>
                        {!isInitialized
                            ? 'Create the first admin account to get started'
                            : (loginMode === 'password'
                                ? 'Sign in to access your email automation'
                                : (otpStep === 'email' ? 'Receive a login code via email' : `Enter code sent to ${email}`)
                            )
                        }
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {!isInitialized && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">First Name</label>
                                    <Input
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        required={!isInitialized}
                                        placeholder="John"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Last Name</label>
                                    <Input
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        required={!isInitialized}
                                        placeholder="Doe"
                                    />
                                </div>
                            </div>
                        )}

                        {loginMode === 'password' || otpStep === 'email' ? (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email</label>
                                <Input
                                    type="email"
                                    placeholder="admin@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                    disabled={otpStep === 'verify'}
                                />
                            </div>
                        ) : null}

                        {loginMode === 'password' && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Password</label>
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    autoComplete={!isInitialized ? 'new-password' : 'current-password'}
                                />
                            </div>
                        )}

                        {loginMode === 'otp' && otpStep === 'verify' && (
                            <div className="space-y-4 py-2">
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
                                    className="w-full text-xs text-muted-foreground"
                                    onClick={() => setOtpStep('email')}
                                >
                                    Change email address
                                </Button>
                            </div>
                        )}

                        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex flex-col gap-2">
                            <p>{error}</p>
                            {error.includes('configuration') || error.includes('Invalid API key') || error.includes('API key') && onConfigure && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full border-destructive/50 hover:bg-destructive/20 text-destructive"
                                    onClick={onConfigure}
                                >
                                    Update Connection Settings
                                </Button>
                            )}
                        </div>
                    </CardContent>

                    <CardFooter className="flex flex-col gap-3">
                        {loginMode === 'otp' && otpStep === 'verify' ? (
                            <Button
                                type="button"
                                onClick={handleVerifyOtp}
                                disabled={isLoading || otp.length !== 6}
                                className="w-full"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Verifying...
                                    </>
                                ) : (
                                    'Verify Code'
                                )}
                            </Button>
                        ) : (
                            <Button
                                type="submit"
                                disabled={isLoading || !email || (loginMode === 'password' && !password)}
                                className="w-full"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        {!isInitialized ? 'Creating Account...' : (loginMode === 'otp' ? 'Send Code' : 'Signing in...')}
                                    </>
                                ) : (
                                    <>
                                        {!isInitialized ? (
                                            <UserPlus className="w-4 h-4 mr-2" />
                                        ) : (
                                            loginMode === 'otp' ? <Mail className="w-4 h-4 mr-2" /> : <LogIn className="w-4 h-4 mr-2" />
                                        )}
                                        {!isInitialized ? 'Create Admin Account' : (loginMode === 'otp' ? 'Send Login Code' : 'Sign In')}
                                    </>
                                )}
                            </Button>
                        )}

                        {isInitialized && (
                            <div className="flex flex-col gap-2 w-full">
                                {loginMode === 'password' ? (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="w-full text-sm font-normal text-muted-foreground hover:text-primary"
                                        onClick={() => {
                                            setLoginMode('otp');
                                            setOtpStep('email');
                                            setError('');
                                        }}
                                    >
                                        <KeyRound className="w-4 h-4 mr-2" />
                                        Sign in with Code
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="w-full text-sm font-normal text-muted-foreground hover:text-primary"
                                        onClick={() => {
                                            setLoginMode('password');
                                            setError('');
                                        }}
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Sign in with Password
                                    </Button>
                                )}
                            </div>
                        )}

                        {isInitialized && (
                            <p className="text-xs text-center text-muted-foreground mt-2">
                                New users must be invited by an admin.
                            </p>
                        )}
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
