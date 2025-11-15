import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.0.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { invoice_id } = await req.json()
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    // Get invoice and items
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_items (
          product_name,
          product_description,
          quantity,
          unit_price,
          total
        )
      `)
      .eq('id', invoice_id)
      .single()
    
    if (invoiceError) throw invoiceError
    
    if (!invoice.invoice_items || invoice.invoice_items.length === 0) {
      throw new Error('Invoice has no items')
    }
    
    // Create Stripe Payment Link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: invoice.invoice_items.map((item: any) => ({
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
      metadata: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        customer_name: invoice.customer_name,
        customer_email: invoice.customer_email,
      },
      after_completion: {
        type: 'hosted_confirmation',
        hosted_confirmation: {
          custom_message: `Thank you! Payment for Invoice ${invoice.invoice_number} has been received. You will receive a confirmation email shortly.`,
        },
      },
      // Optional: Allow promotion codes
      allow_promotion_codes: true,
      // Optional: Set custom text
      custom_text: {
        submit: {
          message: `Payment for Invoice ${invoice.invoice_number}`,
        },
      },
    })
    
    // Store payment link in invoice and update status to 'sent'
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        stripe_payment_link: paymentLink.url,
        stripe_payment_link_id: paymentLink.id,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', invoice_id)
    
    if (updateError) throw updateError
    
    return new Response(
      JSON.stringify({
        success: true,
        payment_url: paymentLink.url,
        payment_link_id: paymentLink.id,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error creating payment link:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to create payment link',
        details: error.toString(),
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})


