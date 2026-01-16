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

    // Express API URL: http://localhost:3004 (Local App)
    // Note: RealTimeX Desktop uses ports 3001/3002
    const expressApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3004';

    return {
        edgeFunctionsUrl,
        expressApiUrl,
        anonKey,
    };
}
