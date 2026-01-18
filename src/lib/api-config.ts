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

    // Express API URL Discovery:
    // 1. If we are in Vite Dev Mode (port 5173), use VITE_API_URL or default 3004
    // 2. If we are running on the Unified Server (production/npx), use the current window origin
    const isViteDev = window.location.port === '5173';
    const envApiUrl = import.meta.env.VITE_API_URL;
    
    let expressApiUrl = '';
    if (isViteDev) {
        expressApiUrl = envApiUrl || 'http://localhost:3004';
    } else {
        // Use current window origin (e.g. http://localhost:3008)
        expressApiUrl = window.location.origin;
    }

    return {
        edgeFunctionsUrl,
        expressApiUrl,
        anonKey,
    };
}
