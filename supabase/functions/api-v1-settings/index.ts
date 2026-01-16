import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { handleCors, createErrorResponse, createSuccessResponse } from '../_shared/cors.ts';
import { verifyUser } from '../_shared/auth.ts';

/**
 * Settings API
 *
 * GET /api-v1-settings - Get user settings
 * PATCH /api-v1-settings - Update user settings
 * GET /api-v1-settings/stats - Get user statistics
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

    // GET /api-v1-settings/stats - Get statistics
    if (req.method === 'GET' && pathParts[1] === 'stats') {
      // Get account count
      const { count: accountCount } = await supabaseAdmin
        .from('email_accounts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Get total emails
      const { count: totalEmails } = await supabaseAdmin
        .from('emails')
        .select('*, email_accounts!inner(user_id)', { count: 'exact', head: true })
        .eq('email_accounts.user_id', user.id);

      // Get category counts
      const { data: categoryData } = await supabaseAdmin
        .from('emails')
        .select('category, email_accounts!inner(user_id)')
        .eq('email_accounts.user_id', user.id);

      const categoryCounts: Record<string, number> = {};
      for (const email of categoryData || []) {
        const cat = email.category || 'uncategorized';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      }

      // Get action counts
      const { data: actionData } = await supabaseAdmin
        .from('emails')
        .select('action_taken, email_accounts!inner(user_id)')
        .eq('email_accounts.user_id', user.id);

      const actionCounts: Record<string, number> = {};
      for (const email of actionData || []) {
        const action = email.action_taken || 'none';
        actionCounts[action] = (actionCounts[action] || 0) + 1;
      }

      // Get recent syncs
      const { data: recentSyncs } = await supabaseAdmin
        .from('processing_logs')
        .select('*, email_accounts!inner(user_id)')
        .eq('email_accounts.user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(10);

      return createSuccessResponse({
        stats: {
          accountCount: accountCount || 0,
          totalEmails: totalEmails || 0,
          categoryCounts,
          actionCounts,
          recentSyncs: recentSyncs || [],
        },
      });
    }

    // GET /api-v1-settings - Get settings
    if (req.method === 'GET' && pathParts.length === 1) {
      const { data, error } = await supabaseAdmin
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Database error:', error);
        return createErrorResponse(500, 'Failed to fetch settings');
      }

      // Return default settings if none exist
      const settings = data || {
        user_id: user.id,
        sync_interval_minutes: 5,
        auto_trash_spam: false,
        smart_drafts: false,
      };

      return createSuccessResponse({ settings });
    }

    // PATCH /api-v1-settings - Update settings
    if (req.method === 'PATCH' && pathParts.length === 1) {
      const updates = await req.json();

      const { data, error } = await supabaseAdmin
        .from('user_settings')
        .upsert(
          {
            user_id: user.id,
            ...updates,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        return createErrorResponse(500, 'Failed to update settings');
      }

      return createSuccessResponse({ settings: data });
    }

    return createErrorResponse(405, 'Method not allowed');
  } catch (error) {
    console.error('Request error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
});
