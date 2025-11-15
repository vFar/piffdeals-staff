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
    
    console.log(`Received Stripe webhook: ${event.type}`)
    
    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
      case 'payment_intent.succeeded': {
        const session = event.data.object
        const invoiceId = session.metadata?.invoice_id
        
        if (invoiceId) {
          console.log(`Processing payment for invoice: ${invoiceId}`)
          
          // Update invoice status to PAID
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
            console.error('Error updating invoice:', updateError)
            throw updateError
          }
          
          console.log(`Invoice ${invoiceId} marked as paid`)
          
          // Trigger stock update in Mozello
          try {
            const { error: stockError } = await supabase.functions.invoke(
              'update-mozello-stock',
              {
                body: { invoice_id: invoiceId },
              }
            )
            
            if (stockError) {
              console.error('Error updating stock:', stockError)
              // Don't throw - invoice is already marked as paid
              // Log the error for manual review
              await supabase
                .from('invoices')
                .update({
                  stock_update_status: 'failed',
                })
                .eq('id', invoiceId)
            } else {
              console.log(`Stock updated for invoice ${invoiceId}`)
              await supabase
                .from('invoices')
                .update({
                  stock_update_status: 'completed',
                  stock_updated_at: new Date().toISOString(),
                })
                .eq('id', invoiceId)
            }
          } catch (stockUpdateError) {
            console.error('Stock update error:', stockUpdateError)
            // Mark as failed but don't throw
            await supabase
              .from('invoices')
              .update({
                stock_update_status: 'failed',
              })
              .eq('id', invoiceId)
          }
        }
        break
      }
      
      case 'payment_intent.payment_failed': {
        const session = event.data.object
        const invoiceId = session.metadata?.invoice_id
        
        if (invoiceId) {
          console.log(`Payment failed for invoice: ${invoiceId}`)
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
        console.log(`Unhandled event type: ${event.type}`)
    }
    
    return new Response(
      JSON.stringify({ received: true }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Webhook error:', error)
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


