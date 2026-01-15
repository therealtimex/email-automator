import React, { useState, useEffect } from 'react';
import { Mail, Cloud, Key, Link as LinkIcon, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AccountStatus {
    gmail: boolean;
    m365: boolean;
}

export function AccountSettings() {
    const [status, setStatus] = useState<AccountStatus>({ gmail: false, m365: false });
    const [loading, setLoading] = useState(true);
    const [showGmailDialog, setShowGmailDialog] = useState(false);
    const [showM365Dialog, setShowM365Dialog] = useState(false);

    useEffect(() => {
        checkAccountStatus();
    }, []);

    async function checkAccountStatus() {
        setLoading(true);
        const { data } = await supabase
            .from('email_accounts')
            .select('provider')
            .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

        const providers = data?.map(a => a.provider) || [];
        setStatus({
            gmail: providers.includes('gmail'),
            m365: providers.includes('m365')
        });
        setLoading(false);
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">Email Accounts</h2>
            <p className="text-slate-600">Connect your email providers to start automating</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Gmail Card */}
                <div className="bg-white rounded-2xl border-l-4 border-l-red-500 p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <Mail className="w-6 h-6 text-red-500" />
                            <h3 className="text-lg font-bold">Gmail</h3>
                        </div>
                        {status.gmail ? (
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Connected
                            </span>
                        ) : (
                            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold flex items-center gap-1">
                                <XCircle className="w-3 h-3" />
                                Disconnected
                            </span>
                        )}
                    </div>

                    <button
                        onClick={() => setShowGmailDialog(true)}
                        className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                    >
                        <LinkIcon className="w-4 h-4" />
                        {status.gmail ? 'Reconnect' : 'Connect Gmail'}
                    </button>

                    <details className="mt-4">
                        <summary className="cursor-pointer text-sm text-slate-600 hover:text-slate-900 flex items-center gap-2">
                            <Key className="w-4 h-4" />
                            Configure Credentials
                        </summary>
                        <div className="mt-3 space-y-2">
                            <p className="text-xs text-slate-500">Paste your Google OAuth credentials JSON:</p>
                            <textarea
                                className="w-full p-2 border rounded-lg text-xs font-mono"
                                rows={4}
                                placeholder='{"installed": {"client_id": "...", ...}}'
                            />
                            <button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-1 rounded-lg text-sm">
                                Save Credentials
                            </button>
                        </div>
                    </details>
                </div>

                {/* Microsoft 365 Card */}
                <div className="bg-white rounded-2xl border-l-4 border-l-blue-500 p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <Cloud className="w-6 h-6 text-blue-500" />
                            <h3 className="text-lg font-bold">Microsoft 365</h3>
                        </div>
                        {status.m365 ? (
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Connected
                            </span>
                        ) : (
                            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold flex items-center gap-1">
                                <XCircle className="w-3 h-3" />
                                Disconnected
                            </span>
                        )}
                    </div>

                    <button
                        onClick={() => setShowM365Dialog(true)}
                        className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 py-2 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                    >
                        <LinkIcon className="w-4 h-4" />
                        {status.m365 ? 'Reconnect' : 'Connect M365'}
                    </button>

                    <details className="mt-4">
                        <summary className="cursor-pointer text-sm text-slate-600 hover:text-slate-900 flex items-center gap-2">
                            <Key className="w-4 h-4" />
                            Configure Client
                        </summary>
                        <div className="mt-3 space-y-2">
                            <p className="text-xs text-slate-500">Paste your Azure AD app config JSON:</p>
                            <textarea
                                className="w-full p-2 border rounded-lg text-xs font-mono"
                                rows={4}
                                placeholder='{"client_id": "...", "tenant_id": "..."}'
                            />
                            <button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-1 rounded-lg text-sm">
                                Save Config
                            </button>
                        </div>
                    </details>
                </div>
            </div>

            {/* Gmail Auth Dialog */}
            {showGmailDialog && (
                <GmailAuthDialog onClose={() => {
                    setShowGmailDialog(false);
                    checkAccountStatus();
                }} />
            )}

            {/* M365 Auth Dialog */}
            {showM365Dialog && (
                <M365AuthDialog onClose={() => {
                    setShowM365Dialog(false);
                    checkAccountStatus();
                }} />
            )}
        </div>
    );
}

function GmailAuthDialog({ onClose }: { onClose: () => void }) {
    const [authUrl, setAuthUrl] = useState('');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAuthUrl();
    }, []);

    async function fetchAuthUrl() {
        try {
            const res = await fetch('http://localhost:3002/api/auth/gmail/url');
            const data = await res.json();
            setAuthUrl(data.url);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit() {
        try {
            await fetch('http://localhost:3002/api/auth/gmail/callback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });
            onClose();
        } catch (error) {
            console.error(error);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-3xl p-8 max-w-lg w-full mx-4">
                <h2 className="text-2xl font-bold mb-4">Connect Gmail</h2>
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : (
                    <>
                        <p className="text-slate-600 mb-4">Open this URL to authorize:</p>
                        <a
                            href={authUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-3 bg-blue-50 rounded-xl text-blue-600 text-sm break-all hover:bg-blue-100 transition-colors mb-4"
                        >
                            {authUrl}
                        </a>
                        <input
                            type="text"
                            placeholder="Paste authorization code here"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="w-full px-4 py-3 border rounded-xl mb-4"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 py-2 border rounded-xl hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!code}
                                className="flex-1 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
                            >
                                Submit
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function M365AuthDialog({ onClose }: { onClose: () => void }) {
    const [deviceCode, setDeviceCode] = useState('');
    const [userCode, setUserCode] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        initiateFlow();
    }, []);

    async function initiateFlow() {
        try {
            const res = await fetch('http://localhost:3002/api/auth/m365/device-flow', {
                method: 'POST'
            });
            const data = await res.json();
            setDeviceCode(data.device_code);
            setUserCode(data.user_code);
            setMessage(data.message);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    async function completeFlow() {
        try {
            await fetch('http://localhost:3002/api/auth/m365/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ device_code: deviceCode })
            });
            onClose();
        } catch (error) {
            console.error(error);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-3xl p-8 max-w-lg w-full mx-4">
                <h2 className="text-2xl font-bold mb-4">Connect Microsoft 365</h2>
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : (
                    <>
                        <p className="text-slate-600 mb-4">{message}</p>
                        <div className="bg-blue-50 rounded-xl p-6 text-center mb-6">
                            <p className="text-sm text-slate-600 mb-2">Enter this code:</p>
                            <p className="text-4xl font-mono font-bold text-blue-600">{userCode}</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 py-2 border rounded-xl hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={completeFlow}
                                className="flex-1 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
                            >
                                I've Authenticated
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
