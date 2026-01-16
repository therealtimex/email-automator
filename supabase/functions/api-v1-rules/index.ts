import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { handleCors, createErrorResponse, createSuccessResponse } from '../_shared/cors.ts';
import { verifyUser } from '../_shared/auth.ts';

/**
 * Rules API
 *
 * GET /api-v1-rules - List all rules
 * POST /api-v1-rules - Create a new rule
 * PATCH /api-v1-rules/:id - Update a rule
 * DELETE /api-v1-rules/:id - Delete a rule
 * POST /api-v1-rules/:id/toggle - Toggle rule enabled status
 */

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Verify user authentication
    const { user, error: authError } = await verifyUser(req);
    if (authError || !user) {
      return createErrorResponse(401, authError || 'Unauthorized');
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    // GET /api-v1-rules - List rules
    if (req.method === 'GET' && pathParts.length === 1) {
      const { data, error } = await supabaseAdmin
        .from('rules')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error fetching rules:', error);
        return createErrorResponse(500, `Failed to fetch rules: ${error.message}`);
      }

      return createSuccessResponse({ rules: data || [] });
    }

    // POST /api-v1-rules - Create rule
    if (req.method === 'POST' && pathParts.length === 1) {
      const body = await req.json();
      const { name, condition, action, is_enabled = true } = body;

      if (!name || !condition || !action) {
        return createErrorResponse(400, 'Missing required fields: name, condition, action');
      }

      const { data, error } = await supabaseAdmin
        .from('rules')
        .insert({
          user_id: user.id,
          name,
          condition,
          action,
          is_enabled,
        })
        .select()
        .single();

      if (error) {
        console.error('Database error creating rule:', error);
        return createErrorResponse(500, `Failed to create rule: ${error.message}`);
      }

      return createSuccessResponse({ rule: data }, 201);
    }

    // POST /api-v1-rules/:id/toggle - Toggle rule
    if (req.method === 'POST' && pathParts.length === 3 && pathParts[2] === 'toggle') {
      const ruleId = pathParts[1];

      // Get current state
      const { data: currentRule, error: fetchError } = await supabaseAdmin
        .from('rules')
        .select('is_enabled')
        .eq('id', ruleId)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !currentRule) {
        return createErrorResponse(404, 'Rule not found');
      }

      // Toggle
      const { data, error } = await supabaseAdmin
        .from('rules')
        .update({ is_enabled: !currentRule.is_enabled })
        .eq('id', ruleId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Database error toggling rule:', error);
        return createErrorResponse(500, `Failed to toggle rule: ${error.message}`);
      }

      return createSuccessResponse({ rule: data });
    }

    // PATCH /api-v1-rules/:id - Update rule
    if (req.method === 'PATCH' && pathParts.length === 2) {
      const ruleId = pathParts[1];
      const updates = await req.json();

      // Verify ownership
      const { data: rule, error: fetchError } = await supabaseAdmin
        .from('rules')
        .select('id')
        .eq('id', ruleId)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !rule) {
        return createErrorResponse(404, 'Rule not found');
      }

      const { data, error } = await supabaseAdmin
        .from('rules')
        .update(updates)
        .eq('id', ruleId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Database error updating rule:', error);
        return createErrorResponse(500, `Failed to update rule: ${error.message}`);
      }

      return createSuccessResponse({ rule: data });
    }

    // DELETE /api-v1-rules/:id - Delete rule
    if (req.method === 'DELETE' && pathParts.length === 2) {
      const ruleId = pathParts[1];

      // Verify ownership
      const { data: rule, error: fetchError } = await supabaseAdmin
        .from('rules')
        .select('id')
        .eq('id', ruleId)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !rule) {
        return createErrorResponse(404, 'Rule not found');
      }

      const { error } = await supabaseAdmin
        .from('rules')
        .delete()
        .eq('id', ruleId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Database error deleting rule:', error);
        return createErrorResponse(500, `Failed to delete rule: ${error.message}`);
      }

      return createSuccessResponse({ success: true });
    }

    return createErrorResponse(405, 'Method not allowed');
  } catch (error) {
    console.error('Request error:', error);
    return createErrorResponse(500, `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});
