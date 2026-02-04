import { useReducer, useCallback, useRef, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { usePageAgent } from '../../hooks/usePageAgent';

import { checkMigrationStatus, APP_VERSION } from '../../lib/migration-check';
import {
    saveSupabaseConfig,
    validateSupabaseConnection,
} from '../../lib/supabase-config';

import { SetupWizardProps, SSEEvent, ProvisioningResult } from './types';
import { wizardReducer, initialState } from './reducer';
import {
    normalizeSupabaseUrl,
    validateAccessToken,
    extractProjectId,
} from './validators';
import {
    fetchOrganizations,
    autoProvisionProject,
    runMigration,
    SetupApiError,
} from './api';
import { TerminalLogs } from './TerminalLogs';

// Import step components (we'll create these next)
import { WelcomeStep } from './steps/WelcomeStep';
import { TypeStep } from './steps/TypeStep';
import { ManagedTokenStep } from './steps/ManagedTokenStep';
import { ManagedOrgStep } from './steps/ManagedOrgStep';
import { ProvisioningStep } from './steps/ProvisioningStep';
import { CredentialsStep } from './steps/CredentialsStep';
import { MigrationStep } from './steps/MigrationStep';
import { StatusBadge } from './components/StatusBadge';
import { Logo } from '../Logo';

export function SetupWizard({ onComplete, open = true, canClose = false }: SetupWizardProps) {
    const [state, dispatch] = useReducer(wizardReducer, initialState);
    const { t } = useLanguage();

    usePageAgent({
        page_id: 'setup_wizard',
        system_instruction: t('setup.agent.systemInstruction'),
        data: {
            step: state.step,
            managedFlow: ['managed-token', 'managed-org', 'provisioning', 'validating'].includes(state.step),
            projectId: state.projectId || null,
            hasAccessToken: Boolean(state.managed.accessToken)
        }
    });

    // Secure refs for sensitive data (not exposed in DevTools)
    const accessTokenRef = useRef<string>('');
    const dbPassRef = useRef<string>('');

    // Cleanup sensitive data on unmount
    useEffect(() => {
        return () => {
            accessTokenRef.current = '';
            dbPassRef.current = '';
        };
    }, []);

    const addLog = useCallback((type: 'info' | 'error' | 'success' | 'stdout' | 'stderr', message: string) => {
        dispatch({ type: 'ADD_LOG', payload: { type, message } });
    }, []);

    const handleFetchOrgs = useCallback(async () => {
        dispatch({ type: 'SET_ERROR', payload: null });
        dispatch({ type: 'SET_FETCHING_ORGS', payload: true });

        const token = state.managed.accessToken.trim();
        const validation = validateAccessToken(token);

        if (!validation.valid) {
            dispatch({ type: 'SET_ERROR', payload: validation.message || 'Invalid token' });
            dispatch({ type: 'SET_FETCHING_ORGS', payload: false });
            return;
        }

        try {
            // Store token securely
            accessTokenRef.current = token;

            const organizations = await fetchOrganizations(token);
            dispatch({ type: 'SET_ORGANIZATIONS', payload: organizations });
            dispatch({ type: 'SET_STEP', payload: 'managed-org' });
        } catch (err) {
            const error = err instanceof SetupApiError ? err : new Error(String(err));
            dispatch({ type: 'SET_ERROR', payload: error.message });
        } finally {
            dispatch({ type: 'SET_FETCHING_ORGS', payload: false });
        }
    }, [state.managed.accessToken]);

    const handleAutoProvision = useCallback(async () => {
        dispatch({ type: 'SET_ERROR', payload: null });
        dispatch({ type: 'SET_STEP', payload: 'provisioning' });
        dispatch({ type: 'CLEAR_LOGS' });
        addLog('info', 'Connecting to Supabase provisioning engine...');

        const token = accessTokenRef.current || state.managed.accessToken.trim();
        let provisionResult: ProvisioningResult | null = null;

        try {
            await autoProvisionProject(
                {
                    accessToken: token,
                    orgId: state.managed.selectedOrg,
                    projectName: state.managed.projectName,
                    region: state.managed.region,
                },
                (event: SSEEvent) => {
                    switch (event.type) {
                        case 'info':
                            addLog('info', event.data);
                            break;

                        case 'project_id':
                            dispatch({ type: 'SET_PROJECT_ID', payload: event.data });
                            break;

                        case 'success':
                            provisionResult = event.data as ProvisioningResult;
                            addLog('success', '✨ Project ready! Initializing database...');

                            // Save config immediately
                            saveSupabaseConfig({
                                url: normalizeSupabaseUrl(provisionResult.url),
                                anonKey: provisionResult.anonKey.trim(),
                            });

                            // Store password securely
                            dbPassRef.current = provisionResult.dbPass;

                            // Set migration status for fresh project
                            dispatch({
                                type: 'SET_MIGRATION_STATUS',
                                payload: {
                                    needsMigration: true,
                                    dbVersion: null,
                                    appVersion: APP_VERSION,
                                    isUnknown: true,
                                },
                            });
                            break;

                        case 'error':
                            dispatch({ type: 'SET_ERROR', payload: event.data });
                            addLog('error', event.data);
                            break;
                    }
                }
            );

            // After streaming completes, run migration if we have result
            if (provisionResult) {
                const result = provisionResult as ProvisioningResult;
                await handleRunMigration(
                    result.projectId,
                    token,
                    result.url,
                    result.anonKey
                );
            }
        } catch (err) {
            const error = err instanceof SetupApiError ? err : new Error(String(err));
            dispatch({ type: 'SET_ERROR', payload: error.message });
            addLog('error', `Provisioning failed: ${error.message}`);
        }
    }, [state.managed.selectedOrg, state.managed.projectName, state.managed.region, state.managed.accessToken, addLog]);

    const handleRunMigration = useCallback(
        async (
            overrideProjectId?: string,
            overrideToken?: string,
            overrideUrl?: string,
            overrideAnonKey?: string
        ) => {
            const targetProjectId =
                overrideProjectId ||
                state.projectId ||
                extractProjectId(state.manual.url);
            const targetToken = overrideToken || accessTokenRef.current || state.managed.accessToken.trim();
            const targetUrl = overrideUrl || state.manual.url;
            const targetKey = overrideAnonKey || state.manual.anonKey;

            if (!targetProjectId || !targetToken) {
                dispatch({
                    type: 'SET_ERROR',
                    payload: 'Project ID and Access Token are required for migration.',
                });
                return;
            }

            dispatch({ type: 'SET_STEP', payload: 'migration' });
            dispatch({ type: 'SET_ERROR', payload: null });
            dispatch({ type: 'SET_MIGRATING', payload: true });
            dispatch({ type: 'CLEAR_LOGS' });
            addLog('info', '📦 Preparing database schema initialization...');

            try {
                let migrationSuccess = false;

                await runMigration(
                    {
                        projectRef: targetProjectId,
                        dbPassword: dbPassRef.current,
                        accessToken: targetToken,
                        anonKey: targetKey, // Pass anon key for knowledge ingestion
                    },
                    (event: SSEEvent) => {
                        switch (event.type) {
                            case 'stdout':
                                addLog('stdout', event.data);
                                break;

                            case 'stderr':
                                addLog('stderr', `⚠️ ${event.data}`);
                                break;

                            case 'info':
                                addLog('info', event.data);
                                break;

                            case 'error':
                                addLog('error', event.data);
                                break;

                            case 'done':
                                if (event.data === 'success') {
                                    migrationSuccess = true;
                                    addLog('success', '✅ Database setup complete!');

                                    if (targetUrl && targetKey) {
                                        saveSupabaseConfig({
                                            url: normalizeSupabaseUrl(targetUrl),
                                            anonKey: targetKey.trim(),
                                        });
                                    }

                                    // Clear sensitive data before redirect
                                    accessTokenRef.current = '';
                                    dbPassRef.current = '';

                                    // Show success message before reload
                                    setTimeout(() => {
                                        onComplete();
                                        window.location.reload();
                                    }, 2000);
                                } else {
                                    dispatch({
                                        type: 'SET_ERROR',
                                        payload: 'Migration failed. Check terminal logs for details.',
                                    });
                                }
                                break;
                        }
                    }
                );

                if (!migrationSuccess) {
                    throw new Error('Migration did not complete successfully');
                }
            } catch (err) {
                const error = err instanceof SetupApiError ? err : new Error(String(err));
                dispatch({ type: 'SET_ERROR', payload: error.message });
                addLog('error', `Migration failed: ${error.message}`);
            } finally {
                dispatch({ type: 'SET_MIGRATING', payload: false });
            }
        },
        [state.projectId, state.manual.url, state.manual.anonKey, state.managed.accessToken, addLog, onComplete]
    );

    const handleSaveManual = useCallback(async () => {
        dispatch({ type: 'SET_ERROR', payload: null });
        dispatch({ type: 'SET_STEP', payload: 'validating' });

        const normalizedUrl = normalizeSupabaseUrl(state.manual.url);
        const trimmedKey = state.manual.anonKey.trim();

        const result = await validateSupabaseConnection(normalizedUrl, trimmedKey);

        if (result.valid) {
            dispatch({ type: 'SET_MANUAL_URL', payload: normalizedUrl });

            const extractedId = extractProjectId(normalizedUrl);
            if (extractedId) {
                dispatch({ type: 'SET_PROJECT_ID', payload: extractedId });
            }

            saveSupabaseConfig({ url: normalizedUrl, anonKey: trimmedKey });

            // Check if database needs migration
            try {
                const tempClient = createClient(normalizedUrl, trimmedKey);
                const status = await checkMigrationStatus(tempClient);

                dispatch({ type: 'SET_MIGRATION_STATUS', payload: status });

                if (status.needsMigration) {
                    dispatch({ type: 'SET_STEP', payload: 'migration' });
                } else {
                    addLog('success', '✨ Database is already up-to-date! Redirecting...');
                    setTimeout(() => {
                        onComplete();
                        window.location.reload();
                    }, 2000);
                }
            } catch (err) {
                console.warn('[SetupWizard] Migration check failed:', err);
                dispatch({
                    type: 'SET_MIGRATION_STATUS',
                    payload: { needsMigration: true, dbVersion: null, appVersion: APP_VERSION, isUnknown: true },
                });
                dispatch({ type: 'SET_STEP', payload: 'migration' });
            }
        } else {
            dispatch({ type: 'SET_ERROR', payload: result.error || 'Connection failed' });
            dispatch({ type: 'SET_STEP', payload: 'credentials' });
        }
    }, [state.manual.url, state.manual.anonKey, addLog, onComplete]);

    if (!open) return null;

    const stepVariants = {
        initial: { opacity: 0, x: 20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 },
    };

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-0 md:p-8">
            <div className="w-full h-full max-w-6xl mx-auto overflow-hidden bg-background/80 backdrop-blur-xl border border-border/50 shadow-2xl rounded-3xl flex">
                {/* Left Sidebar */}
                <div className="w-[280px] bg-muted/30 border-r border-border/10 p-8 flex flex-col justify-between relative overflow-hidden hidden md:flex shrink-0">
                    <div className="space-y-8 relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-primary rounded-lg flex-shrink-0">
                                <Logo className="w-5 h-5 text-primary-foreground" />
                            </div>
                            <span className="font-black italic tracking-tighter uppercase text-xs truncate">
                                Automator Forge
                            </span>
                        </div>

                        <div className="space-y-6">
                            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-muted-foreground/30 ml-1">
                                Assembly Phase
                            </p>
                            <div className="space-y-4 px-1">
                                <StatusBadge step="welcome" currentStep={state.step} label={t('setup.initiation')} />
                                <StatusBadge
                                    step={['type', 'managed-token', 'credentials']}
                                    currentStep={state.step}
                                    label={t('setup.coordinates')}
                                />
                                <StatusBadge
                                    step={['managed-org', 'provisioning', 'validating']}
                                    currentStep={state.step}
                                    label={t('setup.foundation')}
                                />
                                <StatusBadge step="migration" currentStep={state.step} label={t('setup.ignition')} />
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 space-y-4">
                        <p className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-[0.4em] px-2 text-center">
                            v{APP_VERSION} // Stable Build
                        </p>
                    </div>
                </div>

                {/* Right Side - Interactive Surface */}
                <div className="flex-1 p-8 md:p-12 flex flex-col relative">
                    {canClose && (
                        <button
                            onClick={onComplete}
                            className="absolute top-6 right-6 p-2 rounded-full hover:bg-secondary transition-colors z-[60]"
                            aria-label="Close setup wizard"
                        >
                            <X className="w-5 h-5 text-muted-foreground opacity-40 hover:opacity-100 transition-opacity" />
                        </button>
                    )}

                    <div className="absolute top-6 right-6 flex items-center gap-4 z-50">
                        <LanguageSwitcher />
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={state.step}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            variants={stepVariants}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="flex-1 flex flex-col"
                        >
                            {state.step === 'welcome' && (
                                <WelcomeStep onNext={() => dispatch({ type: 'SET_STEP', payload: 'type' })} />
                            )}

                            {state.step === 'type' && (
                                <TypeStep
                                    onManaged={() => {
                                        dispatch({ type: 'RESET_MANUAL_FLOW' });
                                        dispatch({ type: 'SET_STEP', payload: 'managed-token' });
                                    }}
                                    onManual={() => {
                                        dispatch({ type: 'RESET_MANAGED_FLOW' });
                                        dispatch({ type: 'SET_STEP', payload: 'credentials' });
                                    }}
                                    onBack={() => dispatch({ type: 'SET_STEP', payload: 'welcome' })}
                                />
                            )}

                            {state.step === 'managed-token' && (
                                <ManagedTokenStep
                                    accessToken={state.managed.accessToken}
                                    error={state.error}
                                    isFetching={state.managed.isFetchingOrgs}
                                    onTokenChange={(value) => dispatch({ type: 'SET_ACCESS_TOKEN', payload: value })}
                                    onFetchOrgs={handleFetchOrgs}
                                    onBack={() => dispatch({ type: 'SET_STEP', payload: 'type' })}
                                />
                            )}

                            {state.step === 'managed-org' && (
                                <ManagedOrgStep
                                    organizations={state.managed.organizations}
                                    selectedOrg={state.managed.selectedOrg}
                                    projectName={state.managed.projectName}
                                    region={state.managed.region}
                                    onOrgSelect={(orgId) => dispatch({ type: 'SET_SELECTED_ORG', payload: orgId })}
                                    onProjectNameChange={(name) => dispatch({ type: 'SET_PROJECT_NAME', payload: name })}
                                    onRegionChange={(region) => dispatch({ type: 'SET_REGION', payload: region })}
                                    onProvision={handleAutoProvision}
                                    onBack={() => dispatch({ type: 'SET_STEP', payload: 'managed-token' })}
                                />
                            )}

                            {state.step === 'provisioning' && (
                                <ProvisioningStep
                                    logs={state.logs}
                                    error={state.error}
                                    onRetry={() => dispatch({ type: 'SET_STEP', payload: 'managed-token' })}
                                />
                            )}

                            {state.step === 'credentials' && (
                                <CredentialsStep
                                    url={state.manual.url}
                                    anonKey={state.manual.anonKey}
                                    error={state.error}
                                    onUrlChange={(value) => dispatch({ type: 'SET_MANUAL_URL', payload: value })}
                                    onAnonKeyChange={(value) => dispatch({ type: 'SET_MANUAL_ANON_KEY', payload: value })}
                                    onSave={handleSaveManual}
                                    onBack={() => dispatch({ type: 'SET_STEP', payload: 'type' })}
                                />
                            )}

                            {state.step === 'migration' && (
                                <MigrationStep
                                    logs={state.logs}
                                    error={state.error}
                                    isMigrating={state.isMigrating}
                                    migrationStatus={state.migrationStatus}
                                    accessToken={state.managed.accessToken}
                                    onTokenChange={(value) => dispatch({ type: 'SET_ACCESS_TOKEN', payload: value })}
                                    onRunMigration={() => handleRunMigration()}
                                    onBypass={() => {
                                        onComplete();
                                        window.location.reload();
                                    }}
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

export { TerminalLogs } from './TerminalLogs';
export * from './types';
