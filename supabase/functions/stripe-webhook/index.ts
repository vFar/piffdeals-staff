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
            console.warn('Could not retrieve payment intent:', err)
          }
        }
        
        if (invoiceId) {
          console.log(`Processing payment for invoice: ${invoiceId}`)
          
          // Check current invoice status
          const { data: currentInvoice, error: fetchError } = await supabase
            .from('invoices')
            .select('status, stock_update_status')
            .eq('id', invoiceId)
            .single()
          
          if (fetchError) {
            console.error('Error fetching invoice:', fetchError)
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
            console.error('Error updating invoice:', updateError)
            throw updateError
          }
          
          console.log(`Invoice ${invoiceId} marked as paid`)
          
          // Trigger stock update in Mozello (only if not already completed)
          if (currentInvoice?.stock_update_status !== 'completed') {
            try {
              console.log(`Calling update-mozello-stock for invoice ${invoiceId}`)
              
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
                console.error('Error updating stock:', stockError)
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
                console.log(`Stock update result for invoice ${invoiceId}:`, { success, data: stockData })
                
                await supabase
                  .from('invoices')
                  .update({
                    stock_update_status: success ? 'completed' : 'failed',
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
          } else {
            console.log(`Stock already updated for invoice ${invoiceId}, skipping`)
          }
        } else {
          console.warn('No invoice_id found in webhook metadata')
        }
        break
      }
      
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object
        const invoiceId = paymentIntent.metadata?.invoice_id
        
        if (invoiceId) {
          console.log(`Processing payment_intent.succeeded for invoice: ${invoiceId}`)
          
          // Check current invoice status
          const { data: currentInvoice, error: fetchError } = await supabase
            .from('invoices')
            .select('status, stock_update_status')
            .eq('id', invoiceId)
            .single()
          
          if (fetchError) {
            console.error('Error fetching invoice:', fetchError)
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
            console.error('Error updating invoice:', updateError)
            throw updateError
          }
          
          console.log(`Invoice ${invoiceId} marked as paid`)
          
          // Trigger stock update in Mozello (only if not already completed)
          if (currentInvoice?.stock_update_status !== 'completed') {
            try {
              console.log(`Calling update-mozello-stock for invoice ${invoiceId}`)
              
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
                console.error('Error updating stock:', stockError)
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
                console.log(`Stock update result for invoice ${invoiceId}:`, { success, data: stockData })
                
                await supabase
                  .from('invoices')
                  .update({
                    stock_update_status: success ? 'completed' : 'failed',
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
          } else {
            console.log(`Stock already updated for invoice ${invoiceId}, skipping`)
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








