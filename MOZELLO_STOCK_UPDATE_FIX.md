# Mozello Stock Update Fix

## Issues Found

1. **Wrong API Base URL**: The `update-mozello-stock` function was using `MOZELLO_API_URL` environment variable, but should use the same base URL as `fetch-mozello-products`: `https://api.mozello.com/v1`

2. **Wrong API Endpoint**: The function was using `/store/product/` (singular) but should use `/store/products/` (plural) to match the Mozello API structure

3. **Webhook Not Waiting for Stock Update**: The webhook was marking stock as `completed` before the function actually finished executing

4. **Missing Error Handling**: The webhook wasn't properly checking the response from the stock update function

## Fixes Applied

### 1. Fixed API Base URL and Endpoint

**File**: `supabase/functions/update-mozello-stock/index.ts`

**Changed**:
- Removed `MOZELLO_API_URL` environment variable dependency
- Now uses hardcoded `MOZELLO_API_BASE = 'https://api.mozello.com/v1'` (same as fetch-mozello-products)
- Changed endpoint from `/store/product/${productId}/` to `/store/products/${productId}/` (plural)

### 2. Improved Stock Data Handling

**Added**:
- Better handling of different response structures (`productData.stock` vs `productData.product.stock`)
- More detailed logging for debugging
- Better error messages with HTTP status codes

### 3. Fixed Webhook Stock Update Flow

**File**: `supabase/functions/stripe-webhook/index.ts`

**Changed**:
- Now marks stock as `pending` before calling the function
- Properly waits for the function response
- Checks `stockData?.success` to determine if update succeeded
- Only marks as `completed` if the function returns success
- Applied fix to both `checkout.session.completed` and `payment_intent.succeeded` handlers

## Testing

After deploying these fixes:

1. **Deploy the updated functions**:
   ```bash
   npx supabase functions deploy update-mozello-stock --no-verify-jwt
   npx supabase functions deploy stripe-webhook --no-verify-jwt
   ```

2. **Test the flow**:
   - Create a test invoice with products that have `product_id` set
   - Complete a payment using test card `4242 4242 4242 4242`
   - Check webhook logs in Supabase Dashboard
   - Check `stock_update_status` in the invoice
   - Verify stock was actually updated in Mozello

3. **Check logs**:
   - Supabase Dashboard → Edge Functions → `stripe-webhook` → Logs
   - Supabase Dashboard → Edge Functions → `update-mozello-stock` → Logs
   - Look for detailed error messages if stock update fails

## Environment Variables Required

Make sure these are set in Supabase Dashboard → Edge Functions → Environment Variables:

- ✅ `MOZELLO_API_KEY` - Your Mozello API key
- ❌ `MOZELLO_API_URL` - **NO LONGER NEEDED** (removed, using hardcoded base URL)

## Mozello API Endpoint Structure

Based on the working `fetch-mozello-products` function:
- **Base URL**: `https://api.mozello.com/v1`
- **List Products**: `GET /store/products/`
- **Get Product**: `GET /store/products/{productId}/`
- **Update Product**: `PUT /store/products/{productId}/`

## Troubleshooting

### Stock Still Not Updating

1. **Check webhook is configured**:
   - Stripe Dashboard → Webhooks → Your endpoint
   - Should see `checkout.session.completed` events

2. **Check webhook logs**:
   - Look for "Calling update-mozello-stock for invoice..."
   - Look for "Stock update result..."

3. **Check stock update function logs**:
   - Look for "Updating stock for product..."
   - Look for API errors from Mozello

4. **Check invoice items have product_id**:
   ```sql
   SELECT product_id, product_name, quantity 
   FROM invoice_items 
   WHERE invoice_id = 'your-invoice-id';
   ```
   - If `product_id` is NULL, stock won't update for that item

5. **Check Mozello API credentials**:
   - Verify `MOZELLO_API_KEY` is set correctly
   - Test the API key with a simple GET request

### Common Errors

**"Failed to get product {id}: 404"**
- Product ID might be wrong
- Check that `product_id` in `invoice_items` matches Mozello product handle/ID

**"Failed to update stock: 403"**
- API key might not have write permissions
- Check Mozello API key permissions

**"Unlimited stock, no update needed"**
- Product has `stock: null` in Mozello
- This is expected - products with unlimited stock don't need updates

## Next Steps

1. Deploy the updated functions
2. Test with a real payment
3. Monitor logs for any errors
4. Verify stock updates in Mozello dashboard


