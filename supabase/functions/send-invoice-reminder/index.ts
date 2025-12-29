// Send Invoice Reminder Email Edge Function
// Sends reminder email to customers 2 days after invoice issue_date
// Only sends reminders for invoices that were actually sent to customers (sent_at IS NOT NULL)
// Should be called daily via cron job

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_email: string;
  issue_date: string;
  due_date: string;
  total: number;
  public_token: string;
  status: string;
  sent_at: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 
      Deno.env.get('SUPABASE_PROJECT_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error: Missing Supabase credentials',
          message: 'Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Edge Function secrets'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Supabase admin client (bypasses RLS)
    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Check for test mode via query parameter
    const url = new URL(req.url);
    const testMode = url.searchParams.get('test') === 'true';

    // Calculate 2 days ago from today
    const today = new Date();
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    
    // Find invoices that:
    // 1. Are in 'sent' or 'pending' status (not paid, cancelled, or draft)
    // 2. Have an issue_date
    // 3. Have a customer_email
    // 4. Have a public_token (needed for invoice link)
    // 5. Have sent_at NOT NULL (invoice was actually sent to customer via email)
    // 6. Issue date is 2 days ago (or within test range in test mode)
    // 7. Haven't had a reminder email sent yet (last_reminder_email_sent is null)
    let query = supabase
      .from('invoices')
      .select('id, invoice_number, customer_name, customer_email, issue_date, due_date, total, public_token, status, sent_at, last_reminder_email_sent')
      .in('status', ['sent', 'pending'])
      .not('issue_date', 'is', null)
      .not('customer_email', 'is', null)
      .not('public_token', 'is', null)
      .not('sent_at', 'is', null) // IMPORTANT: Only invoices that were sent to customer
      .is('last_reminder_email_sent', null);

    if (testMode) {
      // Test mode: check for invoices with issue_date 1-5 days ago (very flexible for testing)
      const oneDayAgo = new Date(today);
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      const fiveDaysAgo = new Date(today);
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      const oneDayAgoStr = oneDayAgo.toISOString().split('T')[0];
      const fiveDaysAgoStr = fiveDaysAgo.toISOString().split('T')[0];
      
      query = query
        .gte('issue_date', fiveDaysAgoStr) // issue_date >= 5 days ago
        .lte('issue_date', oneDayAgoStr); // issue_date <= 1 day ago (so 1-5 days ago)
    } else {
      // Production mode: check for invoices with issue_date 2 or more days ago (>= 2 days)
      // This ensures reminders are sent if 2+ days have passed since invoice was created
      query = query.lte('issue_date', twoDaysAgoStr); // issue_date <= 2 days ago
    }

    const { data: invoices, error: fetchError } = await query;

    if (fetchError) {
      throw fetchError;
    }

    if (!invoices || invoices.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          reminders_sent: 0,
          message: testMode 
            ? `No invoices found with issue_date 1-5 days ago that were sent to customers`
            : `No invoices found with issue_date <= ${twoDaysAgoStr} (2+ days ago) that were sent to customers`,
          debug: testMode ? {
            test_mode: true,
            today: todayStr,
            two_days_ago: twoDaysAgoStr,
            checked_range: '1-5 days ago'
          } : {
            test_mode: false,
            today: todayStr,
            two_days_ago: twoDaysAgoStr,
            checked_condition: `issue_date <= ${twoDaysAgoStr}`
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // All invoices found match the criteria, so send reminders to all
    const invoicesToRemind = invoices as Invoice[];

    if (invoicesToRemind.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          reminders_sent: 0,
          message: 'No invoices need reminder emails at this time',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get email service configuration
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@example.com';
    const COMPANY_NAME = Deno.env.get('COMPANY_NAME') || 'Piffdeals';
    const publicSiteUrl = (Deno.env.get('PUBLIC_SITE_URL') || 'https://staff.piffdeals.lv').replace(/\/$/, '');

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Image URLs
    const logoImageUrl = `${publicSiteUrl}/images/S-3.png`;
    const textLogoAccentUrl = `${publicSiteUrl}/images/piffdeals_text_accent.png`;
    const textLogoPrimaryUrl = `${publicSiteUrl}/images/piffdeals_text_primary.png`;

    // Send reminder emails
    const results = [];
    const errors = [];

    for (const invoice of invoicesToRemind) {
      try {
        // Calculate days since issue date
        const issueDate = new Date(invoice.issue_date + 'T00:00:00Z');
        const now = new Date();
        const daysSinceIssue = Math.floor((now.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Calculate days until due date (if due_date exists)
        let daysUntilDue = null;
        let dueDateFormatted = 'N/A';
        if (invoice.due_date) {
          const dueDate = new Date(invoice.due_date + 'T00:00:00Z');
          daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          dueDateFormatted = dueDate.toLocaleDateString('lv-LV', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        }
        
        const publicInvoiceUrl = `${publicSiteUrl}/i/${invoice.public_token}`;

        // Reminder email HTML template
        const emailHtml = `
<!DOCTYPE html>
<html lang="lv">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Atgādinājums par rēķinu ${invoice.invoice_number} - ${COMPANY_NAME}</title>
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
          
          <!-- Header with Piffdeals branding -->
          <tr>
            <td style="background: linear-gradient(135deg, #0068FF 0%, #4F91ED 100%); padding: 32px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                      <tr>
                        <td align="center" valign="middle" style="padding-right: 12px;">
                          <img src="${logoImageUrl}" alt="${COMPANY_NAME} Logo" width="40" height="40" style="width: 40px; height: 40px; display: block; border: none; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;" />
                        </td>
                        <td align="left" valign="middle">
                          <img src="${textLogoAccentUrl}" alt="${COMPANY_NAME}" width="auto" height="24" style="height: 24px; width: auto; display: block; border: none; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;" />
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
                      Sveiki, ${invoice.customer_name}!
                    </div>
                  </td>
                </tr>
              </table>
              
              <!-- Reminder Message -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding-bottom: 32px;">
                    <div style="font-size: 16px; color: #637381; line-height: 1.6;">
                      Šis ir draudzīgs atgādinājums par jūsu rēķinu <strong>${invoice.invoice_number}</strong>, kas tika nosūtīts pirms ${daysSinceIssue} dienām.
                    </div>
                  </td>
                </tr>
              </table>
              
              ${invoice.due_date && daysUntilDue !== null && daysUntilDue > 0 ? `
              <!-- Warning Box -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 8px; margin-bottom: 32px;">
                <tr>
                  <td style="padding: 20px;">
                    <div style="font-size: 14px; color: #92400E; line-height: 1.6;">
                      <strong>⚠️ Svarīgi:</strong> Jūsu rēķina apmaksas termiņš ir <strong>${dueDateFormatted}</strong> (pēc ${daysUntilDue} dienām).
                      <br><br>
                      Lūdzu, veiciet maksājumu, lai mēs varētu sākt piegādes sagatavošanu.
                    </div>
                  </td>
                </tr>
              </table>
              ` : ''}
              
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
                            ${invoice.invoice_number}
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
                            €${Number(invoice.total).toFixed(2)}
                          </div>
                        </td>
                      </tr>
                      ${invoice.due_date ? `
                      <tr>
                        <td style="padding-top: 12px;">
                          <div style="font-size: 12px; font-weight: 600; color: #637381; text-transform: uppercase; letter-spacing: 0.5px;">
                            Apmaksas termiņš
                          </div>
                        </td>
                        <td align="right" style="padding-top: 12px;">
                          <div style="font-size: 16px; font-weight: 600; color: ${daysUntilDue !== null && daysUntilDue <= 0 ? '#DC2626' : '#F59E0B'};">
                            ${dueDateFormatted}
                          </div>
                        </td>
                      </tr>
                      ` : ''}
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
                      Skatīt un apmaksāt rēķinu
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
                      Lūdzu, veiciet maksājumu, lai mēs varētu sākt piegādes sagatavošanu. Ja jums ir kādi jautājumi, lūdzu, nevilcinieties ar mums sazināties.
                      <br><br>
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
                    <img src="${textLogoPrimaryUrl}" alt="${COMPANY_NAME}" width="auto" height="24" style="height: 24px; width: auto; display: block; margin: 0 auto; opacity: 0.7; max-width: 180px; border: none; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;" />
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
        const emailText = `Sveiki, ${invoice.customer_name}!

Šis ir draudzīgs atgādinājums par jūsu rēķinu ${invoice.invoice_number}, kas tika nosūtīts pirms ${daysSinceIssue} dienām.

${invoice.due_date && daysUntilDue !== null && daysUntilDue > 0 ? `⚠️ Svarīgi: Jūsu rēķina apmaksas termiņš ir ${dueDateFormatted} (pēc ${daysUntilDue} dienām).
Lūdzu, veiciet maksājumu, lai mēs varētu sākt piegādes sagatavošanu.

` : ''}Rēķina numurs: ${invoice.invoice_number}
Kopējā summa: €${Number(invoice.total).toFixed(2)}
${invoice.due_date ? `Apmaksas termiņš: ${dueDateFormatted}` : ''}

Skatīt un apmaksāt rēķinu: ${publicInvoiceUrl}

Lūdzu, veiciet maksājumu, lai mēs varētu sākt piegādes sagatavošanu. Ja jums ir kādi jautājumi, lūdzu, nevilcinieties ar mums sazināties.
Paldies par sadarbību!

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
            to: [invoice.customer_email],
            subject: `Atgādinājums: Rēķins ${invoice.invoice_number} - Apmaksas atgādinājums`,
            html: emailHtml,
            text: emailText,
            reply_to: FROM_EMAIL.includes('info@') ? FROM_EMAIL : FROM_EMAIL.replace(/^[^@]+@/, 'info@'),
          }),
        });

        if (!emailResponse.ok) {
          const error = await emailResponse.text();
          throw new Error(`Failed to send email: ${error}`);
        }

        const emailData = await emailResponse.json();

        // Update last_reminder_email_sent timestamp
        await supabase
          .from('invoices')
          .update({ last_reminder_email_sent: new Date().toISOString() })
          .eq('id', invoice.id);

        results.push({
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          customer_email: invoice.customer_email,
          email_id: emailData.id,
        });
      } catch (error) {
        errors.push({
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          error: error.message || 'Unknown error',
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        reminders_sent: results.length,
        errors: errors.length,
        results: results,
        errors_details: errors.length > 0 ? errors : undefined,
        message: `Successfully sent ${results.length} reminder email(s)`,
        debug: testMode ? {
          test_mode: true,
          today: todayStr,
          two_days_ago: twoDaysAgoStr,
          total_invoices_found: invoicesToRemind.length
        } : undefined
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to send reminder emails',
        message: error.message,
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

