/**
 * Hybrid API Client for Email Automator
 *
 * Architecture:
 * - Edge Functions: Auth, OAuth, Database operations (via Supabase)
 * - Express API (Local App): Email sync, AI processing
 */

import { getApiConfig } from './api-config';
import { EmailAccount } from './types';

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

        // Fallback: try to get token from supabaseClient if missing
        if (auth && !this.token && this.supabaseClient) {
            const { data: { session } } = await this.supabaseClient.auth.getSession();
            if (session?.access_token) {
                this.token = session.access_token;
                console.debug('[HybridApiClient] Recovered token from session');
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

    // Express API requests
    private expressRequest<T>(endpoint: string, options?: ApiOptions) {
        return this.request<T>(this.expressApiUrl, endpoint, options);
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
    } = {}) {
        const query = new URLSearchParams();
        if (params.limit) query.set('limit', params.limit.toString());
        if (params.offset) query.set('offset', params.offset.toString());
        if (params.category) query.set('category', params.category);
        if (params.search) query.set('search', params.search);

        return this.edgeRequest<{ emails: any[]; total: number }>(`/api-v1-emails?${query}`);
    }

    async getEmail(emailId: string) {
        return this.edgeRequest<{ email: any }>(`/api-v1-emails/${emailId}`);
    }

    async deleteEmail(emailId: string) {
        return this.edgeRequest<{ success: boolean }>(`/api-v1-emails/${emailId}`, {
            method: 'DELETE',
        });
    }

    async getCategorySummary() {
        return this.edgeRequest<{ categories: Record<string, number> }>('/api-v1-emails/summary/categories');
    }

    // ============================================================================
    // RULES ENDPOINTS (Edge Functions)
    // ============================================================================

    async getRules() {
        return this.edgeRequest<{ rules: any[] }>('/api-v1-rules');
    }

    async createRule(rule: { name: string; condition: any; action: string; is_enabled?: boolean }) {
        return this.edgeRequest<{ rule: any }>('/api-v1-rules', {
            method: 'POST',
            body: JSON.stringify(rule),
        });
    }

    async updateRule(ruleId: string, updates: any) {
        return this.edgeRequest<{ rule: any }>(`/api-v1-rules/${ruleId}`, {
            method: 'PATCH',
            body: JSON.stringify(updates),
        });
    }

    async deleteRule(ruleId: string) {
        return this.edgeRequest<{ success: boolean }>(`/api-v1-rules/${ruleId}`, {
            method: 'DELETE',
        });
    }

    async toggleRule(ruleId: string) {
        return this.edgeRequest<{ rule: any }>(`/api-v1-rules/${ruleId}/toggle`, {
            method: 'POST',
        });
    }

    // ============================================================================
    // SETTINGS ENDPOINTS (Edge Functions)
    // ============================================================================

    async getSettings() {
        return this.edgeRequest<{ settings: any }>('/api-v1-settings');
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

    async testLlm(config: { llm_model: string | null; llm_base_url: string | null; llm_api_key: string | null }) {
        return this.expressRequest<{ success: boolean; message: string }>('/api/settings/test-llm', {
            method: 'POST',
            body: JSON.stringify(config),
        });
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
    // HEALTH CHECK (Express API)
    // ============================================================================

    async healthCheck() {
        return this.expressRequest<{ status: string; services: any }>('/api/health', {
            auth: false
        });
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
