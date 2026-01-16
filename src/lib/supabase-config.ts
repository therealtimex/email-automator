import { createClient } from '@supabase/supabase-js';

const STORAGE_KEY = 'email_automator_supabase_config';

export interface SupabaseConfig {
    url: string;
    anonKey: string;
}

export function getSupabaseConfig(): SupabaseConfig | null {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.error('Error reading Supabase config:', error);
    }

    // Fallback to env vars
    const url = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (
        url && 
        anonKey && 
        url !== 'your_supabase_url' && 
        anonKey !== 'your_supabase_anon_key' &&
        url.startsWith('http')
    ) {
        return { url, anonKey };
    }

    return null;
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
        console.error('Error saving Supabase config:', error);
    }
}

export function clearSupabaseConfig(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error('Error clearing Supabase config:', error);
    }
}

/**
 * Validate Supabase connection
 */
export async function validateSupabaseConnection(
    url: string,
    anonKey: string
): Promise<{ valid: boolean; error?: string }> {
    try {
        // Basic URL validation
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return { valid: false, error: 'Invalid URL format' };
        }

        // Basic API key validation (supports both JWT anon keys and publishable keys)
        const isJwtKey = anonKey.startsWith('eyJ');
        const isPublishableKey = anonKey.startsWith('sb_publishable_');

        if (!isJwtKey && !isPublishableKey) {
            return { valid: false, error: 'Invalid API key format (must be anon or publishable key)' };
        }

        // Skip network validation for publishable keys as they might not be standard JWTs
        // compatible with the Postgrest root endpoint check
        if (isPublishableKey) {
            return { valid: true };
        }

        // Test connection by making a simple request
        const response = await fetch(`${url}/rest/v1/`, {
            method: 'GET',
            headers: {
                apikey: anonKey,
                Authorization: `Bearer ${anonKey}`,
            },
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                return { valid: false, error: 'Invalid API key' };
            }
            return { valid: false, error: `Connection failed: ${response.statusText}` };
        }

        return { valid: true };
    } catch (error) {
        return {
            valid: false,
            error: error instanceof Error ? error.message : 'Connection failed',
        };
    }
}

/**
 * Get Supabase config source (for display purposes)
 */
export function getConfigSource(): 'ui' | 'env' | 'none' {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return 'ui';

    const url = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (url && anonKey) return 'env';

    return 'none';
}
