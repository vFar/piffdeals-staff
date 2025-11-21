// Supabase Edge Function to create users
// This function requires the service role key to create auth users
// 
// To deploy:
// 1. Install Supabase CLI: npm install -g supabase
// 2. Login: supabase login
// 3. Link project: supabase link --project-ref your-project-ref
// 4. Deploy: supabase functions deploy create-user
//
// Environment variables needed:
// - SUPABASE_SERVICE_ROLE_KEY (set in Supabase dashboard)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create Supabase client with service role key (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Extract user ID from auth token to track who created this user
    const token = authHeader.replace('Bearer ', '');
    let createdBy = null;
    
    try {
      // Verify the token and get the user using admin client
      const { data: { user: creatorUser }, error: userError } = await supabaseAdmin.auth.getUser(token);
      if (!userError && creatorUser) {
        createdBy = creatorUser.id;
      }
    } catch (error) {
      // If we can't verify the user, continue without created_by
      console.warn('Could not verify creator user:', error);
    }

    // Parse request body
    const { email, password, username, role, status } = await req.json();

    // Validate input
    if (!email || !password || !username || !role || !status) {
      throw new Error('Missing required fields');
    }

    // Validate role
    if (!['employee', 'admin', 'super_admin'].includes(role)) {
      throw new Error('Invalid role');
    }

    // Validate status
    if (!['active', 'inactive', 'suspended'].includes(status)) {
      throw new Error('Invalid status');
    }

    // Step 1: Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        username,
      },
    });

    if (authError) {
      throw authError;
    }

    const userId = authData.user.id;

    // Step 2: Create user profile with created_by tracking
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: userId,
        email,
        username,
        role,
        status,
        created_by: createdBy || null,
      });

    if (profileError) {
      // If profile creation fails, clean up auth user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw profileError;
    }

    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        userId,
        message: 'User created successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating user:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});


