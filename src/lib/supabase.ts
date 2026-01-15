import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './supabase-config';

let cachedClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
    // Try to get from cache first
    if (cachedClient) return cachedClient;

    // Try localStorage config
    const config = getSupabaseConfig();
    if (config?.url && config?.anonKey) {
        cachedClient = createClient(config.url, config.anonKey);
        return cachedClient;
    }

    // Try environment variables as fallback
    const envUrl = import.meta.env.VITE_SUPABASE_URL;
    const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (envUrl && envKey) {
        cachedClient = createClient(envUrl, envKey);
        return cachedClient;
    }

    console.warn('Supabase client not configured');
    return null;
}

// For backwards compatibility
export const supabase = getSupabase();
