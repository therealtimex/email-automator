import { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { api, initializeApi } from '../lib/api';
import { Email, EmailAccount, Rule, UserSettings, Stats, Profile } from '../lib/types';
import { getSupabaseConfig } from '../lib/supabase-config';
import { useRealtimeEmails } from '../hooks/useRealtimeEmails';
import { sounds } from '../lib/sounds';
import { toast } from '../components/Toast';

// Helper to extract error message from API response error
function getErrorMessage(error: { message?: string; code?: string } | string | undefined, fallback: string): string {
    if (!error) return fallback;
    if (typeof error === 'string') return error;
    return error.message || fallback;
}

// State
interface AppState {
    // Auth
    user: any | null;
    isAuthenticated: boolean;

    // Data
    profile: Profile | null;
    emails: Email[];
    accounts: EmailAccount[];
    rules: Rule[];
    settings: UserSettings | null;
    stats: Stats | null;

    // UI
    isLoading: boolean;
    isInitialized: boolean;
    error: string | null;
    selectedEmailId: string | null;

    // Pagination & Sorting
    emailsTotal: number;
    emailsOffset: number;
    sortBy: 'date' | 'created_at';
    sortOrder: 'asc' | 'desc';
    activeCategory: string | null;
    activeSearch: string;
}

const initialState: AppState = {
    user: null,
    isAuthenticated: false,
    profile: null,
    emails: [],
    accounts: [],
    rules: [],
    settings: null,
    stats: null,
    isLoading: true,
    isInitialized: false,
    error: null,
    selectedEmailId: null,
    emailsTotal: 0,
    emailsOffset: 0,
    sortBy: 'created_at',
    sortOrder: 'desc',
    activeCategory: null,
    activeSearch: '',
};

// Actions
type Action =
    | { type: 'SET_USER'; payload: any }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_INITIALIZED'; payload: boolean }
    | { type: 'SET_ERROR'; payload: string | null }
    | { type: 'SET_EMAILS'; payload: { emails: Email[]; total: number; offset: number; category?: string | null; search?: string; sortBy?: 'date' | 'created_at'; sortOrder?: 'asc' | 'desc' } }
    | { type: 'ADD_EMAIL'; payload: Email }
    | { type: 'UPDATE_EMAIL'; payload: Email }
    | { type: 'REMOVE_EMAIL'; payload: string }
    | { type: 'SET_PROFILE'; payload: Profile }
    | { type: 'UPDATE_PROFILE'; payload: Profile }
    | { type: 'SET_ACCOUNTS'; payload: EmailAccount[] }
    | { type: 'ADD_ACCOUNT'; payload: EmailAccount }
    | { type: 'REMOVE_ACCOUNT'; payload: string }
    | { type: 'SET_RULES'; payload: Rule[] }
    | { type: 'ADD_RULE'; payload: Rule }
    | { type: 'UPDATE_RULE'; payload: Rule }
    | { type: 'REMOVE_RULE'; payload: string }
    | { type: 'SET_SETTINGS'; payload: UserSettings }
    | { type: 'SET_STATS'; payload: Stats }
    | { type: 'SET_SELECTED_EMAIL'; payload: string | null }
    | { type: 'CLEAR_DATA' };

function reducer(state: AppState, action: Action): AppState {
    switch (action.type) {
        case 'SET_USER':
            return {
                ...state,
                user: action.payload,
                isAuthenticated: !!action.payload,
                isLoading: false,
            };
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
        case 'SET_INITIALIZED':
            return { ...state, isInitialized: action.payload };
        case 'SET_ERROR':
            return { ...state, error: action.payload, isLoading: false };
        case 'SET_EMAILS':
            return {
                ...state,
                emails: action.payload.emails,
                emailsTotal: action.payload.total,
                emailsOffset: action.payload.offset,
                activeCategory: action.payload.category !== undefined ? action.payload.category : state.activeCategory,
                activeSearch: action.payload.search !== undefined ? action.payload.search : state.activeSearch,
                sortBy: action.payload.sortBy || state.sortBy,
                sortOrder: action.payload.sortOrder || state.sortOrder,
            };
        case 'ADD_EMAIL': {
            const email = action.payload;
            
            // Check if email matches current filters
            const matchesCategory = !state.activeCategory || email.category === state.activeCategory;
            const matchesSearch = !state.activeSearch || 
                email.subject?.toLowerCase().includes(state.activeSearch.toLowerCase()) || 
                email.sender?.toLowerCase().includes(state.activeSearch.toLowerCase());

            if (!matchesCategory || !matchesSearch) {
                return {
                    ...state,
                    emailsTotal: state.emailsTotal + 1,
                };
            }

            return {
                ...state,
                emails: [email, ...state.emails],
                emailsTotal: state.emailsTotal + 1,
            };
        }
        case 'UPDATE_EMAIL': {
            const email = action.payload;
            const existingIndex = state.emails.findIndex(e => e.id === email.id);

            if (existingIndex !== -1) {
                // Email exists in array - update it
                return {
                    ...state,
                    emails: state.emails.map(e =>
                        e.id === email.id ? email : e
                    ),
                };
            }

            // Email NOT in array - check if it should be added (upsert behavior)
            // This handles the case where INSERT added email with null category,
            // but UPDATE now has the real category after AI processing
            const matchesCategory = !state.activeCategory || email.category === state.activeCategory;
            const matchesSearch = !state.activeSearch ||
                email.subject?.toLowerCase().includes(state.activeSearch.toLowerCase()) ||
                email.sender?.toLowerCase().includes(state.activeSearch.toLowerCase());

            if (matchesCategory && matchesSearch) {
                // Add to array (sorted by created_at desc - prepend)
                return {
                    ...state,
                    emails: [email, ...state.emails],
                };
            }

            // Doesn't match current filters - no change needed
            return state;
        }
        case 'REMOVE_EMAIL':
            return {
                ...state,
                emails: state.emails.filter(e => e.id !== action.payload),
                emailsTotal: Math.max(0, state.emailsTotal - 1),
            };
        case 'SET_PROFILE':
            return { ...state, profile: action.payload };
        case 'UPDATE_PROFILE':
            return { ...state, profile: action.payload };
        case 'SET_ACCOUNTS':
            return { ...state, accounts: action.payload };
        case 'ADD_ACCOUNT':
            return { ...state, accounts: [action.payload, ...state.accounts] };
        case 'REMOVE_ACCOUNT':
            return {
                ...state,
                accounts: state.accounts.filter(a => a.id !== action.payload),
            };
        case 'SET_RULES':
            return { ...state, rules: action.payload };
        case 'ADD_RULE':
            return { ...state, rules: [action.payload, ...state.rules] };
        case 'UPDATE_RULE':
            return {
                ...state,
                rules: state.rules.map(r =>
                    r.id === action.payload.id ? action.payload : r
                ),
            };
        case 'REMOVE_RULE':
            return {
                ...state,
                rules: state.rules.filter(r => r.id !== action.payload),
            };
        case 'SET_SETTINGS':
            return { ...state, settings: action.payload };
        case 'SET_STATS':
            return { ...state, stats: action.payload };
        case 'SET_SELECTED_EMAIL':
            return { ...state, selectedEmailId: action.payload };
        case 'CLEAR_DATA':
            return { ...initialState, isLoading: false, isInitialized: true };
        default:
            return state;
    }
}

// Context
interface AppContextType {
    state: AppState;
    isSubscribed: boolean;
    dispatch: React.Dispatch<Action>;
    actions: {
        fetchEmails: (params?: { category?: string; search?: string; offset?: number; sortBy?: 'date' | 'created_at'; sortOrder?: 'asc' | 'desc' }) => Promise<void>;
        fetchAccounts: () => Promise<void>;
        fetchRules: () => Promise<void>;
        fetchSettings: () => Promise<void>;
        fetchProfile: () => Promise<void>;
        fetchStats: () => Promise<void>;
        executeAction: (emailId: string, action: string, draftContent?: string) => Promise<boolean>;
        triggerSync: (accountId?: string) => Promise<boolean>;
        disconnectAccount: (accountId: string) => Promise<boolean>;
        updateSettings: (settings: Partial<UserSettings>) => Promise<boolean>;
        updateProfile: (updates: { first_name?: string; last_name?: string; avatar_url?: string }) => Promise<boolean>;
        updateAccount: (accountId: string, updates: Partial<EmailAccount>) => Promise<boolean>;
        retryProcessing: (emailId: string) => Promise<boolean>;
        createRule: (rule: Omit<Rule, 'id' | 'user_id' | 'created_at'>) => Promise<boolean>;
        updateRule: (ruleId: string, updates: Partial<Rule>) => Promise<boolean>;
        deleteRule: (ruleId: string) => Promise<boolean>;
        toggleRule: (ruleId: string) => Promise<boolean>;
    };
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(reducer, initialState);

    // Helper to fetch email with retry (handles replication lag)
    const fetchEmailWithRetry = useCallback(async (emailId: string, retries = 3, delay = 500): Promise<Email | null> => {
        for (let attempt = 1; attempt <= retries; attempt++) {
            const response = await api.getEmail(emailId);
            if (response.data?.email) {
                return response.data.email;
            }
            if (attempt < retries) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        return null;
    }, []);

    // Realtime subscription logic
    const handleRealtimeInsert = useCallback(async (payload: Email) => {
        // Hydrate: Fetch full email with joined account data (with retry for replication lag)
        const email = await fetchEmailWithRetry(payload.id);
        if (email) {
            dispatch({ type: 'ADD_EMAIL', payload: email });

            // Play feedback only for completed emails (not pending ones)
            if (email.processing_status === 'completed') {
                if (email.ai_analysis?.priority === 'High') {
                    sounds.playAlert();
                    toast.success('High Priority Email Processed!');
                } else {
                    sounds.playNotify();
                    toast.info('New email processed');
                }
            }
        }
    }, [dispatch, fetchEmailWithRetry]);

    const handleRealtimeUpdate = useCallback(async (payload: Email) => {
        // Hydrate: Fetch full email with joined account data
        const email = await fetchEmailWithRetry(payload.id);
        if (email) {
            dispatch({ type: 'UPDATE_EMAIL', payload: email });

            // Play feedback when email completes processing (transition to completed)
            if (email.processing_status === 'completed' && payload.processing_status === 'completed') {
                if (email.ai_analysis?.priority === 'High') {
                    sounds.playAlert();
                    toast.success('High Priority Email Processed!');
                } else {
                    sounds.playNotify();
                    toast.info('Email analysis complete');
                }
            }
        }
    }, [dispatch, fetchEmailWithRetry]);

    const handleRealtimeDelete = useCallback((emailId: string) => {
        dispatch({ type: 'REMOVE_EMAIL', payload: emailId });
    }, [dispatch]);

    const { isSubscribed } = useRealtimeEmails({
        userId: state.user?.id,
        onInsert: handleRealtimeInsert,
        onUpdate: handleRealtimeUpdate,
        onDelete: handleRealtimeDelete,
        enabled: state.isAuthenticated,
    });

    // Initialize auth
    useEffect(() => {
        async function init() {
            // Check if we have valid Supabase config
            const config = getSupabaseConfig();
            if (!config) {
                // No config - mark as initialized but not authenticated
                // App.tsx will show SetupWizard
                dispatch({ type: 'SET_INITIALIZED', payload: true });
                return;
            }

            try {
                // Validate connection before proceeding
                // This catches cases where env vars are present but invalid
                const { error: pingError } = await supabase.from('init_state').select('count', { count: 'exact', head: true });

                // If we get an auth error (401/403) or connection error, the config is likely bad.
                // However, RLS might deny access, which counts as a success connectivity-wise but a 403.
                // WE MUST distinguishing between "Bad Key" (401) and "RLS Denied" (401/403?? usually 401 is bad key).
                // Actually, init_state view is public or has specific RLS. 
                // A bad key comes as a PostgrestError with code 'PGRST301' or similar, or just a 401 response.

                if (pingError && pingError.message === 'Invalid API key') {
                    console.error('[AppContext] Invalid API Key detected during init');
                    // Clear invalid config if it was from storage? 
                    // If it's env vars, we can't clear them, but we can ignore them?
                    // App.tsx needs to know to show SetupWizard.
                    // We can signal this by setting error or specific state.
                    dispatch({ type: 'SET_INITIALIZED', payload: true }); // Let App render, but it might fail.
                    return;
                }

                await initializeApi(supabase);

                const { data: { session } } = await supabase.auth.getSession();
                dispatch({ type: 'SET_USER', payload: session?.user || null });
                dispatch({ type: 'SET_INITIALIZED', payload: true });

                // Listen for auth changes
                const { data: { subscription } } = supabase.auth.onAuthStateChange(
                    (_event, session) => {
                        dispatch({ type: 'SET_USER', payload: session?.user || null });
                        if (!session) {
                            dispatch({ type: 'CLEAR_DATA' });
                        }
                    }
                );

                return () => subscription.unsubscribe();
            } catch (error) {
                console.error('[AppContext] Init error:', error);

                // If valid config exists but basic connection fails, we should probably let the user know 
                // or fall back to setup.
                // For now, just mark initialized so UI shows error state if needed.
                dispatch({ type: 'SET_ERROR', payload: 'Failed to initialize' });
                dispatch({ type: 'SET_INITIALIZED', payload: true });
            }
        }
        init();
    }, []);

    // Actions
    const actions = {
        fetchEmails: async (params: { category?: string; search?: string; offset?: number; sortBy?: 'date' | 'created_at'; sortOrder?: 'asc' | 'desc' } = {}) => {
            const response = await api.getEmails({
                limit: 20,
                offset: params.offset || 0,
                category: params.category,
                search: params.search,
                sort_by: params.sortBy || state.sortBy,
                sort_order: params.sortOrder || state.sortOrder,
            });
            if (response.data) {
                dispatch({
                    type: 'SET_EMAILS',
                    payload: {
                        emails: response.data.emails,
                        total: response.data.total,
                        offset: params.offset || 0,
                        category: params.category || null,
                        search: params.search || '',
                        sortBy: params.sortBy,
                        sortOrder: params.sortOrder,
                    }
                });
            }
        },

        fetchAccounts: async () => {
            const response = await api.getAccounts();
            if (response.data) {
                dispatch({ type: 'SET_ACCOUNTS', payload: response.data.accounts });
            }
        },

        fetchRules: async () => {
            const response = await api.getRules();
            if (response.data) {
                dispatch({ type: 'SET_RULES', payload: response.data.rules });
            }
        },

        fetchSettings: async () => {
            const response = await api.getSettings();
            if (response.data) {
                dispatch({ type: 'SET_SETTINGS', payload: response.data.settings });
            }
        },

        fetchProfile: async () => {
            const response = await api.getProfile();
            if (response.data) {
                dispatch({ type: 'SET_PROFILE', payload: response.data });
            }
        },

        fetchStats: async () => {
            const response = await api.getStats();
            if (response.data) {
                dispatch({ type: 'SET_STATS', payload: response.data.stats });
            }
        },

        executeAction: async (emailId: string, action: string, draftContent?: string) => {
            const response = await api.executeAction(emailId, action, draftContent);
            if (response.data?.success) {
                // Update local state
                const email = state.emails.find(e => e.id === emailId);
                if (email) {
                    dispatch({
                        type: 'UPDATE_EMAIL',
                        payload: { ...email, action_taken: action as any }
                    });
                }
                return true;
            }
            dispatch({ type: 'SET_ERROR', payload: getErrorMessage(response.error, 'Action failed') });
            return false;
        },

        triggerSync: async (accountId?: string) => {
            const response = accountId
                ? await api.triggerSync(accountId)
                : await api.syncAll();
            
            // Always refresh accounts to show updated sync status
            await actions.fetchAccounts();
            
            if (response.error) {
                dispatch({ type: 'SET_ERROR', payload: getErrorMessage(response.error, 'Sync failed') });
                return false;
            }
            return true;
        },

        disconnectAccount: async (accountId: string) => {
            const response = await api.disconnectAccount(accountId);
            if (response.data?.success) {
                dispatch({ type: 'REMOVE_ACCOUNT', payload: accountId });
                return true;
            }
            dispatch({ type: 'SET_ERROR', payload: getErrorMessage(response.error, 'Failed to disconnect') });
            return false;
        },

        updateSettings: async (settings: Partial<UserSettings>) => {
            const response = await api.updateSettings(settings);
            if (response.data) {
                dispatch({ type: 'SET_SETTINGS', payload: response.data.settings });
                return true;
            }
            dispatch({ type: 'SET_ERROR', payload: getErrorMessage(response.error, 'Failed to update settings') });
            return false;
        },

        updateProfile: async (updates: { first_name?: string; last_name?: string; avatar_url?: string }) => {
            const response = await api.updateProfile(updates);
            if (response.data) {
                dispatch({ type: 'UPDATE_PROFILE', payload: response.data });
                return true;
            }
            dispatch({ type: 'SET_ERROR', payload: getErrorMessage(response.error, 'Failed to update profile') });
            return false;
        },

        updateAccount: async (accountId: string, updates: Partial<EmailAccount>) => {
            const response = await api.updateAccount(accountId, updates);
            if (response.data) {
                dispatch({
                    type: 'SET_ACCOUNTS',
                    payload: state.accounts.map(a => a.id === accountId ? { ...a, ...updates } : a)
                });
                return true;
            }
            dispatch({ type: 'SET_ERROR', payload: getErrorMessage(response.error, 'Failed to update account') });
            return false;
        },

        retryProcessing: async (emailId: string) => {
            const response = await api.retryEmail(emailId);
            if (response.data?.success) {
                // Update local state to show as pending
                const email = state.emails.find(e => e.id === emailId);
                if (email) {
                    dispatch({
                        type: 'UPDATE_EMAIL',
                        payload: { 
                            ...email, 
                            processing_status: 'pending',
                            processing_error: null 
                        }
                    });
                }
                return true;
            }
            dispatch({ type: 'SET_ERROR', payload: getErrorMessage(response.error, 'Retry failed') });
            return false;
        },

        createRule: async (rule: Omit<Rule, 'id' | 'user_id' | 'created_at'>) => {
            const response = await api.createRule(rule);
            if (response.data) {
                dispatch({ type: 'ADD_RULE', payload: response.data.rule });
                return true;
            }
            dispatch({ type: 'SET_ERROR', payload: getErrorMessage(response.error, 'Failed to create rule') });
            return false;
        },

        updateRule: async (ruleId: string, updates: Partial<Rule>) => {
            const response = await api.updateRule(ruleId, updates);
            if (response.data) {
                dispatch({ type: 'UPDATE_RULE', payload: response.data.rule });
                return true;
            }
            dispatch({ type: 'SET_ERROR', payload: getErrorMessage(response.error, 'Failed to update rule') });
            return false;
        },

        deleteRule: async (ruleId: string) => {
            const response = await api.deleteRule(ruleId);
            if (response.data?.success) {
                dispatch({ type: 'REMOVE_RULE', payload: ruleId });
                return true;
            }
            dispatch({ type: 'SET_ERROR', payload: getErrorMessage(response.error, 'Failed to delete rule') });
            return false;
        },

        toggleRule: async (ruleId: string) => {
            const response = await api.toggleRule(ruleId);
            if (response.data) {
                dispatch({ type: 'UPDATE_RULE', payload: response.data.rule });
                return true;
            }
            dispatch({ type: 'SET_ERROR', payload: getErrorMessage(response.error, 'Failed to toggle rule') });
            return false;
        },
    };

    return (
        <AppContext.Provider value={{ state, isSubscribed, dispatch, actions }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within AppProvider');
    }
    return context;
}
