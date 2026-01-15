import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { handleCors, createErrorResponse, createSuccessResponse } from '../_shared/cors.ts';
import { verifyUser } from '../_shared/auth.ts';

/**
 * Emails API
 *
 * GET /api-v1-emails - List emails with pagination and filters
 * GET /api-v1-emails/:id - Get single email
 * DELETE /api-v1-emails/:id - Delete email record
 * GET /api-v1-emails/summary/categories - Get category summary
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

    // GET /api-v1-emails/summary/categories
    if (req.method === 'GET' && pathParts[1] === 'summary' && pathParts[2] === 'categories') {
      const { data, error } = await supabaseAdmin
        .from('emails')
        .select('category, email_accounts!inner(user_id)')
        .eq('email_accounts.user_id', user.id);

      if (error) {
        console.error('Database error:', error);
        return createErrorResponse(500, 'Failed to fetch category summary');
      }

      const summary: Record<string, number> = {};
      for (const email of data || []) {
        const cat = email.category || 'uncategorized';
        summary[cat] = (summary[cat] || 0) + 1;
      }

      return createSuccessResponse({ categories: summary });
    }

    // GET /api-v1-emails - List emails
    if (req.method === 'GET' && pathParts.length === 1) {
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = parseInt(url.searchParams.get('offset') || '0');
      const category = url.searchParams.get('category');
      const is_useless = url.searchParams.get('is_useless');
      const account_id = url.searchParams.get('account_id');
      const action_taken = url.searchParams.get('action_taken');
      const search = url.searchParams.get('search');

      let query = supabaseAdmin
        .from('emails')
        .select(`
          *,
          email_accounts!inner(id, user_id, email_address, provider)
        `, { count: 'exact' })
        .eq('email_accounts.user_id', user.id)
        .order('date', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply filters
      if (category) {
        query = query.eq('category', category);
      }
      if (is_useless !== null) {
        query = query.eq('is_useless', is_useless === 'true');
      }
      if (account_id) {
        query = query.eq('account_id', account_id);
      }
      if (action_taken) {
        query = query.eq('action_taken', action_taken);
      }
      if (search) {
        query = query.or(`subject.ilike.%${search}%,sender.ilike.%${search}%`);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Database error:', error);
        return createErrorResponse(500, 'Failed to fetch emails');
      }

      return createSuccessResponse({
        emails: data || [],
        total: count || 0,
        limit,
        offset,
      });
    }

    // GET /api-v1-emails/:id - Get single email
    if (req.method === 'GET' && pathParts.length === 2) {
      const emailId = pathParts[1];

      const { data, error } = await supabaseAdmin
        .from('emails')
        .select(`
          *,
          email_accounts!inner(id, user_id, email_address, provider)
        `)
        .eq('id', emailId)
        .eq('email_accounts.user_id', user.id)
        .single();

      if (error || !data) {
        return createErrorResponse(404, 'Email not found');
      }

      return createSuccessResponse({ email: data });
    }

    // DELETE /api-v1-emails/:id - Delete email
    if (req.method === 'DELETE' && pathParts.length === 2) {
      const emailId = pathParts[1];

      // Verify ownership
      const { data: email } = await supabaseAdmin
        .from('emails')
        .select('id, email_accounts!inner(user_id)')
        .eq('id', emailId)
        .eq('email_accounts.user_id', user.id)
        .single();

      if (!email) {
        return createErrorResponse(404, 'Email not found');
      }

      const { error } = await supabaseAdmin
        .from('emails')
        .delete()
        .eq('id', emailId);

      if (error) {
        console.error('Database error:', error);
        return createErrorResponse(500, 'Failed to delete email');
      }

      return createSuccessResponse({ success: true });
    }

    return createErrorResponse(405, 'Method not allowed');
  } catch (error) {
    console.error('Request error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
});
