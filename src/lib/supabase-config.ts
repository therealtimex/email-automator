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

    if (url && anonKey) {
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

export async function validateSupabaseConnection(url: string, anonKey: string): Promise<boolean> {
    try {
        const client = createClient(url, anonKey);
        const { error } = await client.from('email_accounts').select('count', { count: 'exact', head: true });
        return !error;
    } catch (error) {
        console.error('Supabase validation error:', error);
        return false;
    }
}
