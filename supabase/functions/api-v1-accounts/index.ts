import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { handleCors, createErrorResponse, createSuccessResponse } from '../_shared/cors.ts';
import { verifyUser } from '../_shared/auth.ts';

/**
 * Email Accounts API
 *
 * GET /api-v1-accounts - List all accounts for the authenticated user
 * DELETE /api-v1-accounts/:id - Disconnect an account
 */

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Verify user authentication
  const { user, error: authError } = await verifyUser(req);
  if (authError || !user) {
    return createErrorResponse(401, authError || 'Unauthorized');
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    // GET /api-v1-accounts - List accounts
    if (req.method === 'GET' && pathParts.length === 1) {
      const { data, error } = await supabaseAdmin
        .from('email_accounts')
        .select('id, provider, email_address, is_active, last_sync_checkpoint, sync_start_date, sync_max_emails_per_run, last_sync_at, last_sync_status, last_sync_error, created_at, updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        return createErrorResponse(500, 'Failed to fetch accounts');
      }

      return createSuccessResponse({ accounts: data || [] });
    }

    // PATCH /api-v1-accounts/:id - Update account settings
    if (req.method === 'PATCH' && pathParts.length === 2) {
      const accountId = pathParts[1];
      const updates = await req.json();

      // Only allow updating specific fields
      const allowedUpdates: Record<string, any> = {};
      if (updates.sync_start_date !== undefined) allowedUpdates.sync_start_date = updates.sync_start_date;
      if (updates.sync_max_emails_per_run !== undefined) allowedUpdates.sync_max_emails_per_run = updates.sync_max_emails_per_run;
      if (updates.is_active !== undefined) allowedUpdates.is_active = updates.is_active;

      const { data, error } = await supabaseAdmin
        .from('email_accounts')
        .update(allowedUpdates)
        .eq('id', accountId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        return createErrorResponse(500, 'Failed to update account');
      }

      if (!data) {
        return createErrorResponse(404, 'Account not found');
      }

      return createSuccessResponse({ account: data });
    }

    // DELETE /api-v1-accounts/:id - Disconnect account
    if (req.method === 'DELETE' && pathParts.length === 2) {
      const accountId = pathParts[1];

      // Verify account ownership
      const { data: account } = await supabaseAdmin
        .from('email_accounts')
        .select('id')
        .eq('id', accountId)
        .eq('user_id', user.id)
        .single();

      if (!account) {
        return createErrorResponse(404, 'Account not found');
      }

      // Delete account
      const { error } = await supabaseAdmin
        .from('email_accounts')
        .delete()
        .eq('id', accountId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Database error:', error);
        return createErrorResponse(500, 'Failed to delete account');
      }

      return createSuccessResponse({ success: true });
    }

    return createErrorResponse(405, 'Method not allowed');
  } catch (error) {
    console.error('Request error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
});
