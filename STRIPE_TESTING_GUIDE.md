# Stripe Payment Testing Guide

This guide helps you test the Stripe payment flow and verify that:
1. Invoices are marked as paid when payment is completed
2. Mozello stock is updated automatically when invoice is paid

## Prerequisites

1. **Stripe Account Setup**
   - Stripe account with test mode enabled
   - `STRIPE_SECRET_KEY` environment variable set (test key)
   - `STRIPE_WEBHOOK_SECRET` environment variable set

2. **Webhook Configuration**
   - Webhook endpoint configured in Stripe Dashboard
   - Webhook URL: `https://[your-project].supabase.co/functions/v1/stripe-webhook`
   - Events to listen for:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`

3. **Mozello API Setup**
   - `MOZELLO_API_URL` environment variable set
   - `MOZELLO_API_KEY` environment variable set

## Testing Steps

### Step 1: Create a Test Invoice

1. Log into the staff portal
2. Create a new invoice with at least one product that has stock tracking enabled in Mozello
3. Make sure the invoice has products with `product_id` set (from Mozello)
4. Create a Stripe payment link for the invoice
5. Note the invoice ID and invoice number

### Step 2: Get the Public Invoice Link

1. The invoice should have a `public_token` generated
2. Access the public invoice page: `/invoice/[public_token]`
3. You should see the green "Apmaksāt šeit" button

### Step 3: Test Payment with Stripe Test Card

1. Click the "Apmaksāt šeit" button
2. This opens the Stripe Payment Link in a new tab
3. Use Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/34)
   - CVC: Any 3 digits (e.g., 123)
   - ZIP: Any 5 digits (e.g., 12345)
4. Complete the payment

### Step 4: Verify Invoice Status Update

1. Check the invoice in the database or staff portal
2. The invoice status should change to `paid`
3. The `paid_date` should be set
4. The `stripe_payment_intent_id` should be populated
5. The `payment_method` should be set to `stripe`

**Check via Supabase Dashboard:**
```sql
SELECT 
  id,
  invoice_number,
  status,
  paid_date,
  stripe_payment_intent_id,
  payment_method,
  stock_update_status,
  stock_updated_at
FROM invoices
WHERE id = 'your-invoice-id';
```

### Step 5: Verify Mozello Stock Update

1. Check the invoice's `stock_update_status` field:
   - Should be `completed` if successful
   - Should be `failed` if there was an error
   - `stock_updated_at` should be set

2. Verify stock in Mozello:
   - Check the product stock in Mozello dashboard
   - Stock should be decreased by the quantity sold
   - Example: If product had 10 units and invoice sold 2, new stock should be 8

**Check via Supabase Dashboard:**
```sql
SELECT 
  invoice_number,
  stock_update_status,
  stock_updated_at
FROM invoices
WHERE id = 'your-invoice-id';
```

### Step 6: Check Webhook Logs

1. Check Supabase Edge Function logs:
   - Go to Supabase Dashboard → Edge Functions → `stripe-webhook`
   - Check logs for webhook events
   - Look for: "Processing payment for invoice: [invoice-id]"
   - Look for: "Invoice [invoice-id] marked as paid"
   - Look for: "Stock updated for invoice [invoice-id]"

2. Check Stripe Dashboard:
   - Go to Stripe Dashboard → Developers → Webhooks
   - View webhook event logs
   - Verify `checkout.session.completed` event was received
   - Check if webhook response was 200 OK

## Troubleshooting

### Invoice Not Marked as Paid

**Possible causes:**
1. Webhook not receiving events
   - Check Stripe webhook configuration
   - Verify webhook URL is correct
   - Check webhook secret matches environment variable

2. Metadata not passed correctly
   - Verify `invoice_id` is in Payment Link metadata
   - Check webhook logs for "No invoice_id found in webhook metadata"

3. Database update failed
   - Check RLS policies allow webhook to update invoices
   - Verify service role key is used in webhook function

**Solution:**
- Check webhook logs in Supabase Dashboard
- Verify webhook secret in environment variables
- Test webhook manually using Stripe CLI

### Stock Not Updated

**Possible causes:**
1. `update-mozello-stock` function not called
   - Check webhook logs for stock update invocation
   - Verify function exists and is deployed

2. Product ID missing
   - Check `invoice_items` table for `product_id`
   - Products without `product_id` are skipped

3. Mozello API error
   - Check `stock_update_status` = `failed`
   - Check Edge Function logs for `update-mozello-stock`
   - Verify Mozello API credentials

4. Product has unlimited stock
   - Products with `null` stock are skipped (no update needed)

**Solution:**
- Check `stock_update_status` in invoice
- Review `update-mozello-stock` function logs
- Verify Mozello API credentials and product IDs

### Payment Button Not Showing

**Possible causes:**
1. No `stripe_payment_link` on invoice
   - Create payment link first
   - Check `stripe_payment_link` field in database

2. Invoice status is `paid` or `cancelled`
   - Button only shows for unpaid invoices
   - This is expected behavior

**Solution:**
- Verify invoice has `stripe_payment_link` set
- Check invoice status

## Testing with Stripe CLI (Local Development)

For local testing, use Stripe CLI to forward webhooks:

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to local Supabase
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook

# Trigger test payment
stripe trigger checkout.session.completed
```

## Test Cards

Use these Stripe test cards:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires 3D Secure**: `4000 0025 0000 3155`

## Expected Flow

1. User clicks "Apmaksāt šeit" → Opens Stripe Payment Link
2. User completes payment → Stripe processes payment
3. Stripe sends webhook → `checkout.session.completed` event
4. Webhook updates invoice → Status = `paid`, `paid_date` set
5. Webhook calls `update-mozello-stock` → Stock decreased in Mozello
6. Invoice shows "APMAKSĀTS" watermark → Public invoice page updates

## Monitoring

Monitor these fields in the `invoices` table:
- `status` - Should be `paid` after successful payment
- `paid_date` - Should be set to payment completion time
- `stripe_payment_intent_id` - Should contain Stripe payment intent ID
- `stock_update_status` - Should be `completed` or `failed`
- `stock_updated_at` - Should be set when stock update completes

## Next Steps

After successful testing:
1. Switch to Stripe live mode
2. Update environment variables with live keys
3. Update webhook endpoint in Stripe Dashboard
4. Test with real payment (small amount)
5. Monitor production webhook logs


