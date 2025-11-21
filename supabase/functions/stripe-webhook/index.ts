import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.0.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
  
  try {
    const body = await req.text()
    
    // Verify webhook signature
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      webhookSecret
    )
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        // For Payment Links, metadata is on the session object
        let invoiceId = session.metadata?.invoice_id
        
        // If not found, try to get from payment_intent
        if (!invoiceId && session.payment_intent) {
          try {
            const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent)
            invoiceId = paymentIntent.metadata?.invoice_id
          } catch (err) {
            // Could not retrieve payment intent
          }
        }
        
        if (invoiceId) {
          // Check current invoice status
          const { data: currentInvoice, error: fetchError } = await supabase
            .from('invoices')
            .select('status, stock_update_status')
            .eq('id', invoiceId)
            .single()
          
          if (fetchError) {
            throw fetchError
          }
          
          // Update invoice status to PAID (idempotent - safe to call multiple times)
          const { error: updateError } = await supabase
            .from('invoices')
            .update({
              status: 'paid',
              paid_date: new Date().toISOString(),
              stripe_payment_intent_id: session.payment_intent || session.id,
              payment_method: 'stripe',
            })
            .eq('id', invoiceId)
          
          if (updateError) {
            throw updateError
          }
          
          // Trigger stock update in Mozello (only if not already completed)
          if (currentInvoice?.stock_update_status !== 'completed') {
            try {
              // Mark as pending first
              await supabase
                .from('invoices')
                .update({
                  stock_update_status: 'pending',
                })
                .eq('id', invoiceId)
              
              // Call the stock update function and wait for response
              const { data: stockData, error: stockError } = await supabase.functions.invoke(
                'update-mozello-stock',
                {
                  body: { invoice_id: invoiceId },
                }
              )
              
              if (stockError) {
                // Mark as failed
                await supabase
                  .from('invoices')
                  .update({
                    stock_update_status: 'failed',
                  })
                  .eq('id', invoiceId)
              } else {
                // Check if the function returned success
                const success = stockData?.success !== false
                
                await supabase
                  .from('invoices')
                  .update({
                    stock_update_status: success ? 'completed' : 'failed',
                    stock_updated_at: new Date().toISOString(),
                  })
                  .eq('id', invoiceId)
              }
            } catch (stockUpdateError) {
              // Mark as failed but don't throw
              await supabase
                .from('invoices')
                .update({
                  stock_update_status: 'failed',
                })
                .eq('id', invoiceId)
            }
          }
        }
        break
      }
      
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object
        const invoiceId = paymentIntent.metadata?.invoice_id
        
        if (invoiceId) {
          // Check current invoice status
          const { data: currentInvoice, error: fetchError } = await supabase
            .from('invoices')
            .select('status, stock_update_status')
            .eq('id', invoiceId)
            .single()
          
          if (fetchError) {
            throw fetchError
          }
          
          // Update invoice status to PAID (idempotent)
          const { error: updateError } = await supabase
            .from('invoices')
            .update({
              status: 'paid',
              paid_date: new Date().toISOString(),
              stripe_payment_intent_id: paymentIntent.id,
              payment_method: 'stripe',
            })
            .eq('id', invoiceId)
          
          if (updateError) {
            throw updateError
          }
          
          // Trigger stock update in Mozello (only if not already completed)
          if (currentInvoice?.stock_update_status !== 'completed') {
            try {
              // Mark as pending first
              await supabase
                .from('invoices')
                .update({
                  stock_update_status: 'pending',
                })
                .eq('id', invoiceId)
              
              // Call the stock update function and wait for response
              const { data: stockData, error: stockError } = await supabase.functions.invoke(
                'update-mozello-stock',
                {
                  body: { invoice_id: invoiceId },
                }
              )
              
              if (stockError) {
                // Mark as failed
                await supabase
                  .from('invoices')
                  .update({
                    stock_update_status: 'failed',
                  })
                  .eq('id', invoiceId)
              } else {
                // Check if the function returned success
                const success = stockData?.success !== false
                
                await supabase
                  .from('invoices')
                  .update({
                    stock_update_status: success ? 'completed' : 'failed',
                    stock_updated_at: new Date().toISOString(),
                  })
                  .eq('id', invoiceId)
              }
            } catch (stockUpdateError) {
              // Mark as failed but don't throw
              await supabase
                .from('invoices')
                .update({
                  stock_update_status: 'failed',
                })
                .eq('id', invoiceId)
            }
          }
        }
        break
      }
      
      case 'payment_intent.payment_failed': {
        const session = event.data.object
        const invoiceId = session.metadata?.invoice_id
        
        if (invoiceId) {
          // Optionally update invoice with failure info
          await supabase
            .from('invoices')
            .update({
              payment_method: 'stripe',
              // Could add a payment_error field to store error details
            })
            .eq('id', invoiceId)
        }
        break
      }
      
      default:
        // Unhandled event type
        break
    }
    
    return new Response(
      JSON.stringify({ received: true }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Webhook processing failed',
        details: error.toString(),
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})








