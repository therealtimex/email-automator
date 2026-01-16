import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { corsHeaders, createErrorResponse } from "../_shared/cors.ts";

async function createFirstUser(req: Request) {
    try {
        const { email, password, first_name, last_name } = await req.json();

        // Check if any users exist
        const { count, error: countError } = await supabaseAdmin
            .from("profiles")
            .select("*", { count: "exact", head: true });

        if (countError) {
            console.error("Error checking profiles:", countError);
            return createErrorResponse(500, "Database error checking profiles");
        }

        if (count && count > 0) {
            return createErrorResponse(403, "First user already exists");
        }

        // Create user with admin API (bypasses signup restrictions)
        const { data, error: userError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm first user
            user_metadata: { first_name, last_name },
        });

        if (userError || !data?.user) {
            console.error("Error creating first user:", userError);
            return createErrorResponse(500, `Failed to create first user: ${userError?.message}`);
        }

        // Explicitly create profile as admin (trigger may not fire with admin.createUser in some configs)
        // Use upsert to handle case where trigger did fire
        const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .upsert({
                id: data.user.id,
                email: data.user.email,
                first_name: first_name || null,
                last_name: last_name || null,
                is_admin: true, // First user is always admin
            }, { onConflict: 'id' });

        if (profileError) {
            console.error("Error creating profile:", profileError);
            // Profile creation failed - this is critical for is_initialized
            return createErrorResponse(500, `User created but profile failed: ${profileError.message}`);
        }

        // Verify the profile was created
        const { count: profileCount } = await supabaseAdmin
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("id", data.user.id);

        console.log("Profile verification - count:", profileCount);

        return new Response(
            JSON.stringify({
                data: {
                    id: data.user.id,
                    email: data.user.email,
                },
            }),
            {
                headers: { "Content-Type": "application/json", ...corsHeaders },
            },
        );
    } catch (error) {
        console.error("Unexpected error in createFirstUser:", error);
        return createErrorResponse(500, `Internal Server Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: corsHeaders,
        });
    }

    if (req.method === "POST") {
        return createFirstUser(req);
    }

    return createErrorResponse(405, "Method Not Allowed");
});
