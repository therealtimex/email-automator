import { supabaseAdmin } from './supabaseAdmin.ts';

export interface OAuthCredentials {
    clientId: string;
    clientSecret: string;
    // Optional extras
    tenantId?: string;
    redirectUri?: string;
}

/**
 * Fetch credentials for a specific provider.
 * Priority: 
 * 1. user_settings table (for the given user)
 * 2. Deno.env (server-side secrets)
 */
export async function getProviderCredentials(
    userId: string,
    provider: 'google' | 'microsoft'
): Promise<OAuthCredentials> {
    // 1. Try to fetch from user_settings
    const { data: settings } = await supabaseAdmin
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (settings) {
        if (provider === 'google' && settings.google_client_id && settings.google_client_secret) {
            return {
                clientId: settings.google_client_id,
                clientSecret: settings.google_client_secret,
                redirectUri: Deno.env.get('GMAIL_REDIRECT_URI') // Redirect URI is usually app-specific, still from env for now or could be generic
            };
        }

        if (provider === 'microsoft' && settings.microsoft_client_id) {
            // MS ID is required, Secret is optional for Public Client but we support confidential if provided
            return {
                clientId: settings.microsoft_client_id,
                clientSecret: settings.microsoft_client_secret || Deno.env.get('MS_GRAPH_CLIENT_SECRET') || '',
                tenantId: settings.microsoft_tenant_id || Deno.env.get('MS_GRAPH_TENANT_ID') || 'common'
            };
        }
    }

    // 2. Fallback to Env Vars
    if (provider === 'google') {
        const clientId = Deno.env.get('GMAIL_CLIENT_ID');
        const clientSecret = Deno.env.get('GMAIL_CLIENT_SECRET');
        if (!clientId || !clientSecret) {
            throw new Error('Gmail OAuth credentials not configured (Database or Env)');
        }
        return {
            clientId,
            clientSecret,
            redirectUri: Deno.env.get('GMAIL_REDIRECT_URI')
        };
    }

    if (provider === 'microsoft') {
        const clientId = Deno.env.get('MS_GRAPH_CLIENT_ID');
        if (!clientId) {
            throw new Error('Microsoft OAuth credentials not configured (Database or Env)');
        }
        return {
            clientId,
            clientSecret: Deno.env.get('MS_GRAPH_CLIENT_SECRET') || '',
            tenantId: Deno.env.get('MS_GRAPH_TENANT_ID') || 'common'
        };
    }

    throw new Error(`Unknown provider: ${provider}`);
}
