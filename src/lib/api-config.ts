// API Configuration for Hybrid Architecture
// - Edge Functions: Auth, OAuth, Database proxy
// - Express API: Email sync, AI processing (Local App)

import { getSupabaseConfig } from './supabase-config';

export interface ApiConfig {
    edgeFunctionsUrl: string;
    expressApiUrl: string;
    anonKey: string;
}

export function getApiConfig(): ApiConfig {
    const supabaseConfig = getSupabaseConfig();

    // Edge Functions URL: https://PROJECT_ID.supabase.co/functions/v1
    const edgeFunctionsUrl = supabaseConfig
        ? `${supabaseConfig.url}/functions/v1`
        : '';
    
    const anonKey = supabaseConfig ? supabaseConfig.anonKey : '';

    // Express API URL:
    // 1. Priority: Environment variable override
    // 2. Development: If on Vite dev server (5173), fallback to default API port (3004)
    // 3. Production/Unified: Use the current window origin (same port deployment)
    const isViteDev = window.location.port === '5173';
    const defaultDevApi = 'http://localhost:3004';
    
    const expressApiUrl = import.meta.env.VITE_API_URL || (isViteDev ? defaultDevApi : window.location.origin);

    return {
        edgeFunctionsUrl,
        expressApiUrl,
        anonKey,
    };
}
