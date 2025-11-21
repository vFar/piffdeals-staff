import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@14.0.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200 
    })
  }

  // Wrap everything in try-catch to ensure errors are caught
  try {
    console.log('=== Payment Link Creation Started ===');
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    // Parse request body safely
    let invoice_id, public_token;
    try {
      const body = await req.json();
      invoice_id = body.invoice_id;
      public_token = body.public_token; // Optional: for public access validation
    } catch (parseError) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request body',
          details: parseError.message 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }
    
    if (!invoice_id) {
      return new Response(
        JSON.stringify({ 
          error: 'invoice_id is required' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    // Get invoice - if public_token is provided, validate it matches
    let invoice;
    if (public_token) {
      // Public access: validate public_token matches invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoice_id)
        .eq('public_token', public_token)
        .single()
      
      if (invoiceError || !invoiceData) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid invoice or public token' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403
          }
        )
      }
      invoice = invoiceData
    } else {
      // Authenticated access: just get invoice by ID
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoice_id)
        .single()
      
      if (invoiceError) throw invoiceError
      invoice = invoiceData
    }
    
    // Get invoice items separately to ensure we get all items
    const { data: invoiceItems, error: itemsError } = await supabase
      .from('invoice_items')
      .select('product_name, product_description, quantity, unit_price, total')
      .eq('invoice_id', invoice_id)
    
    if (itemsError) {
      console.error('Error fetching invoice items:', itemsError);
      throw itemsError;
    }
    
    if (!invoiceItems || invoiceItems.length === 0) {
      console.error('Invoice has no items:', invoice_id);
      throw new Error('Invoice has no items');
    }
    
    // Validate invoice items have required fields
    for (const item of invoiceItems) {
      if (!item.product_name) {
        console.error('Invoice item missing product_name:', item);
        throw new Error('Invoice item missing product_name');
      }
      if (item.unit_price === null || item.unit_price === undefined || isNaN(item.unit_price)) {
        console.error('Invoice item has invalid unit_price:', item);
        throw new Error(`Invoice item has invalid unit_price: ${item.unit_price}`);
      }
      if (item.quantity === null || item.quantity === undefined || isNaN(item.quantity) || item.quantity <= 0) {
        console.error('Invoice item has invalid quantity:', item);
        throw new Error(`Invoice item has invalid quantity: ${item.quantity}`);
      }
    }
    
    // Validate Stripe key exists
    if (!Deno.env.get('STRIPE_SECRET_KEY')) {
      console.error('STRIPE_SECRET_KEY is not set');
      throw new Error('Stripe secret key is not configured');
    }
    
    // Validate invoice has customer email
    if (!invoice.customer_email) {
      console.error('Invoice missing customer_email:', invoice_id);
      throw new Error('Invoice missing customer_email');
    }
    
    // Ensure invoice has a public_token for public access
    // If it doesn't have one, generate and save it
    if (!invoice.public_token) {
      console.log('Invoice missing public_token, generating one...');
      const { data: updatedInvoice, error: updateError } = await supabase
        .from('invoices')
        .update({ public_token: crypto.randomUUID() })
        .eq('id', invoice_id)
        .select('public_token')
        .single()
      
      if (updateError) {
        console.error('Error generating public_token:', updateError);
        throw new Error('Failed to generate public token for invoice');
      }
      
      invoice.public_token = updatedInvoice.public_token
      console.log('Generated public_token:', invoice.public_token);
    }
    
    // Get frontend URL from environment variable
    // Default to staff.piffdeals.lv (where the public invoice page is hosted)
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://staff.piffdeals.lv'
    console.log('Using frontend URL:', frontendUrl);
    console.log('Invoice public_token:', invoice.public_token);
    
    console.log('Creating Stripe Checkout Session for invoice:', invoice_id);
    console.log('Invoice items count:', invoiceItems.length);
    console.log('Customer email:', invoice.customer_email);
    
    // Create Stripe Checkout Session (instead of Payment Link for better customization)
    // Checkout Sessions support: Latvian language, custom branding, European payment methods
    let session;
    try {
      session = await stripe.checkout.sessions.create({
      // Mode: 'payment' for one-time payments (invoices)
      // Required when using price_data in line_items
      mode: 'payment',
      
      // Customer information
      customer_email: invoice.customer_email,
      
      // Line items
      line_items: invoiceItems.map((item: any) => ({
        price_data: {
          currency: 'eur',
          product_data: {
            name: item.product_name,
            description: item.product_description || undefined,
          },
          unit_amount: Math.round(item.unit_price * 100), // Convert to cents
        },
        quantity: item.quantity,
      })),
      
      // Payment methods - Focus on Baltic countries (Latvia, Estonia, Lithuania)
      // IMPORTANT: Only include payment methods that are ENABLED in Stripe Dashboard
      // If a payment method isn't enabled, Stripe will return an error
      // 
      // After disabling/re-enabling payment methods, wait a few minutes for them to activate
      // or check Stripe Dashboard to ensure they're fully enabled
      payment_method_types: [
        'card',           // Credit/debit cards (Visa, Mastercard) - ALWAYS enabled by default
        // Temporarily disabled - uncomment once SEPA is properly enabled in Stripe Dashboard
        // 'sepa_debit',     // SEPA Direct Debit - Works with ALL Latvian/EU banks:
                          // - Citadele
                          // - Luminor
                          // - Swedbank
                          // - SEB
                          // - And all other SEPA banks in Latvia, Estonia, Lithuania
        // 
        // To re-enable SEPA:
        // 1. Go to Stripe Dashboard → Settings → Payment methods
        // 2. Make sure SEPA Direct Debit is ENABLED (toggle ON)
        // 3. Wait 2-3 minutes for it to activate
        // 4. Uncomment 'sepa_debit' above
        // 5. Redeploy this function
      ],
      
      // Language - Set to Latvian
      locale: 'lv', // Latvian
      
      // Custom branding - Make it look like PiffDeals
      // Note: You need to upload your logo in Stripe Dashboard > Settings > Branding
      // Then reference it here, or use a public URL
      // For now, we'll use text-based branding
      
      // Custom text in Latvian
      custom_text: {
        submit: {
          message: `Apmaksāt rēķinu ${invoice.invoice_number}`,
        },
        // Note: Removed shipping_address - invoices don't need shipping addresses
        // Note: Removed terms_of_service_acceptance - if you want it, you must also add:
        //   consent_collection: { terms_of_service: 'required' }
      },
      
      // Payment method options - Optimize for Baltic customers
      // Only include options for payment methods that are enabled above
      // payment_method_options: {
      //   sepa_debit: {
      //     // SEPA Direct Debit settings for Latvian banks
      //     mandate_options: {
      //       preferred_locale: 'lv', // Latvian language for mandate
      //     },
      //   },
      // },
      
      // Success and cancel URLs - Redirect back to public invoice page
      // Format: https://staff.piffdeals.lv/i/{public_token}?payment=success
      // Note: Set FRONTEND_URL environment variable in Supabase Dashboard for production
      success_url: `${frontendUrl}/i/${invoice.public_token}?payment=success`,
      cancel_url: `${frontendUrl}/i/${invoice.public_token}?payment=cancelled`,
      
      // Customer country - Set to Latvia for better payment method selection
      // Stripe will automatically show relevant payment methods based on customer location
      // But setting this helps prioritize Baltic payment methods
      // Note: Stripe will detect customer location automatically, but this sets default
      
      // Metadata
      metadata: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        customer_name: invoice.customer_name,
        customer_email: invoice.customer_email,
      },
      
      // Payment intent data
      payment_intent_data: {
        description: `Rēķins ${invoice.invoice_number} - PiffDeals`,
        metadata: {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
        },
      },
      
      // Invoice mode (optional - creates an invoice in Stripe)
      // invoice_creation: {
      //   enabled: true,
      // },
      
      // Allow promotion codes
      allow_promotion_codes: true,
      
      // Billing address collection
      billing_address_collection: 'required',
      
      // Automatic tax (if enabled in your Stripe account)
      // automatic_tax: {
      //   enabled: true,
      // },
      });
    } catch (stripeError: any) {
      console.error('=== STRIPE API ERROR ===');
      console.error('Stripe error type:', stripeError.type);
      console.error('Stripe error message:', stripeError.message);
      console.error('Stripe error code:', stripeError.code);
      console.error('Stripe error param:', stripeError.param);
      console.error('Stripe error detail:', stripeError.detail);
      console.error('Full Stripe error:', JSON.stringify(stripeError, null, 2));
      
      // Provide more helpful error messages
      let errorMessage = `Stripe API error: ${stripeError.message || stripeError.toString()}`;
      
      // Check for common payment method errors
      if (stripeError.code === 'parameter_invalid_empty' || 
          stripeError.code === 'payment_method_type_invalid' ||
          (stripeError.param && stripeError.param.includes('payment_method'))) {
        errorMessage = `Payment method configuration error: ${stripeError.message}. Please check that all payment methods in the code are enabled in Stripe Dashboard.`;
      }
      
      if (stripeError.type === 'StripeInvalidRequestError') {
        errorMessage = `Invalid Stripe request: ${stripeError.message}. Check your payment method configuration.`;
      }
      
      throw new Error(errorMessage);
    }
    
    // Use the session URL as the payment URL
    const paymentUrl = session.url;
    const paymentLinkId = session.id;
    
    // Log the checkout session with redirect URLs
    console.log('Stripe Checkout Session created:', {
      id: session.id,
      url: session.url,
      success_url: session.success_url,
      cancel_url: session.cancel_url,
      payment_status: session.payment_status,
      locale: session.locale,
    });
    console.log('Redirect URLs configured:');
    console.log(`  Success: ${frontendUrl}/i/${invoice.public_token}?payment=success`);
    console.log(`  Cancel: ${frontendUrl}/i/${invoice.public_token}?payment=cancelled`);
    
    // Ensure we have a URL
    if (!paymentUrl) {
      console.error('Checkout session created but URL is missing!', {
        sessionId: session.id,
        sessionObject: session
      });
      throw new Error('Checkout session URL is missing from Stripe response');
    }
    
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        stripe_payment_link: paymentUrl,
        stripe_payment_link_id: paymentLinkId,
        // Don't update status here - frontend will handle it
      })
      .eq('id', invoice_id)
    
    if (updateError) {
      console.error('Error updating invoice with payment link:', updateError);
      throw updateError;
    }
    
    console.log('Invoice updated successfully with payment link');
    
    return new Response(
      JSON.stringify({
        success: true,
        payment_url: paymentUrl,
        payment_link_id: paymentLinkId,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('=== ERROR IN PAYMENT LINK CREATION ===');
    console.error('Error object:', error);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    console.error('Error name:', error?.name);
    console.error('Error type:', error?.type);
    console.error('Error code:', error?.code);
    console.error('Full error string:', error?.toString());
    
    // Return more detailed error information
    const errorMessage = error?.message || error?.toString() || 'Failed to create payment link';
    const errorDetails = error?.toString() || JSON.stringify(error);
    const errorType = error?.type || error?.name || 'Unknown';
    
    const errorResponse = {
      error: errorMessage,
      details: errorDetails,
      type: errorType,
      // Include Stripe error code if available
      ...(error?.code && { code: error.code }),
      // Include raw error for debugging
      rawError: error ? {
        message: error.message,
        name: error.name,
        type: error.type,
        code: error.code,
      } : null,
    };
    
    console.error('Returning error response:', JSON.stringify(errorResponse, null, 2));
    
    return new Response(
      JSON.stringify(errorResponse),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})





