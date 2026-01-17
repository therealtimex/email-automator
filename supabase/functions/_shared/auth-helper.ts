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
 * 1. integrations table (for the given user)
 * 2. Deno.env (server-side secrets)
 */
export async function getProviderCredentials(
    userId: string,
    provider: 'google' | 'microsoft'
): Promise<OAuthCredentials> {
    // 1. Try to fetch from integrations
    const { data: integration } = await supabaseAdmin
        .from('integrations')
        .select('credentials')
        .eq('user_id', userId)
        .eq('provider', provider)
        .maybeSingle();

    if (integration?.credentials) {
        const creds = integration.credentials as any;
        
        if (provider === 'google' && creds.client_id && creds.client_secret) {
            return {
                clientId: creds.client_id,
                clientSecret: creds.client_secret,
                redirectUri: Deno.env.get('GMAIL_REDIRECT_URI') 
            };
        }

        if (provider === 'microsoft' && creds.client_id) {
            return {
                clientId: creds.client_id,
                clientSecret: creds.client_secret || Deno.env.get('MS_GRAPH_CLIENT_SECRET') || '',
                tenantId: creds.tenant_id || Deno.env.get('MS_GRAPH_TENANT_ID') || 'common'
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