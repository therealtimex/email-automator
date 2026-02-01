import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { handleCors, createErrorResponse, createSuccessResponse } from '../_shared/cors.ts';
import { verifyUser } from '../_shared/auth.ts';

/**
 * Drafts API - Draft Review Center
 *
 * GET    /api-v1-drafts              - List all pending drafts
 * GET    /api-v1-drafts/stats        - Draft analytics
 * POST   /api-v1-drafts/:id/send     - Send a draft via provider API
 * POST   /api-v1-drafts/:id/dismiss  - Mark draft as dismissed
 * POST   /api-v1-drafts/:id/regenerate - Regenerate draft with new instructions
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

        // GET /api-v1-drafts/stats - Draft analytics
        if (req.method === 'GET' && pathParts[1] === 'stats') {
            // Get total pending drafts
            const { count: pendingCount } = await supabaseAdmin
                .from('emails')
                .select('id', { count: 'exact', head: true })
                .eq('draft_status', 'pending')
                .not('draft_id', 'is', null)
                .in('account_id',
                    supabaseAdmin
                        .from('email_accounts')
                        .select('id')
                        .eq('user_id', user.id)
                );

            // Get total sent drafts
            const { count: sentCount } = await supabaseAdmin
                .from('emails')
                .select('id', { count: 'exact', head: true })
                .eq('draft_status', 'sent')
                .not('draft_id', 'is', null)
                .in('account_id',
                    supabaseAdmin
                        .from('email_accounts')
                        .select('id')
                        .eq('user_id', user.id)
                );

            // Get total dismissed drafts
            const { count: dismissedCount } = await supabaseAdmin
                .from('emails')
                .select('id', { count: 'exact', head: true })
                .eq('draft_status', 'dismissed')
                .not('draft_id', 'is', null)
                .in('account_id',
                    supabaseAdmin
                        .from('email_accounts')
                        .select('id')
                        .eq('user_id', user.id)
                );

            // Calculate time saved (assuming 5 minutes per email)
            const timeSavedMinutes = (sentCount || 0) * 5;

            return createSuccessResponse({
                pending: pendingCount || 0,
                sent: sentCount || 0,
                dismissed: dismissedCount || 0,
                timeSavedMinutes,
            });
        }

        // GET /api-v1-drafts - List all pending drafts
        if (req.method === 'GET' && pathParts.length === 1) {
            const limit = parseInt(url.searchParams.get('limit') || '50');
            const offset = parseInt(url.searchParams.get('offset') || '0');
            const account_id = url.searchParams.get('account_id');
            const status = url.searchParams.get('status') || 'pending';

            let query = supabaseAdmin
                .from('emails')
                .select(`
          *,
          email_accounts!inner(id, user_id, email_address, provider)
        `, { count: 'exact' })
                .eq('email_accounts.user_id', user.id)
                .eq('draft_status', status)
                .not('draft_id', 'is', null)
                .order('draft_created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            // Filter by account if specified
            if (account_id) {
                query = query.eq('account_id', account_id);
            }

            const { data, error, count } = await query;

            if (error) {
                console.error('Database error:', error);
                return createErrorResponse(500, 'Failed to fetch drafts');
            }

            return createSuccessResponse({
                drafts: data || [],
                total: count || 0,
                limit,
                offset,
            });
        }

        // POST /api-v1-drafts/:id/send - Send a draft
        if (req.method === 'POST' && pathParts.length === 3 && pathParts[2] === 'send') {
            const emailId = pathParts[1];

            // Get email with draft
            const { data: email, error: fetchError } = await supabaseAdmin
                .from('emails')
                .select(`
          *,
          email_accounts!inner(id, user_id, email_address, provider, access_token, refresh_token, token_expires_at, scopes)
        `)
                .eq('id', emailId)
                .eq('email_accounts.user_id', user.id)
                .eq('draft_status', 'pending')
                .not('draft_id', 'is', null)
                .single();

            if (fetchError || !email) {
                return createErrorResponse(404, 'Draft not found or already processed');
            }

            const account = email.email_accounts;
            const draftId = email.draft_id;

            if (!draftId) {
                return createErrorResponse(400, 'Draft ID not found');
            }

            try {
                // Send draft via provider API
                if (account.provider === 'gmail') {
                    // Gmail: Send draft using Gmail API
                    const { google } = await import('npm:googleapis@140');

                    const oauth2Client = new google.auth.OAuth2();
                    oauth2Client.setCredentials({
                        access_token: account.access_token,
                        refresh_token: account.refresh_token,
                    });

                    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

                    await gmail.users.drafts.send({
                        userId: 'me',
                        requestBody: {
                            id: draftId,
                        },
                    });

                    console.log('Gmail draft sent successfully', { draftId });
                } else if (account.provider === 'outlook') {
                    // Outlook: Send draft using Microsoft Graph API
                    const response = await fetch(
                        `https://graph.microsoft.com/v1.0/me/messages/${draftId}/send`,
                        {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${account.access_token}`,
                            },
                        }
                    );

                    if (!response.ok) {
                        const error = await response.text();
                        console.error('Failed to send Outlook draft:', error);
                        throw new Error('Failed to send Outlook draft');
                    }

                    console.log('Outlook draft sent successfully', { draftId });
                } else {
                    return createErrorResponse(400, `Unsupported provider: ${account.provider}`);
                }

                // Update draft status in database
                const { error: updateError } = await supabaseAdmin
                    .from('emails')
                    .update({
                        draft_status: 'sent',
                        draft_sent_at: new Date().toISOString(),
                    })
                    .eq('id', emailId);

                if (updateError) {
                    console.error('Database error:', updateError);
                    return createErrorResponse(500, 'Failed to update draft status');
                }

                return createSuccessResponse({
                    success: true,
                    message: 'Draft sent successfully',
                });
            } catch (error) {
                console.error('Error sending draft:', error);
                return createErrorResponse(500, error instanceof Error ? error.message : 'Failed to send draft');
            }
        }

        // POST /api-v1-drafts/:id/dismiss - Dismiss a draft
        if (req.method === 'POST' && pathParts.length === 3 && pathParts[2] === 'dismiss') {
            const emailId = pathParts[1];

            // Verify ownership
            const { data: email } = await supabaseAdmin
                .from('emails')
                .select('id, email_accounts!inner(user_id)')
                .eq('id', emailId)
                .eq('email_accounts.user_id', user.id)
                .single();

            if (!email) {
                return createErrorResponse(404, 'Draft not found');
            }

            // Update draft status
            const { error } = await supabaseAdmin
                .from('emails')
                .update({
                    draft_status: 'dismissed',
                    draft_dismissed_at: new Date().toISOString(),
                })
                .eq('id', emailId);

            if (error) {
                console.error('Database error:', error);
                return createErrorResponse(500, 'Failed to dismiss draft');
            }

            return createSuccessResponse({
                success: true,
                message: 'Draft dismissed',
            });
        }

        // POST /api-v1-drafts/:id/regenerate - Regenerate draft
        if (req.method === 'POST' && pathParts.length === 3 && pathParts[2] === 'regenerate') {
            const emailId = pathParts[1];
            const body = await req.json();
            const { instructions } = body;

            if (!instructions) {
                return createErrorResponse(400, 'Instructions are required');
            }

            // Verify ownership
            const { data: email } = await supabaseAdmin
                .from('emails')
                .select('id, email_accounts!inner(user_id)')
                .eq('id', emailId)
                .eq('email_accounts.user_id', user.id)
                .single();

            if (!email) {
                return createErrorResponse(404, 'Draft not found');
            }

            // TODO: Call AI service to regenerate draft with new instructions
            // This will be implemented in Phase 3

            return createSuccessResponse({
                success: true,
                message: 'Draft regeneration queued',
            });
        }

        return createErrorResponse(405, 'Method not allowed');
    } catch (error) {
        console.error('Request error:', error);
        return createErrorResponse(500, 'Internal server error');
    }
});
