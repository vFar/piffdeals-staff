// Activity Log Edge Function
// Captures IP address from request headers and logs activity
// This ensures all activity logs from frontend have IP addresses

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get client IP address from request headers
function getClientIP(req: Request): string | null {
  // Try various headers (for proxies, load balancers, Cloudflare, etc.)
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  const cfIP = req.headers.get('cf-connecting-ip');
  if (cfIP) {
    return cfIP;
  }
  
  return null;
}

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
        JSON.stringify({ success: false, error: 'No authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

    // Verify the user from the token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const {
      actionType,
      actionCategory,
      description,
      details = null,
      targetType = null,
      targetId = null,
    } = await req.json();

    // Validate required fields
    if (!actionType || !actionCategory || !description) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: actionType, actionCategory, description' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get IP address from request headers
    const ipAddress = getClientIP(req);
    
    // Get user agent
    const userAgent = req.headers.get('user-agent') || null;

    // Call the log_activity RPC function with IP address
    const { data, error } = await supabaseAdmin.rpc('log_activity', {
      p_user_id: user.id,
      p_action_type: actionType,
      p_action_category: actionCategory,
      p_description: description,
      p_details: details ? JSON.stringify(details) : null,
      p_target_type: targetType,
      p_target_id: targetId,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
    });

    if (error) {
      console.error('[LogActivity] RPC call failed:', error);
      
      // Try direct insert as fallback
      try {
        // Get user profile for logging
        const { data: userProfile } = await supabaseAdmin
          .from('user_profiles')
          .select('username, email, role')
          .eq('id', user.id)
          .maybeSingle();

        const { data: insertData, error: insertError } = await supabaseAdmin
          .from('activity_logs')
          .insert({
            user_id: user.id,
            user_username: userProfile?.username || user.user_metadata?.username || 'Unknown',
            user_email: userProfile?.email || user.email || 'unknown@example.com',
            user_role: userProfile?.role || 'employee',
            action_type: actionType,
            action_category: actionCategory,
            description: description,
            details: details,
            target_type: targetType,
            target_id: targetId,
            ip_address: ipAddress,
            user_agent: userAgent,
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('[LogActivity] Direct insert also failed:', insertError);
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to log activity' }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        return new Response(
          JSON.stringify({ success: true, logId: insertData.id }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } catch (fallbackError) {
        console.error('[LogActivity] Fallback insert exception:', fallbackError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to log activity' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, logId: data }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[LogActivity] Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'An error occurred' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

