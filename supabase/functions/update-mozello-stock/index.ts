import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MOZELLO_API_URL = Deno.env.get('MOZELLO_API_URL')
const MOZELLO_API_KEY = Deno.env.get('MOZELLO_API_KEY')

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
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    // Get invoice items
    const { data: items, error } = await supabase
      .from('invoice_items')
      .select('product_id, product_name, quantity')
      .eq('invoice_id', invoice_id)
    
    if (error) throw error
    
    if (!items || items.length === 0) {
      throw new Error('No items found for this invoice')
    }
    
    console.log(`Updating stock for ${items.length} products...`)
    
    // Update stock for each product in Mozello
    const updateResults = []
    for (const item of items) {
      if (!item.product_id) {
        console.warn(`Skipping item "${item.product_name}" - no product_id`)
        continue
      }
      
      try {
        const result = await updateMozelloProductStock(item.product_id, item.quantity)
        updateResults.push({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          success: true,
          ...result,
        })
        console.log(`✓ Updated stock for ${item.product_name} (${item.quantity} units)`)
      } catch (productError) {
        console.error(`✗ Failed to update stock for ${item.product_name}:`, productError)
        updateResults.push({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          success: false,
          error: productError.message,
        })
      }
    }
    
    // Check if all updates succeeded
    const allSuccessful = updateResults.every(r => r.success)
    
    // Update invoice with stock update status
    await supabase
      .from('invoices')
      .update({
        stock_updated_at: new Date().toISOString(),
        stock_update_status: allSuccessful ? 'completed' : 'partial',
      })
      .eq('id', invoice_id)
    
    return new Response(
      JSON.stringify({
        success: allSuccessful,
        message: allSuccessful 
          ? `Successfully updated stock for all ${items.length} products`
          : `Partially updated stock (${updateResults.filter(r => r.success).length}/${items.length} successful)`,
        updated_items: updateResults.length,
        details: updateResults,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: allSuccessful ? 200 : 207, // 207 Multi-Status for partial success
      }
    )
  } catch (error) {
    console.error('Error updating Mozello stock:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to update stock',
        details: error.toString(),
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

/**
 * Update product stock in Mozello
 * Gets current stock, decreases by quantity sold, then updates
 */
async function updateMozelloProductStock(productId: string, quantitySold: number) {
  if (!MOZELLO_API_URL || !MOZELLO_API_KEY) {
    throw new Error('Mozello API credentials not configured')
  }

  console.log(`Updating stock for product ${productId} - decreasing by ${quantitySold}`)
  
  // Step 1: Get current product data
  const getResponse = await fetch(`${MOZELLO_API_URL}/store/product/${productId}/`, {
    method: 'GET',
    headers: {
      'Authorization': `ApiKey ${MOZELLO_API_KEY}`,
      'Content-Type': 'application/json',
    },
  })
  
  if (!getResponse.ok) {
    const errorText = await getResponse.text()
    throw new Error(`Failed to get product ${productId}: ${errorText}`)
  }
  
  const productData = await getResponse.json()
  
  // Step 2: Calculate new stock
  let currentStock = productData.stock
  
  // If stock is null (unlimited), don't update
  if (currentStock === null) {
    console.log(`Product ${productId} has unlimited stock, skipping update`)
    return { message: 'Unlimited stock, no update needed' }
  }
  
  const newStock = Math.max(0, currentStock - quantitySold)
  
  console.log(`Product ${productId}: Current stock ${currentStock}, sold ${quantitySold}, new stock ${newStock}`)
  
  // Step 3: Update product with new stock
  const updateResponse = await fetch(`${MOZELLO_API_URL}/store/product/${productId}/`, {
    method: 'PUT',
    headers: {
      'Authorization': `ApiKey ${MOZELLO_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product: {
        stock: newStock,
      },
    }),
  })
  
  if (!updateResponse.ok) {
    const errorText = await updateResponse.text()
    throw new Error(`Failed to update stock for ${productId}: ${errorText}`)
  }
  
  return await updateResponse.json()
}

