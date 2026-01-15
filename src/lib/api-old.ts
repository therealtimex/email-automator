import { getSupabaseConfig } from './supabase-config';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

interface ApiOptions extends RequestInit {
    auth?: boolean;
}

interface ApiResponse<T> {
    data?: T;
    error?: { code: string; message: string };
}

class ApiClient {
    private baseUrl: string;
    private token: string | null = null;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    setToken(token: string | null) {
        this.token = token;
    }

    private async request<T>(
        endpoint: string,
        options: ApiOptions = {}
    ): Promise<ApiResponse<T>> {
        const { auth = true, ...fetchOptions } = options;

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        };

        if (auth && this.token) {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...fetchOptions,
                headers,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return {
                    error: {
                        code: errorData.error?.code || 'API_ERROR',
                        message: errorData.error?.message || `Request failed: ${response.status}`,
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

    // Auth endpoints
    async getGmailAuthUrl() {
        return this.request<{ url: string }>('/api/auth/gmail/url', { method: 'GET' });
    }

    async connectGmail(code: string) {
        return this.request<{ success: boolean; account: any }>('/api/auth/gmail/callback', {
            method: 'POST',
            body: JSON.stringify({ code }),
        });
    }

    async startMicrosoftDeviceFlow() {
        return this.request<{ userCode: string; verificationUri: string; message: string }>(
            '/api/auth/microsoft/device-flow',
            { method: 'POST' }
        );
    }

    async getAccounts() {
        return this.request<{ accounts: any[] }>('/api/auth/accounts');
    }

    async disconnectAccount(accountId: string) {
        return this.request<{ success: boolean }>(`/api/auth/accounts/${accountId}`, {
            method: 'DELETE',
        });
    }

    // Sync endpoints
    async triggerSync(accountId: string) {
        return this.request<{ message: string }>('/api/sync', {
            method: 'POST',
            body: JSON.stringify({ accountId }),
        });
    }

    async syncAll() {
        return this.request<{ message: string; accountCount: number }>('/api/sync/all', {
            method: 'POST',
        });
    }

    async getSyncLogs(limit = 10) {
        return this.request<{ logs: any[] }>(`/api/sync/logs?limit=${limit}`);
    }

    // Email endpoints
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
        
        return this.request<{ emails: any[]; total: number }>(`/api/emails?${query}`);
    }

    async getEmail(emailId: string) {
        return this.request<{ email: any }>(`/api/emails/${emailId}`);
    }

    async getCategorySummary() {
        return this.request<{ categories: Record<string, number> }>('/api/emails/summary/categories');
    }

    // Action endpoints
    async executeAction(emailId: string, action: string, draftContent?: string) {
        return this.request<{ success: boolean; details?: string }>('/api/actions/execute', {
            method: 'POST',
            body: JSON.stringify({ emailId, action, draftContent }),
        });
    }

    async generateDraft(emailId: string, instructions?: string) {
        return this.request<{ draft: string }>(`/api/actions/draft/${emailId}`, {
            method: 'POST',
            body: JSON.stringify({ instructions }),
        });
    }

    async bulkAction(emailIds: string[], action: string) {
        return this.request<{ success: number; failed: number }>('/api/actions/bulk', {
            method: 'POST',
            body: JSON.stringify({ emailIds, action }),
        });
    }

    // Rules endpoints
    async getRules() {
        return this.request<{ rules: any[] }>('/api/rules');
    }

    async createRule(rule: { name: string; condition: any; action: string; is_enabled?: boolean }) {
        return this.request<{ rule: any }>('/api/rules', {
            method: 'POST',
            body: JSON.stringify(rule),
        });
    }

    async updateRule(ruleId: string, updates: any) {
        return this.request<{ rule: any }>(`/api/rules/${ruleId}`, {
            method: 'PATCH',
            body: JSON.stringify(updates),
        });
    }

    async deleteRule(ruleId: string) {
        return this.request<{ success: boolean }>(`/api/rules/${ruleId}`, {
            method: 'DELETE',
        });
    }

    async toggleRule(ruleId: string) {
        return this.request<{ rule: any }>(`/api/rules/${ruleId}/toggle`, {
            method: 'POST',
        });
    }

    // Settings endpoints
    async getSettings() {
        return this.request<{ settings: any }>('/api/settings');
    }

    async updateSettings(settings: any) {
        return this.request<{ settings: any }>('/api/settings', {
            method: 'PATCH',
            body: JSON.stringify(settings),
        });
    }

    async getStats() {
        return this.request<{ stats: any }>('/api/settings/stats');
    }

    // Health check
    async healthCheck() {
        return this.request<{ status: string; services: any }>('/api/health', { auth: false });
    }
}

export const api = new ApiClient(API_BASE_URL);

// Helper to initialize API with auth token from Supabase session
export async function initializeApi(supabase: any) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
        api.setToken(session.access_token);
    }
    
    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event: string, session: any) => {
        api.setToken(session?.access_token || null);
    });
}
