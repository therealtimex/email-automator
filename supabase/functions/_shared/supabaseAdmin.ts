import { createClient } from 'jsr:@supabase/supabase-js@2';

// Create a Supabase client with the service role key
// This client bypasses Row Level Security (RLS)
export const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
