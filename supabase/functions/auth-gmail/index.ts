import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { handleCors, createErrorResponse, createSuccessResponse } from '../_shared/cors.ts';
import { verifyUser } from '../_shared/auth.ts';
import { encrypt } from '../_shared/encryption.ts';

const GMAIL_CLIENT_ID = Deno.env.get('GMAIL_CLIENT_ID');
const GMAIL_CLIENT_SECRET = Deno.env.get('GMAIL_CLIENT_SECRET');
const GMAIL_REDIRECT_URI = Deno.env.get('GMAIL_REDIRECT_URI') || 'urn:ietf:wg:oauth:2.0:oob';

// Validate credentials inside handler to allow CORS preflight to succeed
function validateCredentials() {
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
    throw new Error('Gmail OAuth credentials not configured');
  }
}

const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];

// REMOVED imports and constants relying on global env
import { getProviderCredentials } from '../_shared/auth-helper.ts';

// Removed global validateCredentials

/**
 * Generate Gmail OAuth URL
 * GET /auth-gmail?action=url
 */
async function getAuthUrl(req: Request): Promise<Response> {
  // Verify user to get their specific credentials
  const { user, error: authError } = await verifyUser(req);
  if (authError || !user) {
    return createErrorResponse(401, authError || 'Unauthorized');
  }

  const { clientId, redirectUri } = await getProviderCredentials(user.id, 'google');

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri || 'urn:ietf:wg:oauth:2.0:oob');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPES.join(' '));
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  // Pass user ID in state to know who to link callback to?
  // Actually, handleCallback validates user from session again, so state isn't strictly needed for identity, 
  // but good for security. For now simplicity.

  return createSuccessResponse({ url: url.toString() });
}

/**
 * Exchange OAuth code for tokens and save account
 * POST /auth-gmail { code: string }
 */
async function handleCallback(req: Request): Promise<Response> {
  const { user, error: authError } = await verifyUser(req);
  if (authError || !user) {
    return createErrorResponse(401, authError || 'Unauthorized');
  }

  const { clientId, clientSecret, redirectUri } = await getProviderCredentials(user.id, 'google');

  // Parse request body
  const { code } = await req.json();
  if (!code) {
    return createErrorResponse(400, 'Missing authorization code');
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri || 'urn:ietf:wg:oauth:2.0:oob',
        grant_type: 'authorization_code',
      }),
    });
    // ... remainder is similar but variables are local now

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', error);
      return createErrorResponse(400, 'Failed to exchange authorization code');
    }

    const tokens = await tokenResponse.json();

    // Get user's Gmail profile
    const profileResponse = await fetch(
      'https://www.googleapis.com/gmail/v1/users/me/profile',
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    if (!profileResponse.ok) {
      return createErrorResponse(400, 'Failed to fetch Gmail profile');
    }

    const profile = await profileResponse.json();
    const emailAddress = profile.emailAddress;

    // Encrypt tokens
    const encryptedAccessToken = await encrypt(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token
      ? await encrypt(tokens.refresh_token)
      : null;

    // Calculate token expiry
    const tokenExpiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    // Save to database
    const { data: account, error: dbError } = await supabaseAdmin
      .from('email_accounts')
      .upsert(
        {
          user_id: user.id,
          email_address: emailAddress,
          provider: 'gmail',
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          token_expires_at: tokenExpiresAt,
          scopes: tokens.scope?.split(' ') || SCOPES,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id, email_address' }
      )
      .select('id, email_address, provider, is_active, created_at')
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return createErrorResponse(500, 'Failed to save account');
    }

    return createSuccessResponse({
      success: true,
      account,
    });
  } catch (error) {
    console.error('Callback error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
}

/**
 * Main handler
 */
Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // GET /auth-gmail?action=url
    if (req.method === 'GET' && action === 'url') {
      return await getAuthUrl(req);
    }

    // POST /auth-gmail (callback)
    if (req.method === 'POST') {
      return await handleCallback(req);
    }

    return createErrorResponse(405, 'Method not allowed');
  } catch (error) {
    console.error('Request error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('not configured') ? 400 : 500;
    return createErrorResponse(status, message);
  }
});
