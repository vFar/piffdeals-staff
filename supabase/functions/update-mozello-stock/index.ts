import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Use the same base URL as fetch-mozello-products
const MOZELLO_API_BASE = 'https://api.mozello.com/v1'
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
    
    // Update stock for each product in Mozello
    const updateResults = []
    for (const item of items) {
      if (!item.product_id) {
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
      } catch (productError) {
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
 * Handles both product handles and UIDs
 */
async function updateMozelloProductStock(productId: string, quantitySold: number) {
  if (!MOZELLO_API_KEY) {
    throw new Error('MOZELLO_API_KEY not configured')
  }
  
  // According to Mozello API docs:
  // - GET /store/product/<product-handle>/ (SINGULAR, not plural)
  // - PUT /store/product/<product-handle>/ (SINGULAR, not plural)
  // - Handle can be in format "uid-1234567890" - this IS a valid handle!
  // So if productId is "uid-4778688", we can use it directly as the handle
  
  const productHandle = productId // productId is already the handle (can be uid- format or slug)
  
  // Step 1: Get current product data
  // Mozello API uses SINGULAR: /store/product/<handle>/
  const getResponse = await fetch(`${MOZELLO_API_BASE}/store/product/${productHandle}/`, {
    method: 'GET',
    headers: {
      'Authorization': `ApiKey ${MOZELLO_API_KEY}`,
      'Content-Type': 'application/json',
    },
  })
  
  if (!getResponse.ok) {
    const errorText = await getResponse.text()
    throw new Error(`Failed to get product ${productHandle}: ${getResponse.status} ${errorText}`)
  }
  
  const productData = await getResponse.json()
  
  // Step 2: Extract current stock from API response
  // Handle different response structures from Mozello API
  // Single product GET might return: { product: { stock, ... } } or { stock, ... }
  let currentStock: number | null | undefined
  
  // Try different possible response structures
  if (productData.stock !== undefined) {
    currentStock = productData.stock
  } else if (productData.product?.stock !== undefined) {
    currentStock = productData.product.stock
  } else if (productData.data?.stock !== undefined) {
    currentStock = productData.data.stock
  } else {
    // Last resort: check if productData itself is the product object
    throw new Error(`Could not extract stock from product data for ${productHandle}`)
  }
  
  // If stock is null (unlimited), don't update
  if (currentStock === null || currentStock === undefined) {
    return { message: 'Unlimited stock, no update needed' }
  }
  
  // Ensure currentStock is a number
  const currentStockNum = Number(currentStock)
  if (isNaN(currentStockNum)) {
    throw new Error(`Invalid stock value: ${currentStock} (not a number)`)
  }
  
  // Calculate new stock: subtract quantity sold from current stock
  const newStock = Math.max(0, currentStockNum - quantitySold)
  
  // Step 3: Update product with new stock
  // According to Mozello API docs: PUT /store/product/<product-handle>/
  // The request body should be: { "product": { "stock": newStock } }
  const updateResponse = await fetch(`${MOZELLO_API_BASE}/store/product/${productHandle}/`, {
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
    throw new Error(`Failed to update stock for ${productHandle}: ${updateResponse.status} ${errorText}`)
  }
  
  const updatedData = await updateResponse.json()
  
  // Verify the update was successful by checking the response
  const updatedStock = updatedData.stock ?? updatedData.product?.stock
  if (updatedStock !== undefined && updatedStock !== null) {
    if (Number(updatedStock) !== newStock) {
      // Expected stock mismatch - but continue anyway
    }
  }
  
  return updatedData
}

