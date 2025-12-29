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

    if (!supabaseUrl || !supabaseAnonKey) {
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
      } else {
        const errorText = await verifyResponse.text();
        userError = new Error(`Token verification failed: ${verifyResponse.status}`);
      }
    } catch (apiError) {
      
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

    // Parse request body
    const body: InvoiceEmailRequest = await req.json();
    const { invoiceId, customerEmail, customerName, invoiceNumber, publicToken, total } = body;

    if (!invoiceId || !customerEmail || !customerName || !invoiceNumber || !publicToken) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // SECURITY: Verify invoice ownership - only creator can send emails
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from('invoices')
      .select('id, user_id, status, public_token, customer_email, last_invoice_email_sent, stripe_payment_link')
      .eq('id', invoiceId)
      .maybeSingle();

    if (invoiceError || !invoice) {
      return new Response(
        JSON.stringify({ error: 'Invoice not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify invoice belongs to requesting user (only creator can send)
    if (invoice.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: You can only send emails for your own invoices' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // SECURITY: Rate limiting - prevent email spam (10 minutes cooldown)
    if (invoice.last_invoice_email_sent) {
      const lastSent = new Date(invoice.last_invoice_email_sent);
      const now = new Date();
      const minutesSinceLastSent = (now.getTime() - lastSent.getTime()) / (1000 * 60);
      
      if (minutesSinceLastSent < 10) {
        const remainingMinutes = Math.ceil(10 - minutesSinceLastSent);
        return new Response(
          JSON.stringify({ 
            error: 'Cooldown active',
            message: `Please wait ${remainingMinutes} minute(s) before sending another email for this invoice.`,
            cooldownRemaining: remainingMinutes * 60, // seconds
          }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Verify public token matches
    if (invoice.public_token !== publicToken) {
      return new Response(
        JSON.stringify({ error: 'Invalid public token' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify customer email matches (prevents sending to wrong email)
    if (invoice.customer_email && invoice.customer_email.toLowerCase() !== customerEmail.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: 'Customer email mismatch' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate public invoice URL and image URLs
    // Ensure no trailing slash in base URL
    // Default to production domain if not set
    const publicSiteUrl = (Deno.env.get('PUBLIC_SITE_URL') || 'https://staff.piffdeals.lv').replace(/\/$/, '');
    
    // Warn if using localhost (Edge Functions can't access localhost)
    if (publicSiteUrl.includes('localhost') || publicSiteUrl.includes('127.0.0.1')) {
      // WARNING: PUBLIC_SITE_URL appears to be localhost. Edge Functions cannot access localhost URLs. Images may not load.
      // Consider setting PUBLIC_SITE_URL to https://staff.piffdeals.lv in Edge Function secrets
    }
    
    // Ensure HTTPS is used for production (unless explicitly localhost)
    const finalSiteUrl = publicSiteUrl.startsWith('http://localhost') 
      ? publicSiteUrl 
      : publicSiteUrl.replace(/^http:/, 'https:');
    
    const publicInvoiceUrl = `${finalSiteUrl}/i/${publicToken}`;
    const logoImageUrl = `${finalSiteUrl}/images/S-3.png`;
    const textLogoAccentUrl = `${finalSiteUrl}/images/piffdeals_text_accent.png`;
    const textLogoPrimaryUrl = `${finalSiteUrl}/images/piffdeals_text_primary.png`;
    
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
    
    // Fallback to URLs if base64 conversion failed
    // Ensure we always have a valid URL (never empty string)
    // Use base64 if available and valid, otherwise fall back to URL
    const finalLogoUrl = (logoBase64 && logoBase64.length > 0 && logoBase64.startsWith('data:image')) 
      ? logoBase64 
      : (logoImageUrl || 'https://via.placeholder.com/40');
    
    const finalTextLogoAccentUrl = (textLogoAccentBase64 && textLogoAccentBase64.length > 0 && textLogoAccentBase64.startsWith('data:image'))
      ? textLogoAccentBase64
      : (textLogoAccentUrl || 'https://via.placeholder.com/180x24');
    
    const finalTextLogoPrimaryUrl = (textLogoPrimaryBase64 && textLogoPrimaryBase64.length > 0 && textLogoPrimaryBase64.startsWith('data:image'))
      ? textLogoPrimaryBase64
      : (textLogoPrimaryUrl || 'https://via.placeholder.com/180x24');
    
    // Validate URLs are not empty - this should never happen now, but log if it does
    if (!finalLogoUrl || finalLogoUrl.trim() === '' || 
        !finalTextLogoAccentUrl || finalTextLogoAccentUrl.trim() === '' ||
        !finalTextLogoPrimaryUrl || finalTextLogoPrimaryUrl.trim() === '') {
      // CRITICAL: One or more image URLs are empty after fallback!
    }
    
    // Force use of HTTP URLs instead of data URIs (some email clients strip data URIs)
    // Data URIs can be blocked by email security filters
    // Use base64 only if explicitly needed, otherwise prefer HTTP URLs
    const useBase64 = false; // Set to true to use base64, false to use URLs
    
    // Use the HTTP URLs directly - these should work in emails
    const finalLogoUrlForEmail = logoImageUrl;
    const finalTextLogoAccentUrlForEmail = textLogoAccentUrl;
    const finalTextLogoPrimaryUrlForEmail = textLogoPrimaryUrl;
    
    // Ensure URLs are never empty and are valid
    if (!finalLogoUrlForEmail || finalLogoUrlForEmail.trim() === '' ||
        !finalTextLogoAccentUrlForEmail || finalTextLogoAccentUrlForEmail.trim() === '' ||
        !finalTextLogoPrimaryUrlForEmail || finalTextLogoPrimaryUrlForEmail.trim() === '') {
      throw new Error(`Image URLs are invalid: logo=${!!finalLogoUrlForEmail}, accent=${!!finalTextLogoAccentUrlForEmail}, primary=${!!finalTextLogoPrimaryUrlForEmail}`);
    }
    
    // Validate URLs are properly formatted
    if (!finalLogoUrlForEmail.startsWith('http://') && !finalLogoUrlForEmail.startsWith('https://')) {
      throw new Error(`Invalid logo URL format: ${finalLogoUrlForEmail}`);
    }
    if (!finalTextLogoAccentUrlForEmail.startsWith('http://') && !finalTextLogoAccentUrlForEmail.startsWith('https://')) {
      throw new Error(`Invalid accent URL format: ${finalTextLogoAccentUrlForEmail}`);
    }
    if (!finalTextLogoPrimaryUrlForEmail.startsWith('http://') && !finalTextLogoPrimaryUrlForEmail.startsWith('https://')) {
      throw new Error(`Invalid primary URL format: ${finalTextLogoPrimaryUrlForEmail}`);
    }
    
    // Quick test: Try to fetch the accent image to verify it's accessible
    try {
      const accentTestResponse = await fetch(finalTextLogoAccentUrlForEmail, { method: 'HEAD' });
      if (!accentTestResponse.ok) {
        // WARNING: Accent image may not be accessible
      }
    } catch (error) {
      // WARNING: Could not verify accent image accessibility
    }

    // Build CTA buttons HTML based on whether payment link exists
    const hasPaymentLink = invoice.stripe_payment_link && invoice.stripe_payment_link.trim() !== '';
    let ctaButtonsHtml = '';
    let paymentDisclaimerHtml = '';
    
    if (hasPaymentLink) {
      ctaButtonsHtml = `
        <!-- Payment Button (Primary) -->
        <a href="${invoice.stripe_payment_link}" 
           style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; line-height: 1.5; text-align: center; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2); margin-bottom: 12px;">
          Apmaksāt rēķinu šeit
        </a>
        <br>
        <!-- View Invoice Button (Secondary) -->
        <a href="${publicInvoiceUrl}" 
           style="display: inline-block; background-color: #0068FF; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-weight: 600; font-size: 15px; line-height: 1.5; text-align: center; box-shadow: 0 2px 4px rgba(0, 104, 255, 0.2);">
          Skatīt rēķinu
        </a>
      `;
      paymentDisclaimerHtml = `
        <!-- Payment Disclaimer -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <div style="font-size: 13px; color: #637381; line-height: 1.6; background-color: #f0f9ff; padding: 12px 16px; border-radius: 6px; border-left: 3px solid #10b981; max-width: 500px; margin: 0 auto;">
                <strong style="color: #10b981;">💳 Apmaksa:</strong> Izmantojiet pogu "Apmaksāt rēķinu šeit" augšā, lai veiktu maksājumu tieši no šī e-pasta. Alternatīvi, varat skatīt rēķinu un apmaksāt to vēlāk.
              </div>
            </td>
          </tr>
        </table>
      `;
    } else {
      ctaButtonsHtml = `
        <!-- View Invoice Button (Only) -->
        <a href="${publicInvoiceUrl}" 
           style="display: inline-block; background-color: #0068FF; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; line-height: 1.5; text-align: center; box-shadow: 0 2px 4px rgba(0, 104, 255, 0.2);">
          Skatīt rēķinu
        </a>
      `;
    }

    // Send email using Resend (or your preferred email service)
    // You'll need to set RESEND_API_KEY in your Supabase Edge Function secrets
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
                        <!-- Logo Image (S-3.png) -->
                        <td align="center" valign="middle" style="padding-right: 12px;">
                          <img src="${finalLogoUrlForEmail || 'https://staff.piffdeals.lv/images/S-3.png'}" alt="${COMPANY_NAME} Logo" width="40" height="40" style="width: 40px; height: 40px; display: block; border: none; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;" />
                        </td>
                        <!-- Text Logo Accent PNG -->
                        <td align="left" valign="middle">
                          <img src="${finalTextLogoAccentUrlForEmail || 'https://staff.piffdeals.lv/images/piffdeals_text_accent.png'}" alt="${COMPANY_NAME}" width="auto" height="24" style="height: 24px; width: auto; display: block; border: none; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;" />
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
              
              <!-- CTA Buttons -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: ${hasPaymentLink ? '16px' : '32px'};">
                    ${ctaButtonsHtml}
                  </td>
                </tr>
              </table>
              
              ${paymentDisclaimerHtml}
              
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
                    <!-- Text Logo Primary PNG in Footer - Embedded as base64 -->
                    <img src="${finalTextLogoPrimaryUrlForEmail || 'https://staff.piffdeals.lv/images/piffdeals_text_primary.png'}" alt="${COMPANY_NAME}" width="auto" height="24" style="height: 24px; width: auto; display: block; margin: 0 auto; opacity: 0.7; max-width: 180px; border: none; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;" />
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

${hasPaymentLink ? `Apmaksāt rēķinu šeit: ${invoice.stripe_payment_link}

Skatīt rēķinu: ${publicInvoiceUrl}

💳 Apmaksa: Izmantojiet saiti "Apmaksāt rēķinu šeit" augšā, lai veiktu maksājumu tieši no šī e-pasta. Alternatīvi, varat skatīt rēķinu un apmaksāt to vēlāk.` : `Skatīt rēķinu: ${publicInvoiceUrl}`}

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
      throw new Error(`Failed to send email: ${error}`);
    }

    const emailData = await emailResponse.json();

    // Update last_invoice_email_sent timestamp for rate limiting
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

    await supabaseAdmin
      .from('invoices')
      .update({ last_invoice_email_sent: new Date().toISOString() })
      .eq('id', invoiceId);

    // Update invoice status to 'sent' if it's draft (only via RLS-checked update)
    if (invoice.status === 'draft') {
      await supabaseClient
        .from('invoices')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', invoiceId)
        .eq('user_id', user.id); // Extra ownership check
    }

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




