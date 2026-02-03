/**
 * Hybrid API Client for Email Automator
 *
 * Architecture:
 * - Edge Functions: Auth, OAuth, Database operations (via Supabase)
 * - Express API (Local App): Email sync, AI processing
 */

import { getApiConfig } from './api-config';
import { EmailAccount, Email } from './types';

interface ApiOptions extends RequestInit {
    auth?: boolean;
}

interface ApiResponse<T> {
    data?: T;
    error?: { code?: string; message: string } | string;
}

class HybridApiClient {
    private edgeFunctionsUrl: string;
    private expressApiUrl: string;
    private anonKey: string;
    private token: string | null = null;
    private supabaseClient: any = null;

    constructor() {
        const config = getApiConfig();
        this.edgeFunctionsUrl = config.edgeFunctionsUrl;
        this.expressApiUrl = config.expressApiUrl;
        this.anonKey = config.anonKey;
    }

    setSupabaseClient(client: any) {
        this.supabaseClient = client;
    }

    setToken(token: string | null) {
        if (token) {
            console.debug('[HybridApiClient] Token updated');
        } else {
            console.debug('[HybridApiClient] Token cleared');
        }
        this.token = token;
    }

    private async request<T>(
        baseUrl: string,
        endpoint: string,
        options: ApiOptions = {}
    ): Promise<ApiResponse<T>> {
        const { auth = true, ...fetchOptions } = options;

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        };

        // Always get the latest token from Supabase session if auth is required
        if (auth && this.supabaseClient) {
            try {
                const { data: { session }, error } = await this.supabaseClient.auth.getSession();
                if (error) {
                    console.error('[HybridApiClient] Failed to get Supabase session:', error);
                } else if (session?.access_token) {
                    this.token = session.access_token;
                }
            } catch (err) {
                console.error('[HybridApiClient] Session recovery error:', err);
            }
        }

        if (auth && !this.token) {
            console.warn(`[HybridApiClient] Attempted protected request to ${endpoint} without token`);
            return {
                error: {
                    code: 'AUTH_REQUIRED',
                    message: 'You must be logged in to perform this action',
                },
            };
        }

        if (auth && this.token) {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            console.debug(`[HybridApiClient] ${options.method || 'GET'} ${baseUrl}${endpoint}`);
            const response = await fetch(`${baseUrl}${endpoint}`, {
                ...fetchOptions,
                headers,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = typeof errorData.error === 'string'
                    ? errorData.error
                    : errorData.error?.message || `Request failed: ${response.status}`;

                return {
                    error: {
                        code: errorData.error?.code || 'API_ERROR',
                        message: errorMessage,
                    },
                };
            }

            const data = await response.json();
            return { data };
        } catch (error) {
            return {
                error: {
                    code: 'NETWORK_ERROR',
                    message: error instanceof Error ? error.message : 'Network error',
                },
            };
        }
    }

    // Edge Functions requests
    private edgeRequest<T>(endpoint: string, options?: ApiOptions) {
        // Supabase Gateway requires 'apikey' header for all requests
        const headers = {
            ...(options?.headers || {}),
            apikey: this.anonKey,
        };

        return this.request<T>(this.edgeFunctionsUrl, endpoint, {
            ...options,
            headers,
        });
    }

    // Express API requests - include Supabase config for backend to use
    private expressRequest<T>(endpoint: string, options?: ApiOptions) {
        const config = getApiConfig();
        const headers = {
            ...(options?.headers || {}),
            // Pass Supabase config so backend can connect dynamically
            'X-Supabase-Url': config.edgeFunctionsUrl.replace('/functions/v1', ''),
            'X-Supabase-Anon-Key': config.anonKey,
        };

        return this.request<T>(this.expressApiUrl, endpoint, {
            ...options,
            headers,
        });
    }

    // ============================================================================
    // AUTH & OAUTH ENDPOINTS (Edge Functions)
    // ============================================================================

    async getGmailAuthUrl() {
        return this.edgeRequest<{ url: string }>('/auth-gmail?action=url', {
            method: 'GET',
        });
    }

    async connectGmail(code: string) {
        return this.edgeRequest<{ success: boolean; account: any }>('/auth-gmail', {
            method: 'POST',
            body: JSON.stringify({ code }),
        });
    }

    async startMicrosoftDeviceFlow() {
        return this.edgeRequest<{
            userCode: string;
            verificationUri: string;
            message: string;
            deviceCode: string;
            expiresIn: number;
            interval: number;
        }>('/auth-microsoft?action=device-flow', {
            method: 'POST',
        });
    }

    async pollMicrosoftDeviceCode(deviceCode: string) {
        return this.edgeRequest<{
            status: 'pending' | 'completed';
            account?: any
        }>('/auth-microsoft?action=poll', {
            method: 'POST',
            body: JSON.stringify({ deviceCode }),
        });
    }

    // ============================================================================
    // ACCOUNTS ENDPOINTS (Edge Functions)
    // ============================================================================

    async getAccounts() {
        return this.edgeRequest<{ accounts: any[] }>('/api-v1-accounts');
    }

    async disconnectAccount(accountId: string) {
        return this.edgeRequest<{ success: boolean }>(`/api-v1-accounts/${accountId}`, {
            method: 'DELETE',
        });
    }

    async updateAccount(accountId: string, updates: Partial<EmailAccount>) {
        return this.edgeRequest<{ account: EmailAccount }>(`/api-v1-accounts/${accountId}`, {
            method: 'PATCH',
            body: JSON.stringify(updates),
        });
    }

    // ============================================================================
    // EMAILS ENDPOINTS (Edge Functions)
    // ============================================================================

    async getEmails(params: {
        limit?: number;
        offset?: number;
        category?: string;
        search?: string;
        sort_by?: 'date' | 'created_at';
        sort_order?: 'asc' | 'desc';
    } = {}) {
        const query = new URLSearchParams();
        if (params.limit) query.set('limit', params.limit.toString());
        if (params.offset) query.set('offset', params.offset.toString());
        if (params.category) query.set('category', params.category);
        if (params.search) query.set('search', params.search);
        if (params.sort_by) query.set('sort_by', params.sort_by);
        if (params.sort_order) query.set('sort_order', params.sort_order);

        return this.edgeRequest<{ emails: any[]; total: number }>(`/api-v1-emails?${query}`);
    }

    async getEmail(emailId: string) {
        return this.edgeRequest<{ email: any }>(`/api-v1-emails/${emailId}`);
    }

    async getEmailEvents(emailId: string) {
        return this.edgeRequest<{ events: any[] }>(`/api-v1-emails/${emailId}/events`);
    }

    async deleteEmail(emailId: string) {
        return this.edgeRequest<{ success: boolean }>(`/api-v1-emails/${emailId}`, {
            method: 'DELETE',
        });
    }

    async getCategorySummary() {
        return this.edgeRequest<{ categories: Record<string, number> }>('/api-v1-emails/summary/categories');
    }

    async retryEmail(emailId: string) {
        return this.expressRequest<{ success: boolean }>(`/api/emails/${emailId}/retry`, {
            method: 'POST',
        });
    }

    // ============================================================================
    // RULES ENDPOINTS (Express API - Local App)
    // ============================================================================

    async getRules() {
        return this.expressRequest<{ rules: any[] }>('/api/rules');
    }

    async createRule(rule: { name: string; condition: any; action?: string; actions?: string[]; is_enabled?: boolean, instructions?: string, attachments?: any[] }) {
        return this.expressRequest<{ rule: any }>('/api/rules', {
            method: 'POST',
            body: JSON.stringify(rule),
        });
    }

    async updateRule(ruleId: string, updates: any) {
        return this.expressRequest<{ rule: any }>(`/api/rules/${ruleId}`, {
            method: 'PATCH',
            body: JSON.stringify(updates),
        });
    }

    async deleteRule(ruleId: string) {
        return this.expressRequest<{ success: boolean }>(`/api/rules/${ruleId}`, {
            method: 'DELETE',
        });
    }

    async toggleRule(ruleId: string) {
        return this.expressRequest<{ rule: any }>(`/api/rules/${ruleId}/toggle`, {
            method: 'POST',
        });
    }

    // ============================================================================
    // SETTINGS ENDPOINTS (Edge Functions)
    // ============================================================================

    async getSettings() {
        return this.edgeRequest<{ settings: any }>('/api-v1-settings');
    }

    async getRunEvents(runId: string) {
        return this.edgeRequest<{ events: any[] }>(`/api-v1-settings/logs/${runId}/events`);
    }

    async updateSettings(settings: any) {
        return this.edgeRequest<{ settings: any }>('/api-v1-settings', {
            method: 'PATCH',
            body: JSON.stringify(settings),
        });
    }

    async getStats() {
        return this.edgeRequest<{ stats: any }>('/api-v1-settings/stats');
    }

    async testLlm(params?: { llm_provider?: string; llm_model?: string }) {
        return this.expressRequest<{ success: boolean; message: string }>('/api/settings/test-llm', {
            method: 'POST',
            body: JSON.stringify(params || {}),
        });
    }

    async getChatProviders() {
        return this.expressRequest<{ success: boolean; providers: any[]; message?: string }>('/api/sdk/providers/chat');
    }

    async getEmbedProviders() {
        return this.expressRequest<{ success: boolean; providers: any[]; message?: string }>('/api/sdk/providers/embed');
    }

    // ============================================================================
    // SYNC ENDPOINTS (Express API - Local App)
    // ============================================================================

    async triggerSync(accountId: string) {
        return this.expressRequest<{ message: string }>('/api/sync', {
            method: 'POST',
            body: JSON.stringify({ accountId }),
        });
    }

    async syncAll() {
        return this.expressRequest<{ message: string; accountCount: number }>('/api/sync/all', {
            method: 'POST',
        });
    }

    async getSyncLogs(limit = 10) {
        return this.expressRequest<{ logs: any[] }>(`/api/sync/logs?limit=${limit}`);
    }

    async stopSync() {
        return this.expressRequest<{ success: boolean }>('/api/sync/stop', {
            method: 'POST',
        });
    }

    // ============================================================================
    // ACTION ENDPOINTS (Express API - Local App)
    // ============================================================================

    async executeAction(emailId: string, action: string, draftContent?: string) {
        return this.expressRequest<{ success: boolean; details?: string }>('/api/actions/execute', {
            method: 'POST',
            body: JSON.stringify({ emailId, action, draftContent }),
        });
    }

    async generateDraft(emailId: string, instructions?: string) {
        return this.expressRequest<{ draft: string }>(`/api/actions/draft/${emailId}`, {
            method: 'POST',
            body: JSON.stringify({ instructions }),
        });
    }

    async bulkAction(emailIds: string[], action: string) {
        return this.expressRequest<{ success: number; failed: number }>('/api/actions/bulk', {
            method: 'POST',
            body: JSON.stringify({ emailIds, action }),
        });
    }

    // ============================================================================
    // DRAFTS ENDPOINTS (Express API - Local App)
    // ============================================================================

    async getDrafts(params: { status?: 'pending' | 'sent' | 'dismissed'; limit?: number; offset?: number; account_id?: string } = {}) {
        const query = new URLSearchParams();
        if (params.status) query.set('status', params.status);
        if (params.limit) query.set('limit', params.limit.toString());
        if (params.offset) query.set('offset', params.offset.toString());
        if (params.account_id && params.account_id !== 'all') query.set('account_id', params.account_id);

        return this.expressRequest<{ drafts: Email[]; total: number }>(`/api/drafts?${query}`);
    }

    async sendDraft(emailId: string) {
        return this.expressRequest<{ success: boolean; messageId: string }>(`/api/drafts/${emailId}/send`, {
            method: 'POST'
        });
    }

    async dismissDraft(emailId: string) {
        return this.expressRequest<{ success: boolean }>(`/api/drafts/${emailId}/dismiss`, {
            method: 'POST'
        });
    }

    // ============================================================================
    // HEALTH CHECK (Express API)
    // ============================================================================

    async healthCheck() {
        return this.expressRequest<{ status: string; services: any }>('/api/health', {
            auth: false
        });
    }

    // ============================================================================
    // PROFILE & SECURITY (Edge Functions / Supabase Auth)
    // ============================================================================

    async getProfile() {
        if (!this.supabaseClient) return { error: 'Supabase client not initialized' };
        const { data: { user } } = await this.supabaseClient.auth.getUser();
        if (!user) return { error: 'Not authenticated' };

        const { data, error } = await this.supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        return { data, error };
    }

    async updateProfile(updates: { first_name?: string; last_name?: string; avatar_url?: string }) {
        if (!this.supabaseClient) return { error: 'Supabase client not initialized' };
        const { data: { user } } = await this.supabaseClient.auth.getUser();
        if (!user) return { error: 'Not authenticated' };

        const { data, error } = await this.supabaseClient
            .from('profiles')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id)
            .select()
            .single();

        return { data, error };
    }

    async changePassword(password: string) {
        if (!this.supabaseClient) return { error: 'Supabase client not initialized' };
        const { error } = await this.supabaseClient.auth.updateUser({ password });
        return { success: !error, error };
    }

    // ========================================
    // Rule Packs API (Zero-Config UX)
    // ========================================

    async getAvailablePacks() {
        return await this.expressRequest<any>('/rule-packs');
    }

    async getInstalledPacks() {
        return await this.expressRequest<any>('/rule-packs/installed');
    }

    async getPack(packId: string) {
        return await this.expressRequest<any>(`/rule-packs/${packId}`);
    }

    async getPacksForRole(role: string) {
        return await this.expressRequest<any>(`/rule-packs/for-role/${role}`);
    }

    async installPack(packId: string) {
        return await this.expressRequest<any>('/rule-packs/install', {
            method: 'POST',
            body: JSON.stringify({ packId })
        });
    }

    async uninstallPack(packId: string) {
        return await this.expressRequest<any>('/rule-packs/uninstall', {
            method: 'POST',
            body: JSON.stringify({ packId })
        });
    }

    async setUserRole(role: string) {
        return await this.expressRequest<any>('/rule-packs/set-role', {
            method: 'POST',
            body: JSON.stringify({ role })
        });
    }

    // ========================================
    // Adaptive Learning API (Phase 4)
    // ========================================

    async submitFeedback(feedback: {
        email_id: string;
        feedback_type: 'analysis' | 'draft';
        original_state: any;
        corrected_state: any;
    }) {
        if (!this.supabaseClient) return { error: 'Supabase client not initialized' };

        const { data: { user } } = await this.supabaseClient.auth.getUser();
        if (!user) return { error: 'Not authenticated' };

        const { error } = await this.supabaseClient
            .from('user_feedback')
            .insert({
                user_id: user.id,
                email_id: feedback.email_id,
                feedback_type: feedback.feedback_type,
                original_data: feedback.original_state,
                corrected_data: feedback.corrected_state,
            });

        return { success: !error, error };
    }

    async getLearningMetrics() {
        if (!this.supabaseClient) return { error: 'Supabase client not initialized' };

        const { data: { user } } = await this.supabaseClient.auth.getUser();
        if (!user) return { error: 'Not authenticated' };

        // Get metrics
        const { data: metrics } = await this.supabaseClient
            .from('learning_metrics')
            .select('*')
            .eq('user_id', user.id)
            .single();

        // Get user settings for patterns/VIPs
        const { data: settings } = await this.supabaseClient
            .from('user_settings')
            .select('category_patterns, vip_senders')
            .eq('user_id', user.id)
            .single();

        return {
            data: {
                ...metrics,
                category_patterns: settings?.category_patterns || {},
                vip_senders: settings?.vip_senders || []
            }
        };
    }
}

export const api = new HybridApiClient();

// Helper to initialize API with auth token from Supabase session
export async function initializeApi(supabase: any) {
    api.setSupabaseClient(supabase);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
        api.setToken(session.access_token);
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event: string, session: any) => {
        api.setToken(session?.access_token || null);
    });
}
