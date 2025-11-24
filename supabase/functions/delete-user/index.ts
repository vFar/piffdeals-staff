// Supabase Edge Function to delete users
// This function requires the service role key to delete auth users
// Supports both single user deletion (self-deletion) and bulk deletion (admin only)
// 
// To deploy:
// 1. Install Supabase CLI: npm install -g supabase
// 2. Login: supabase login
// 3. Link project: supabase link --project-ref your-project-ref
// 4. Deploy: supabase functions deploy delete-user
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
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No authorization header',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
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

    // Verify the user's token and get their user ID
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: currentUser }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !currentUser) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid or expired token',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    // Get current user's profile to check role
    const { data: currentUserProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', currentUser.id)
      .maybeSingle();

    const isAdmin = currentUserProfile?.role === 'admin' || currentUserProfile?.role === 'super_admin';
    const isSuperAdmin = currentUserProfile?.role === 'super_admin';

    // Parse request body to get the user ID(s) to delete
    const { userId, userIds, password } = await req.json();

    // Determine if this is bulk deletion or single deletion
    const userIdsToDelete = userIds || (userId ? [userId] : []);

    // Validate input
    if (!userIdsToDelete || userIdsToDelete.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing userId or userIds',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Security checks
    if (userIdsToDelete.length === 1) {
      // Single user deletion - allow self-deletion or admin deletion
      const targetUserId = userIdsToDelete[0];
      
      if (currentUser.id !== targetUserId && !isAdmin) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'You can only delete your own account',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403,
          }
        );
      }

      // If self-deletion, verify password if provided
      if (currentUser.id === targetUserId && password) {
        try {
          const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
            email: currentUser.email!,
            password: password,
          });

          if (signInError) {
            return new Response(
              JSON.stringify({
                success: false,
                error: 'Invalid password',
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
              }
            );
          }
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Password verification failed',
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 401,
            }
          );
        }
      }
    } else {
      // Bulk deletion - only admins can do this
      if (!isAdmin) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Only administrators can delete multiple users',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403,
          }
        );
      }

      // Prevent deleting yourself in bulk operations
      if (userIdsToDelete.includes(currentUser.id)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'You cannot delete your own account in bulk operations',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403,
          }
        );
      }

      // Get target users' profiles to check permissions
      const { data: targetUsers, error: targetUsersError } = await supabaseAdmin
        .from('user_profiles')
        .select('id, role')
        .in('id', userIdsToDelete);

      if (targetUsersError) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to fetch target users',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }

      // Check permissions: admin can't delete other admins or super_admins
      if (isAdmin && !isSuperAdmin) {
        const hasHigherRoleUsers = targetUsers?.some(
          (u) => u.role === 'admin' || u.role === 'super_admin'
        );
        if (hasHigherRoleUsers) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Administrators cannot delete other administrators',
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 403,
            }
          );
        }
      }

      // Super admins can't delete other super admins
      if (isSuperAdmin) {
        const hasSuperAdminUsers = targetUsers?.some((u) => u.role === 'super_admin');
        if (hasSuperAdminUsers) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Cannot delete super admin accounts',
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 403,
            }
          );
        }
      }
    }

    // Delete users from auth (this will cascade delete profiles if ON DELETE CASCADE is set)
    const deletedUserIds: string[] = [];
    const errors: Array<{ userId: string; error: string }> = [];

    for (const userIdToDelete of userIdsToDelete) {
      try {
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);
        
        if (deleteError) {
          errors.push({
            userId: userIdToDelete,
            error: deleteError.message || 'Failed to delete user',
          });
        } else {
          deletedUserIds.push(userIdToDelete);
        }
      } catch (error) {
        errors.push({
          userId: userIdToDelete,
          error: error.message || 'Failed to delete user',
        });
      }
    }

    // Also explicitly delete from user_profiles table (in case cascade doesn't work)
    if (deletedUserIds.length > 0) {
      const { error: profileDeleteError } = await supabaseAdmin
        .from('user_profiles')
        .delete()
        .in('id', deletedUserIds);

      // Log but don't fail if profile deletion has issues (might already be deleted by cascade)
      if (profileDeleteError) {
        console.warn('Profile deletion warning:', profileDeleteError);
      }
    }

    // Return results
    if (errors.length > 0 && deletedUserIds.length === 0) {
      // All deletions failed
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to delete users',
          errors,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    } else if (errors.length > 0) {
      // Partial success
      return new Response(
        JSON.stringify({
          success: true,
          message: `Deleted ${deletedUserIds.length} user(s), ${errors.length} failed`,
          deletedUserIds,
          errors,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } else {
      // All successful
      return new Response(
        JSON.stringify({
          success: true,
          message: `Successfully deleted ${deletedUserIds.length} user(s)`,
          deletedUserIds,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

