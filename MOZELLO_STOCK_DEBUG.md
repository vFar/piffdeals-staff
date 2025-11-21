# Mozello Stock Update Debugging Guide

## Current Issue
Stock is not updating when invoices are paid. The `stock_update_status` shows `false` or `failed`.

## Debugging Steps

### 1. Check Edge Function Logs

Go to Supabase Dashboard → Edge Functions → `update-mozello-stock` → Logs

Look for these log messages:
- `"Updating stock for product {productId}"`
- `"Product ID {productId} appears to be a UID, searching for product..."`
- `"Fetched {count} products from Mozello"`
- `"Sample product structure:"` - This shows what fields products have
- `"Found product: handle=..."` - Confirms product was found
- `"Product data retrieved:"` - Shows full product structure
- `"Extracted current stock: {value}"` - Shows stock value found
- `"Attempting to update product by handle: {handle}"` - Shows update attempts

### 2. Check What Product ID Format is Stored

Run this SQL query to see what product_id format is stored:
```sql
SELECT 
  invoice_number,
  product_id,
  product_name,
  quantity
FROM invoice_items
WHERE invoice_id = 'YOUR_INVOICE_ID';
```

**Expected formats:**
- Handle (slug): `product-slug-name`
- UID: `uid-4778688` or `4778688`

### 3. Check Mozello API Response Structure

The function now logs the product structure. Check logs for:
```
Sample product structure: {
  "uid": "...",
  "id": "...",
  "handle": "...",
  "stock": ...
}
```

This tells us:
- What field contains the UID
- What field contains the handle
- What field contains the stock

### 4. Common Issues and Fixes

#### Issue: "Product with UID {id} not found"
**Cause**: Product ID format doesn't match what's in Mozello
**Fix**: Check the "Sample product structure" log to see what field name Mozello uses for UIDs

#### Issue: "Product found but has no handle field"
**Cause**: Product structure is different than expected
**Fix**: Check the product structure log to see what field contains the handle

#### Issue: "All update attempts failed"
**Cause**: Mozello API endpoint structure is wrong
**Fix**: Check which endpoint format Mozello actually uses (might need to check Mozello API docs)

#### Issue: "Invalid stock value: {value} (not a number)"
**Cause**: Stock field is in unexpected format
**Fix**: Check the "Extracted current stock" log to see what value was found

### 5. Manual Test

You can manually test the stock update by calling the function directly:

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/update-mozello-stock \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"invoice_id": "YOUR_INVOICE_ID"}'
```

### 6. Check Webhook Logs

Also check the webhook logs to see if the function is being called:
- Supabase Dashboard → Edge Functions → `stripe-webhook` → Logs
- Look for: `"Calling update-mozello-stock for invoice {id}"`
- Look for: `"Stock update result: {result}"`

### 7. Verify Mozello API Credentials

Make sure `MOZELLO_API_KEY` is set correctly:
- Supabase Dashboard → Edge Functions → Secrets
- Should be set to your Mozello API key

### 8. Test with a Known Product

Try updating stock for a product you know exists:
1. Get a product handle from the products list
2. Create a test invoice with that product
3. Mark it as paid
4. Check if stock updates

## Next Steps After Debugging

Once you identify the issue from the logs:

1. **If product not found**: Update the UID lookup logic to match Mozello's field names
2. **If handle missing**: Update handle extraction to use correct field
3. **If update endpoint wrong**: Check Mozello API documentation for correct endpoint
4. **If stock format wrong**: Update stock extraction logic

## Expected Log Flow (Success)

```
Updating stock for product uid-4778688 - decreasing by 2
Product ID uid-4778688 appears to be a UID, searching for product...
Fetched 49 products from Mozello
Looking for product with ID: uid-4778688
Sample product structure: { "uid": "...", "handle": "...", "stock": ... }
✓ Found product: handle="product-slug", UID="4778688", stock=10
Product data retrieved: { ... }
Extracted current stock: 10
Product product-slug: Current stock 10, sold 2, new stock 8
Attempting to update product by handle: product-slug
✓ Successfully updated stock for product product-slug via handle endpoint
```

## If Still Not Working

Share the logs from:
1. `update-mozello-stock` function logs
2. `stripe-webhook` function logs
3. The product structure sample from the logs

This will help identify the exact issue.


