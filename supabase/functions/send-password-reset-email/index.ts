// Send Password Reset Email Edge Function
// Sends password reset link to user via email
//
// To deploy:
// 1. Install Supabase CLI: npm install -g supabase
// 2. Login: supabase login
// 3. Link project: supabase link --project-ref your-project-ref
// 4. Deploy: supabase functions deploy send-password-reset-email
//
// Environment variables needed (set in Supabase Dashboard → Edge Functions → Secrets):
// - SUPABASE_SERVICE_ROLE_KEY
// - RESEND_API_KEY
// - FROM_EMAIL (optional, defaults to noreply@example.com)
// - COMPANY_NAME (optional, defaults to Piffdeals)
// - PUBLIC_SITE_URL (optional, defaults to http://localhost:5173)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PasswordResetEmailRequest {
  userEmail: string;
  userName: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    
    // Get Authorization header and apikey
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    const apikeyHeader = req.headers.get('apikey') || req.headers.get('Apikey');
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: No authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get environment variables
    const urlMatch = req.url.match(/https?:\/\/([^.]+)\.supabase\.co/);
    const projectRef = urlMatch ? urlMatch[1] : null;
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 
      (projectRef ? `https://${projectRef}.supabase.co` : null) ||
      Deno.env.get('SUPABASE_PROJECT_URL');
    
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || 
      Deno.env.get('ANON_KEY') ||
      Deno.env.get('SUPABASE_KEY') ||
      apikeyHeader;

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error: Missing Supabase credentials',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Extract token from Authorization header
    const token = authHeader.replace(/^Bearer\s+/i, '');
    
    // Create Supabase client
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: authHeader,
            apikey: supabaseAnonKey,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // Verify user authentication
    let user: any = null;
    let userError: any = null;
    
    try {
      const verifyResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          'Authorization': authHeader,
          'apikey': supabaseAnonKey,
        },
      });
      
      if (verifyResponse.ok) {
        const userData = await verifyResponse.json();
        user = userData;
      } else {
        const errorText = await verifyResponse.text();
        userError = new Error(`Token verification failed: ${verifyResponse.status}`);
      }
    } catch (apiError) {
      const getUserResult = await supabaseClient.auth.getUser();
      user = getUserResult.data?.user;
      userError = getUserResult.error;
      
      if (userError || !user) {
        const sessionResult = await supabaseClient.auth.getSession();
        if (sessionResult.data?.session?.user) {
          user = sessionResult.data.session.user;
          userError = null;
        }
      }
    }

    if (userError || !user) {
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized',
          message: userError?.message || 'Auth session missing!'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify user has admin or super_admin role
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !userProfile) {
      return new Response(
        JSON.stringify({ error: 'Failed to verify user permissions' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!['admin', 'super_admin'].includes(userProfile.role)) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const body: PasswordResetEmailRequest = await req.json();
    const { userEmail, userName } = body;

    if (!userEmail || !userName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create admin client to generate password reset token
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Cooldown disabled - allow immediate resends
    // (Cooldown check removed as requested)

    // Detect if we're in development mode
    // Check the Origin header from the request to determine if we should use localhost
    const origin = req.headers.get('Origin') || req.headers.get('origin') || '';
    const isDevelopment = origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('://localhost:');
    
    // Use localhost for dev, otherwise use PUBLIC_SITE_URL
    const publicSiteUrlEnv = Deno.env.get('PUBLIC_SITE_URL') || 'http://localhost:5173';
    const publicSiteUrl = isDevelopment || publicSiteUrlEnv.includes('localhost') || publicSiteUrlEnv.includes('127.0.0.1')
      ? 'http://localhost:5173'
      : publicSiteUrlEnv.replace(/\/$/, '');

    // Generate password reset token using admin API
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: userEmail,
      options: {
        redirectTo: `${publicSiteUrl}/reset-password`,
      },
    });

    if (resetError || !resetData) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate password reset link' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Use the action_link from Supabase, but replace the redirect URL with our reset-password page
    // The action_link contains the token and will automatically authenticate the correct user
    let resetPasswordUrl = '';
    
    try {
      // The action_link from Supabase looks like: https://project.supabase.co/auth/v1/verify?token=...&type=recovery&redirect_to=...
      // We need to extract the token and create our own URL that points to our reset-password page
      const actionLinkUrl = new URL(resetData.properties.action_link);
      
      // Get all the query parameters from the original link
      const token = actionLinkUrl.searchParams.get('token') || actionLinkUrl.searchParams.get('token_hash') || '';
      const type = actionLinkUrl.searchParams.get('type') || 'recovery';
      
      if (token) {
        // Create our reset password URL with the token
        // This ensures the token is for the correct user (the one specified by email in generateLink)
        resetPasswordUrl = `${publicSiteUrl}/reset-password?token=${encodeURIComponent(token)}&type=${type}`;
      } else {
        // Fallback: try to extract token from the URL string directly
        const tokenMatch = resetData.properties.action_link.match(/[?&](?:token|token_hash)=([^&]+)/);
        if (tokenMatch && tokenMatch[1]) {
          resetPasswordUrl = `${publicSiteUrl}/reset-password?token=${encodeURIComponent(tokenMatch[1])}&type=${type}`;
        } else {
          throw new Error('Could not extract token from reset link');
        }
      }
    } catch (urlError) {
      return new Response(
        JSON.stringify({ error: 'Failed to parse reset link' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate public image URLs
    // Ensure no trailing slash in base URL
    // Default to production domain if not set
    const finalSiteUrl = (Deno.env.get('PUBLIC_SITE_URL') || 'https://staff.piffdeals.lv').replace(/\/$/, '');
    
    // Warn if using localhost (Edge Functions can't access localhost)
    if (finalSiteUrl.includes('localhost') || finalSiteUrl.includes('127.0.0.1')) {
      // WARNING: PUBLIC_SITE_URL appears to be localhost. Edge Functions cannot access localhost URLs. Images may not load.
      // Consider setting PUBLIC_SITE_URL to https://staff.piffdeals.lv in Edge Function secrets
    }
    
    // Ensure HTTPS is used for production (unless explicitly localhost)
    const secureSiteUrl = finalSiteUrl.startsWith('http://localhost') 
      ? finalSiteUrl 
      : finalSiteUrl.replace(/^http:/, 'https:');
    
    const logoImageUrl = `${secureSiteUrl}/images/S-3.png`;
    const textLogoAccentUrl = `${secureSiteUrl}/images/piffdeals_text_accent.png`;
    const textLogoPrimaryUrl = `${secureSiteUrl}/images/piffdeals_text_primary.png`;
    
    // Fetch images and convert to base64 for embedding in email
    // This ensures images display in all email clients without requiring external access
    let logoBase64 = '';
    let textLogoAccentBase64 = '';
    let textLogoPrimaryBase64 = '';
    
    // Helper function to convert ArrayBuffer to base64
    const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    };
    
    // Helper function to fetch and convert PNG to base64
    const fetchPngAsBase64 = async (url: string, imageName: string): Promise<string> => {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'image/png,image/*,*/*',
          },
        });
        
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          const base64String = arrayBufferToBase64(buffer);
          const dataUri = `data:image/png;base64,${base64String}`;
          return dataUri;
        } else {
          // Failed to fetch image
        }
      } catch (error) {
        // Error fetching image
      }
      return '';
    };
    
    // Fetch all images in parallel
    const [logoBase64Result, textLogoAccentBase64Result, textLogoPrimaryBase64Result] = await Promise.all([
      fetchPngAsBase64(logoImageUrl, 'S-3.png'),
      fetchPngAsBase64(textLogoAccentUrl, 'piffdeals_text_accent.png'),
      fetchPngAsBase64(textLogoPrimaryUrl, 'piffdeals_text_primary.png'),
    ]);
    
    logoBase64 = logoBase64Result;
    textLogoAccentBase64 = textLogoAccentBase64Result;
    textLogoPrimaryBase64 = textLogoPrimaryBase64Result;
    
    // Use the HTTP URLs directly - these should work in emails
    const finalLogoUrl = logoImageUrl;
    const finalTextLogoAccentUrl = textLogoAccentUrl;
    const finalTextLogoPrimaryUrl = textLogoPrimaryUrl;
    
    // Ensure URLs are never empty and are valid
    if (!finalLogoUrl || finalLogoUrl.trim() === '' ||
        !finalTextLogoAccentUrl || finalTextLogoAccentUrl.trim() === '' ||
        !finalTextLogoPrimaryUrl || finalTextLogoPrimaryUrl.trim() === '') {
      throw new Error(`Image URLs are invalid: logo=${!!finalLogoUrl}, accent=${!!finalTextLogoAccentUrl}, primary=${!!finalTextLogoPrimaryUrl}`);
    }
    
    // Validate URLs are properly formatted
    if (!finalLogoUrl.startsWith('http://') && !finalLogoUrl.startsWith('https://')) {
      throw new Error(`Invalid logo URL format: ${finalLogoUrl}`);
    }
    if (!finalTextLogoAccentUrl.startsWith('http://') && !finalTextLogoAccentUrl.startsWith('https://')) {
      throw new Error(`Invalid accent URL format: ${finalTextLogoAccentUrl}`);
    }
    if (!finalTextLogoPrimaryUrl.startsWith('http://') && !finalTextLogoPrimaryUrl.startsWith('https://')) {
      throw new Error(`Invalid primary URL format: ${finalTextLogoPrimaryUrl}`);
    }
    
    // Quick test: Try to fetch the accent image to verify it's accessible
    try {
      const accentTestResponse = await fetch(finalTextLogoAccentUrl, { method: 'HEAD' });
      if (!accentTestResponse.ok) {
        // WARNING: Accent image may not be accessible
      }
    } catch (error) {
      // WARNING: Could not verify accent image accessibility
    }

    // Get email configuration
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@example.com';
    const COMPANY_NAME = Deno.env.get('COMPANY_NAME') || 'Piffdeals';

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Email HTML template
    const emailHtml = `
<!DOCTYPE html>
<html lang="lv">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Paroles maiņa - ${COMPANY_NAME}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #EBF3FF; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #EBF3FF; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0068FF 0%, #4F91ED 100%); padding: 32px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                      <tr>
                        <!-- Logo Image (S-3.png) -->
                        <td align="center" valign="middle" style="padding-right: 12px;">
                          <img src="${finalLogoUrl || 'https://staff.piffdeals.lv/images/S-3.png'}" alt="${COMPANY_NAME} Logo" width="40" height="40" style="width: 40px; height: 40px; display: block; border: none; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;" />
                        </td>
                        <!-- Text Logo Accent PNG -->
                        <td align="left" valign="middle">
                          <img src="${finalTextLogoAccentUrl || 'https://staff.piffdeals.lv/images/piffdeals_text_accent.png'}" alt="${COMPANY_NAME}" width="auto" height="24" style="height: 24px; width: auto; display: block; border: none; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;" />
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content Area -->
          <tr>
            <td style="padding: 40px; background-color: #ffffff;">
              
              <!-- Greeting -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding-bottom: 24px;">
                    <div style="font-size: 18px; font-weight: 600; color: #212B36; line-height: 1.5;">
                      Sveiki, ${userName}!
                    </div>
                  </td>
                </tr>
              </table>
              
              <!-- Main Message -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding-bottom: 32px;">
                    <div style="font-size: 16px; color: #637381; line-height: 1.6;">
                      Jūs saņēmāt šo e-pastu, jo administrators pieprasīja paroles maiņu jūsu kontam. Noklikšķiniet uz zemāk esošās pogas, lai izveidotu jaunu paroli.
                    </div>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <a href="${resetPasswordUrl}" 
                       style="display: inline-block; background-color: #0068FF; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; line-height: 1.5; text-align: center; box-shadow: 0 2px 4px rgba(0, 104, 255, 0.2);">
                      Mainīt paroli
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Alternative Link -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <div style="font-size: 13px; color: #637381; line-height: 1.6;">
                      Ja poga nedarbojas, nokopējiet un ielīmējiet šo saiti savā pārlūkprogrammā:<br>
                      <a href="${resetPasswordUrl}" style="color: #0068FF; text-decoration: underline; word-break: break-all;">${resetPasswordUrl}</a>
                    </div>
                  </td>
                </tr>
              </table>
              
              <!-- Security Notice -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding-top: 32px; border-top: 1px solid #e2e8f0;">
                    <div style="font-size: 14px; color: #637381; line-height: 1.6;">
                      <strong>Drošības paziņojums:</strong> Ja jūs nepieprasījāt paroles maiņu, lūdzu, ignorējiet šo e-pastu vai sazinieties ar administratoru.
                    </div>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 32px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <!-- Text Logo Primary PNG in Footer -->
                    <img src="${finalTextLogoPrimaryUrl || 'https://staff.piffdeals.lv/images/piffdeals_text_primary.png'}" alt="${COMPANY_NAME}" width="auto" height="24" style="height: 24px; width: auto; display: block; margin: 0 auto; opacity: 0.7; max-width: 180px; border: none; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;" />
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <div style="font-size: 12px; color: #9ca3af; line-height: 1.6;">
                      © ${new Date().getFullYear()} ${COMPANY_NAME}. Visas tiesības aizsargātas.<br>
                      <a href="https://www.piffdeals.lv" style="color: #0068FF; text-decoration: none; font-weight: 500;">www.piffdeals.lv</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Plain text version
    const emailText = `Sveiki, ${userName}!

Jūs saņēmāt šo e-pastu, jo administrators pieprasīja paroles maiņu jūsu kontam. Noklikšķiniet uz zemāk esošās saites, lai izveidotu jaunu paroli.

Mainīt paroli: ${resetPasswordUrl}

Drošības paziņojums: Ja jūs nepieprasījāt paroles maiņu, lūdzu, ignorējiet šo e-pastu vai sazinieties ar administratoru.

© ${new Date().getFullYear()} ${COMPANY_NAME}. Visas tiesības aizsargātas.
www.piffdeals.lv
    `.trim();

    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [userEmail],
        subject: `Paroles maiņa - ${COMPANY_NAME}`,
        html: emailHtml,
        text: emailText,
        reply_to: FROM_EMAIL.includes('info@') ? FROM_EMAIL : FROM_EMAIL.replace(/^[^@]+@/, 'info@'),
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: errorText };
      }
      
      return new Response(
        JSON.stringify({
          error: 'Failed to send email',
          message: errorData.message || errorData.error || `Resend API error: ${emailResponse.status}`,
          details: errorData,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const emailData = await emailResponse.json();

    // Update last_password_reset_sent timestamp
    await supabaseAdmin
      .from('user_profiles')
      .update({ last_password_reset_sent: new Date().toISOString() })
      .eq('email', userEmail.toLowerCase());

    // Get target user's profile for activity logging
    const { data: targetUserProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, username, role')
      .eq('email', userEmail.toLowerCase())
      .maybeSingle();

    // Get current user's profile for activity logging
    const { data: currentUserProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('email, username, role')
      .eq('id', user.id)
      .maybeSingle();

    // Log activity using RPC function (SECURITY DEFINER bypasses RLS)
    try {
      // Get IP address from request headers
      const ipAddress = req.headers.get('x-forwarded-for') || 
                       req.headers.get('x-real-ip') || 
                       req.headers.get('cf-connecting-ip') || 
                       null;
      
      // Get user agent
      const userAgent = req.headers.get('user-agent') || null;

      // Use RPC function to log activity (SECURITY DEFINER allows service role to log)
      const { error: logError } = await supabaseAdmin.rpc('log_activity', {
        p_user_id: user.id,
        p_action_type: 'password_reset_requested',
        p_action_category: 'security',
        p_description: `Nosūtīts paroles maiņas e-pasts lietotājam ${userName}`,
        p_details: JSON.stringify({
          sent_by_admin: true,
        }),
        p_target_type: 'user',
        p_target_id: targetUserProfile?.id || null,
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
      });
      
      if (logError) {
        // Try direct insert as fallback (service role should bypass RLS)
        try {
          await supabaseAdmin
            .from('activity_logs')
            .insert({
              user_id: user.id,
              user_email: currentUserProfile?.email || user.email,
              user_username: currentUserProfile?.username || user.user_metadata?.username,
              user_role: currentUserProfile?.role || 'admin',
              action_type: 'password_reset_requested',
              action_category: 'security',
              description: `Nosūtīts paroles maiņas e-pasts lietotājam ${userName}`,
              details: {
                sent_by_admin: true,
              },
              target_type: 'user',
              target_id: targetUserProfile?.id || null,
              ip_address: ipAddress,
              user_agent: userAgent,
            });
        } catch (directInsertError) {
          // Failed to log activity via direct insert
        }
      }
    } catch (logError) {
      // Don't fail the request if logging fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Password reset email sent successfully',
        emailId: emailData.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Failed to send email',
        message: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
