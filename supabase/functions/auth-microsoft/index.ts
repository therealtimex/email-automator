import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { handleCors, createErrorResponse, createSuccessResponse } from '../_shared/cors.ts';
import { verifyUser } from '../_shared/auth.ts';
// Tokens are stored without encryption, protected by Supabase RLS
import { getProviderCredentials } from '../_shared/auth-helper.ts';

/**
 * Initiate Device Code Flow
 * POST /auth-microsoft?action=device-flow
 */
async function initiateDeviceFlow(req: Request): Promise<Response> {
  // Verify user authentication
  const { user, error: authError } = await verifyUser(req);
  if (authError || !user) {
    return createErrorResponse(401, authError || 'Unauthorized');
  }

  const { clientId, tenantId } = await getProviderCredentials(user.id, 'microsoft');
  const SCOPES = [
    'https://graph.microsoft.com/Mail.Read',
    'https://graph.microsoft.com/Mail.ReadWrite',
    'https://graph.microsoft.com/User.Read',
    'offline_access',
  ];
  const AUTHORITY = `https://login.microsoftonline.com/${tenantId || 'common'}`;

  try {
    // Request device code
    const response = await fetch(
      `${AUTHORITY}/oauth2/v2.0/devicecode`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          scope: SCOPES.join(' '),
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Device code request failed:', error);
      return createErrorResponse(400, 'Failed to initiate device flow');
    }

    const data = await response.json();

    return createSuccessResponse({
      userCode: data.user_code,
      verificationUri: data.verification_uri,
      message: data.message,
      expiresIn: data.expires_in,
      interval: data.interval,
      deviceCode: data.device_code,
    });
  } catch (error) {
    console.error('Device flow error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
}

/**
 * Poll for device code completion
 * POST /auth-microsoft?action=poll { deviceCode: string }
 */
async function pollDeviceCode(req: Request): Promise<Response> {
  // Verify user authentication
  const { user, error: authError } = await verifyUser(req);
  if (authError || !user) {
    return createErrorResponse(401, authError || 'Unauthorized');
  }

  const { deviceCode } = await req.json();
  if (!deviceCode) {
    return createErrorResponse(400, 'Missing device code');
  }

  const { clientId, clientSecret, tenantId } = await getProviderCredentials(user.id, 'microsoft');
  const AUTHORITY = `https://login.microsoftonline.com/${tenantId || 'common'}`;

  try {
    // Poll for token
    const body: Record<string, string> = {
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      client_id: clientId,
      device_code: deviceCode,
    };

    if (clientSecret) {
      body.client_secret = clientSecret;
    }

    const response = await fetch(
      `${AUTHORITY}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(body),
      }
    );

    const data = await response.json();

    // Check if still pending
    if (data.error === 'authorization_pending') {
      return createSuccessResponse({ status: 'pending' });
    }

    if (data.error) {
      console.error('Token polling error:', data.error_description || data.error);
      return createErrorResponse(400, data.error_description || data.error);
    }

    // Success! We have tokens
    // Get user profile to extract email
    const profileResponse = await fetch(
      'https://graph.microsoft.com/v1.0/me',
      {
        headers: {
          Authorization: `Bearer ${data.access_token}`,
        },
      }
    );

    if (!profileResponse.ok) {
      return createErrorResponse(400, 'Failed to fetch user profile');
    }

    const profile = await profileResponse.json();
    const emailAddress = profile.userPrincipalName || profile.mail;

    if (!emailAddress) {
      return createErrorResponse(400, 'Could not determine user email address');
    }

    // Store tokens directly (protected by Supabase RLS)
    const accessToken = data.access_token;
    const refreshToken = data.refresh_token || null;

    // Calculate token expiry
    const tokenExpiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : null;

    const SCOPES = data.scope?.split(' ') || [];

    // Save to database
    const { data: account, error: dbError } = await supabaseAdmin
      .from('email_accounts')
      .upsert(
        {
          user_id: user.id,
          email_address: emailAddress,
          provider: 'microsoft',
          access_token: accessToken,
          refresh_token: refreshToken,
          token_expires_at: tokenExpiresAt,
          scopes: SCOPES,
          is_active: true,
          sync_start_date: new Date().toISOString(), // Default to starting from "now"
          sync_max_emails_per_run: 50, // Safe default batch size
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
      status: 'completed',
      account,
    });
  } catch (error) {
    console.error('Poll error:', error);
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

    // POST /auth-microsoft?action=device-flow
    if (req.method === 'POST' && action === 'device-flow') {
      return await initiateDeviceFlow(req);
    }

    // POST /auth-microsoft?action=poll
    if (req.method === 'POST' && action === 'poll') {
      return await pollDeviceCode(req);
    }

    return createErrorResponse(405, 'Method not allowed');
  } catch (error) {
    console.error('Request error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('not configured') ? 400 : 500;
    return createErrorResponse(status, message);
  }
});
