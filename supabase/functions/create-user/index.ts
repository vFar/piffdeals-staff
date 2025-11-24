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
    let creatorProfile: any = null;
    
    try {
      // Verify the token and get the user using admin client
      const { data: { user: creatorUser }, error: userError } = await supabaseAdmin.auth.getUser(token);
      if (!userError && creatorUser) {
        createdBy = creatorUser.id;
        
        // Get creator's profile to verify role permissions
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .select('role')
          .eq('id', createdBy)
          .maybeSingle();
        
        if (!profileError && profile) {
          creatorProfile = profile;
        }
      }
    } catch (error) {
      // If we can't verify the user, continue without created_by
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

    // Check for duplicate email in user_profiles
    const normalizedEmail = email.toLowerCase().trim();
    const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
      .from('user_profiles')
      .select('email')
      .eq('email', normalizedEmail)
      .limit(1);

    if (profileCheckError) {
      throw new Error('Error checking for existing user');
    }

    if (existingProfile && existingProfile.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'User with this email already exists',
          errorCode: 'DUPLICATE_EMAIL',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409, // Conflict status code
        }
      );
    }

    // Note: We also check for duplicate emails in auth.users by catching errors
    // from Supabase Auth when creating the user (see error handling below)

    // SECURITY: Verify user permissions - check creator's role
    if (!creatorProfile) {
      // If creator can't be verified, only allow creating employees (safety fallback)
      if (role !== 'employee') {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Unauthorized: Cannot create non-employee accounts without proper verification',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403,
          }
        );
      }
    } else {
      // SECURITY: Role-based permission check - enforce server-side
      // Admins can only create employees, super_admins can create any role
      if (creatorProfile.role === 'admin' && role !== 'employee') {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Forbidden: Administrators can only create employee accounts',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403,
          }
        );
      }
      
      if (creatorProfile.role === 'employee') {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Forbidden: Employees cannot create user accounts',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403,
          }
        );
      }
    }

    // Step 1: Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        username,
      },
    });

    if (authError) {
      // Check if error is due to duplicate email
      const errorMessage = authError.message || '';
      if (
        errorMessage.includes('already registered') ||
        errorMessage.includes('already exists') ||
        errorMessage.includes('User already registered') ||
        errorMessage.includes('duplicate') ||
        authError.status === 422
      ) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'User with this email already exists',
            errorCode: 'DUPLICATE_EMAIL',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 409, // Conflict status code
          }
        );
      }
      throw authError;
    }

    const userId = authData.user.id;

    // Step 2: Create user profile with created_by tracking
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: userId,
        email: normalizedEmail,
        username,
        role,
        status,
        created_by: createdBy || null,
      });

    if (profileError) {
      // If profile creation fails, clean up auth user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      
      // Check if error is due to duplicate email (unique constraint violation)
      const errorMessage = profileError.message || '';
      if (
        errorMessage.includes('duplicate') ||
        errorMessage.includes('unique') ||
        errorMessage.includes('already exists') ||
        profileError.code === '23505' // PostgreSQL unique violation error code
      ) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'User with this email already exists',
            errorCode: 'DUPLICATE_EMAIL',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 409, // Conflict status code
          }
        );
      }
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
    // Check if error is due to duplicate email
    const errorMessage = error.message || '';
    if (
      errorMessage.includes('already registered') ||
      errorMessage.includes('already exists') ||
      errorMessage.includes('duplicate') ||
      errorMessage.includes('unique')
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'User with this email already exists',
          errorCode: 'DUPLICATE_EMAIL',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409, // Conflict status code
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An error occurred while creating the user',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});


