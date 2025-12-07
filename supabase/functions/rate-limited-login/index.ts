// Rate-Limited Login Edge Function
// Handles login with IP-based rate limiting
// Blocks IP after 5 failed attempts for 15 minutes

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LoginRequest {
  email: string;
  password: string;
}

// Get client IP address from request
function getClientIP(req: Request): string {
  // Try various headers (for proxies, load balancers, etc.)
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // Fallback: try to extract from URL or use a default
  // In production, this should always be set by the proxy
  return 'unknown';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Create Supabase admin client (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Create Supabase client for auth (uses anon key)
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get client IP address
    const clientIP = getClientIP(req);

    // Check if IP is blocked
    const { data: isBlocked, error: blockCheckError } = await supabaseAdmin.rpc('is_ip_blocked', {
      check_ip: clientIP,
    });

    if (blockCheckError) {
      console.error('Error checking IP block status:', blockCheckError);
      // Continue with login attempt if we can't check
    } else if (isBlocked) {
      // Get blocked until time
      const { data: blockedUntil, error: blockedError } = await supabaseAdmin.rpc('get_ip_blocked_until', {
        check_ip: clientIP,
      });

      if (!blockedError && blockedUntil) {
        const blockedDate = new Date(blockedUntil);
        const now = new Date();
        const minutesLeft = Math.ceil((blockedDate.getTime() - now.getTime()) / 60000);

        return new Response(
          JSON.stringify({
            error: 'BLOCKED',
            message: `Bloķēts, mēģiniet vēlāk pēc ${minutesLeft} minūtēm!`,
            blocked_until: blockedUntil,
            minutes_remaining: minutesLeft,
          }),
          {
            status: 429, // Too Many Requests
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } else {
        return new Response(
          JSON.stringify({
            error: 'BLOCKED',
            message: 'Bloķēts, mēģiniet vēlāk pēc 15 minūtēm!',
          }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Parse request body
    const { email, password }: LoginRequest = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Missing email or password' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Attempt login
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });

    if (authError) {
      // Record failed login attempt
      try {
        await supabaseAdmin.rpc('record_failed_login_ip', {
          check_ip: clientIP,
          check_email: email.toLowerCase(),
        });
      } catch (recordError) {
        console.error('Error recording failed login:', recordError);
        // Continue even if recording fails
      }

      // Return auth error
      return new Response(
        JSON.stringify({
          error: authError.message || 'Invalid login credentials',
          code: authError.status || 400,
        }),
        {
          status: authError.status || 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Login successful - clear IP attempts
    try {
      await supabaseAdmin.rpc('clear_login_attempts_ip', {
        check_ip: clientIP,
      });
    } catch (clearError) {
      console.error('Error clearing login attempts:', clearError);
      // Non-critical error, continue
    }

    // Log successful login activity with IP address
    try {
      // Get user profile for logging
      const { data: userProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('username, email, role')
        .eq('id', authData.user.id)
        .maybeSingle();

      // Get user agent
      const userAgent = req.headers.get('user-agent') || null;

      // Log login activity with IP address
      await supabaseAdmin.rpc('log_activity', {
        p_user_id: authData.user.id,
        p_action_type: 'login',
        p_action_category: 'system',
        p_description: 'Pieteikšanās sistēmā',
        p_details: null,
        p_target_type: 'system',
        p_target_id: null,
        p_ip_address: clientIP,
        p_user_agent: userAgent,
      });
    } catch (logError) {
      console.error('Error logging login activity:', logError);
      // Non-critical error, continue
    }

    // Return success with session data
    return new Response(
      JSON.stringify({
        success: true,
        user: authData.user,
        session: authData.session,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Login function error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});








