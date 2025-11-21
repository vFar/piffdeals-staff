// Send Invoice Email Edge Function
// Sends invoice link to customer via email

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvoiceEmailRequest {
  invoiceId: string;
  customerEmail: string;
  customerName: string;
  invoiceNumber: string;
  publicToken: string;
  total: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Debug: Log request headers
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
    // Get Authorization header and apikey
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    const apikeyHeader = req.headers.get('apikey') || req.headers.get('Apikey');
    
    console.log('Authorization header:', authHeader ? 'Present' : 'Missing');
    console.log('Apikey header:', apikeyHeader ? 'Present' : 'Missing');
    
    if (!authHeader) {
      console.error('No Authorization header found. Available headers:', Object.keys(Object.fromEntries(req.headers.entries())));
      return new Response(
        JSON.stringify({ error: 'Unauthorized: No authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get environment variables
    // Supabase provides these via environment or we can extract from request
    // Extract project ref from request URL: https://PROJECT_REF.supabase.co/...
    const urlMatch = req.url.match(/https?:\/\/([^.]+)\.supabase\.co/);
    const projectRef = urlMatch ? urlMatch[1] : null;
    
    // Try multiple ways to get Supabase URL
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 
      (projectRef ? `https://${projectRef}.supabase.co` : null) ||
      Deno.env.get('SUPABASE_PROJECT_URL');
    
    // Try multiple ways to get anon key
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || 
      Deno.env.get('ANON_KEY') ||
      Deno.env.get('SUPABASE_KEY') ||
      apikeyHeader; // Fallback to apikey from header if env var not set

    console.log('Environment check:', {
      projectRef,
      hasSupabaseUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
      supabaseUrl: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'missing',
      usingHeaderApikey: !Deno.env.get('SUPABASE_ANON_KEY') && !!apikeyHeader,
    });

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables', {
        projectRef,
        requestUrl: req.url,
        envVars: {
          SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
          SUPABASE_ANON_KEY: !!Deno.env.get('SUPABASE_ANON_KEY'),
          ANON_KEY: !!Deno.env.get('ANON_KEY'),
        }
      });
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error: Missing Supabase credentials',
          message: 'Please set SUPABASE_URL and SUPABASE_ANON_KEY in Edge Function secrets'
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
    // Based on Supabase community solutions, we need to verify the token works
    // Try direct API call to verify token first, then use client methods
    let user: any = null;
    let userError: any = null;
    
    try {
      // Method 1: Direct API call to verify token (most reliable for Edge Functions)
      const verifyResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          'Authorization': authHeader,
          'apikey': supabaseAnonKey,
        },
      });
      
      if (verifyResponse.ok) {
        const userData = await verifyResponse.json();
        user = userData;
        console.log('Token verification via direct API call succeeded');
      } else {
        const errorText = await verifyResponse.text();
        console.error('Token verification failed:', verifyResponse.status, errorText);
        userError = new Error(`Token verification failed: ${verifyResponse.status}`);
      }
    } catch (apiError) {
      console.error('Error in direct API verification, trying client methods...', apiError);
      
      // Method 2: Fallback to client getUser
      const getUserResult = await supabaseClient.auth.getUser();
      user = getUserResult.data?.user;
      userError = getUserResult.error;
      
      // Method 3: If getUser fails, try getSession
      if (userError || !user) {
        const sessionResult = await supabaseClient.auth.getSession();
        if (sessionResult.data?.session?.user) {
          user = sessionResult.data.session.user;
          userError = null;
          console.log('getSession succeeded as fallback');
        }
      }
    }

    if (userError || !user) {
      console.error('Authentication failed:', {
        error: userError?.message || 'Unknown error',
        errorCode: userError?.status || 'Unknown',
        errorStatus: userError?.status,
        hasUser: !!user,
        authHeaderPrefix: authHeader ? authHeader.substring(0, 30) : 'missing',
        supabaseUrl: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'missing',
        hasAnonKey: !!supabaseAnonKey,
      });
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

    console.log('User authenticated:', user.id);

    // Parse request body
    const body: InvoiceEmailRequest = await req.json();
    const { customerEmail, customerName, invoiceNumber, publicToken, total } = body;

    if (!customerEmail || !customerName || !invoiceNumber || !publicToken) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate public invoice URL and image URLs
    // Ensure no trailing slash in base URL
    const publicSiteUrl = (Deno.env.get('PUBLIC_SITE_URL') || 'http://localhost:5173').replace(/\/$/, '');
    const publicInvoiceUrl = `${publicSiteUrl}/i/${publicToken}`;
    const logoImageUrl = `${publicSiteUrl}/images/S-3.png`;
    const textLogoUrl = `${publicSiteUrl}/images/piffdeals_logo_text_primary.svg`;
    
    // Fetch images and convert to base64 for embedding in email
    // This ensures images display in all email clients without requiring external access
    let logoBase64 = '';
    let textLogoBase64 = '';
    
    // Helper function to convert ArrayBuffer to base64
    const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    };
    
    try {
      // Fetch logo image (S-3.png)
      const logoResponse = await fetch(logoImageUrl);
      if (logoResponse.ok) {
        const logoBuffer = await logoResponse.arrayBuffer();
        const logoBase64String = arrayBufferToBase64(logoBuffer);
        logoBase64 = `data:image/png;base64,${logoBase64String}`;
        console.log('Logo image fetched and converted to base64, size:', logoBase64String.length, 'chars');
      } else {
        console.warn('Failed to fetch logo image:', logoResponse.status, logoResponse.statusText);
      }
    } catch (error) {
      console.error('Error fetching logo image:', error);
    }
    
    try {
      // Fetch text logo SVG
      const textLogoResponse = await fetch(textLogoUrl);
      if (textLogoResponse.ok) {
        const textLogoSvg = await textLogoResponse.text();
        // SVG can be embedded as base64 (encode properly for UTF-8)
        const textLogoBase64String = btoa(unescape(encodeURIComponent(textLogoSvg)));
        textLogoBase64 = `data:image/svg+xml;base64,${textLogoBase64String}`;
        console.log('Text logo fetched and converted to base64, size:', textLogoBase64String.length, 'chars');
      } else {
        console.warn('Failed to fetch text logo:', textLogoResponse.status, textLogoResponse.statusText);
      }
    } catch (error) {
      console.error('Error fetching text logo:', error);
    }
    
    // Fallback to URLs if base64 conversion failed
    const finalLogoUrl = logoBase64 || logoImageUrl;
    const finalTextLogoUrl = textLogoBase64 || textLogoUrl;
    
    console.log('Image embedding status:', {
      logoEmbedded: !!logoBase64,
      textLogoEmbedded: !!textLogoBase64,
      usingFallbackUrls: !logoBase64 || !textLogoBase64,
    });

    // Send email using Resend (or your preferred email service)
    // You'll need to set RESEND_API_KEY in your Supabase Edge Function secrets
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@example.com';
    const COMPANY_NAME = Deno.env.get('COMPANY_NAME') || 'Piffdeals';

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not set');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Email HTML template - Piffdeals branded design with logos
    const emailHtml = `
<!DOCTYPE html>
<html lang="lv">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Rēķins ${invoiceNumber} - ${COMPANY_NAME}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #EBF3FF; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <!-- Wrapper Table -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #EBF3FF; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header with Piffdeals branding and logos (side by side) -->
          <tr>
            <td style="background: linear-gradient(135deg, #0068FF 0%, #4F91ED 100%); padding: 32px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 0;">
                    <!-- Logo and Text Side by Side -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                      <tr>
                        <!-- Logo Image (S-3.png) - Embedded as base64 -->
                        <td align="center" valign="middle" style="padding-right: 12px;">
                          <img src="${finalLogoUrl}" alt="${COMPANY_NAME} Logo" width="40" height="40" style="width: 40px; height: 40px; display: block; border: none; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;" />
                        </td>
                        <!-- Text Logo SVG - Embedded as base64 -->
                        <td align="left" valign="middle">
                          <img src="${finalTextLogoUrl}" alt="${COMPANY_NAME}" width="auto" height="24" style="height: 24px; width: auto; display: block; border: none; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;" />
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
                      Sveiki, ${customerName}!
                    </div>
                  </td>
                </tr>
              </table>
              
              <!-- Main Message -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding-bottom: 32px;">
                    <div style="font-size: 16px; color: #637381; line-height: 1.6;">
                      Jums ir jauns rēķins. Šeit ir saite, lai to apskatītu un apmaksātu.
                    </div>
                  </td>
                </tr>
              </table>
              
              <!-- Invoice Details Card -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #EBF3FF; border-radius: 8px; margin-bottom: 32px;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <div style="font-size: 12px; font-weight: 600; color: #637381; text-transform: uppercase; letter-spacing: 0.5px;">
                            Rēķina numurs
                          </div>
                        </td>
                        <td align="right" style="padding-bottom: 12px;">
                          <div style="font-size: 16px; font-weight: 600; color: #212B36;">
                            ${invoiceNumber}
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <div style="font-size: 12px; font-weight: 600; color: #637381; text-transform: uppercase; letter-spacing: 0.5px;">
                            Kopējā summa
                          </div>
                        </td>
                        <td align="right">
                          <div style="font-size: 24px; font-weight: 700; color: #0068FF; line-height: 1.2;">
                            €${Number(total).toFixed(2)}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <a href="${publicInvoiceUrl}" 
                       style="display: inline-block; background-color: #0068FF; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; line-height: 1.5; text-align: center; box-shadow: 0 2px 4px rgba(0, 104, 255, 0.2);">
                      Skatīt rēķinu
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
                      <a href="${publicInvoiceUrl}" style="color: #0068FF; text-decoration: underline; word-break: break-all;">${publicInvoiceUrl}</a>
                    </div>
                  </td>
                </tr>
              </table>
              
              <!-- Footer Message -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding-top: 32px; border-top: 1px solid #e2e8f0;">
                    <div style="font-size: 14px; color: #637381; line-height: 1.6;">
                      Ja jums ir kādi jautājumi, lūdzu, nevilcinieties ar mums sazināties.<br>
                      Paldies par sadarbību!
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
                    <!-- Text Logo in Footer - Embedded as base64 -->
                    <img src="${finalTextLogoUrl}" alt="${COMPANY_NAME}" width="auto" height="24" style="height: 24px; width: auto; display: block; margin: 0 auto; opacity: 0.7; max-width: 180px; border: none; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;" />
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

    // Plain text version for better deliverability
    const emailText = `Sveiki, ${customerName}!

Jums ir jauns rēķins. Šeit ir saite, lai to apskatītu un apmaksātu.

Rēķina numurs: ${invoiceNumber}
Kopējā summa: €${Number(total).toFixed(2)}

Skatīt rēķinu: ${publicInvoiceUrl}

Ja jums ir kādi jautājumi, lūdzu, nevilcinieties ar mums sazināties.
Paldies par sadarbību!

Tiesības: copyright ${new Date().getFullYear()} ${COMPANY_NAME}. Visas tiesības aizsargātas.
www.piffdeals.lv
    `.trim();

    // Send email via Resend with spam prevention best practices
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [customerEmail],
        subject: `Jauns rēķins ${invoiceNumber} - ${COMPANY_NAME}`,
        html: emailHtml,
        text: emailText, // Plain text version for better deliverability
        // Reply-To header for better deliverability (use info@ if FROM is different)
        reply_to: FROM_EMAIL.includes('info@') ? FROM_EMAIL : FROM_EMAIL.replace(/^[^@]+@/, 'info@'),
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      console.error('Resend API error:', error);
      throw new Error(`Failed to send email: ${error}`);
    }

    const emailData = await emailResponse.json();
    console.log('Email sent successfully:', emailData);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        emailId: emailData.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error sending invoice email:', error);
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




