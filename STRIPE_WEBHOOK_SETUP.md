# Stripe Webhook Setup Guide

This guide will help you set up Stripe webhooks so that invoice status updates automatically when payments are completed.

## Why Webhooks Are Needed

When a customer completes payment in Stripe Checkout:
1. ✅ Payment is processed by Stripe
2. ❌ **Your database is NOT automatically updated**
3. ❌ **Stock is NOT automatically updated**

**Webhooks solve this** - Stripe sends a notification to your server when payment completes, and your server updates the invoice status and stock.

## Setup Steps

### Step 1: Deploy the Webhook Function

The webhook function already exists at `supabase/functions/stripe-webhook/index.ts`. Deploy it:

```bash
# Using Supabase CLI
supabase functions deploy stripe-webhook

# Or using the deploy script
./deploy-stripe-functions.sh
```

### Step 2: Get Your Webhook URL

Your webhook URL will be:
```
https://[your-project-id].supabase.co/functions/v1/stripe-webhook
```

Replace `[your-project-id]` with your actual Supabase project ID (e.g., `emqhyievrsyeinwrqqhw`).

### Step 3: Configure Webhook in Stripe Dashboard

1. **Go to Stripe Dashboard:**
   - Visit: https://dashboard.stripe.com/test/webhooks (for test mode)
   - Or: https://dashboard.stripe.com/webhooks (for live mode)

2. **Click "Add endpoint"**

3. **Enter your webhook URL:**
   ```
   https://emqhyievrsyeinwrqqhw.supabase.co/functions/v1/stripe-webhook
   ```

4. **Select events to listen for:**
   - ✅ `checkout.session.completed` (REQUIRED - this is when payment completes)
   - Optional: `payment_intent.succeeded`, `payment_intent.payment_failed`

5. **Click "Add endpoint"**

6. **Copy the Webhook Signing Secret:**
   - After creating the endpoint, click on it
   - Find "Signing secret" section
   - Click "Reveal" and copy the secret
   - It looks like: `whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 4: Set Environment Variables in Supabase

1. **Go to Supabase Dashboard:**
   - Project Settings → Edge Functions → Environment Variables

2. **Add/Update these variables:**

   **For Test Mode:**
   ```
   STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   FRONTEND_URL=https://piffdeals.lv
   ```

   **For Live Mode:**
   ```
   STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   FRONTEND_URL=https://piffdeals.lv
   ```

   **For Local Development:**
   ```
   FRONTEND_URL=http://localhost:5173
   ```

### Step 5: Test the Webhook

1. **Create a test invoice** in your staff portal
2. **Click "Gatavs nosūtīšanai"** to create payment link
3. **Complete a test payment** using card `4242 4242 4242 4242`
4. **Check Stripe Dashboard:**
   - Go to Webhooks → Your endpoint → Recent events
   - You should see `checkout.session.completed` event
   - Status should be "Succeeded" (200 OK)

5. **Check your database:**
   ```sql
   SELECT 
     invoice_number,
     status,
     paid_date,
     stripe_payment_intent_id,
     stock_update_status
   FROM invoices
   WHERE invoice_number = '#YOUR_INVOICE_NUMBER';
   ```
   
   Expected results:
   - `status` = `paid`
   - `paid_date` = timestamp
   - `stripe_payment_intent_id` = populated
   - `stock_update_status` = `completed` (if stock update worked)

### Step 6: Check Webhook Logs

**In Supabase Dashboard:**
- Go to Edge Functions → `stripe-webhook` → Logs
- Look for: "Processing payment for invoice: [invoice-id]"
- Look for: "Invoice [invoice-id] marked as paid"

**In Stripe Dashboard:**
- Go to Webhooks → Your endpoint → Recent events
- Click on an event to see request/response details

## Troubleshooting

### Invoice Status Not Updating

**Problem:** Payment completes but invoice status stays `sent`

**Possible causes:**
1. Webhook not configured in Stripe
2. Webhook secret incorrect
3. Webhook URL incorrect
4. Webhook function not deployed

**Solution:**
- Check Stripe Dashboard → Webhooks → Recent events
- If no events appear, webhook is not configured
- If events show "Failed", check webhook logs in Supabase

### Webhook Returns 500 Error

**Problem:** Webhook receives event but returns error

**Possible causes:**
1. Missing environment variables (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`)
2. Database RLS policies blocking updates
3. Invoice ID not found in metadata

**Solution:**
- Check Supabase Edge Function logs
- Verify environment variables are set
- Check that `invoice_id` is in Stripe session metadata

### Stock Not Updating

**Problem:** Invoice marked as paid but stock not updated

**Possible causes:**
1. `update-mozello-stock` function not deployed
2. Mozello API credentials incorrect
3. Product ID missing in invoice items

**Solution:**
- Check `stock_update_status` field in invoice
- Check `update-mozello-stock` function logs
- Verify Mozello API credentials

## Testing with Stripe CLI (Local Development)

For local testing, use Stripe CLI to forward webhooks:

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to local Supabase
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook

# In another terminal, trigger test payment
stripe trigger checkout.session.completed
```

## Important Notes

1. **Test vs Live Mode:**
   - Test mode webhooks: https://dashboard.stripe.com/test/webhooks
   - Live mode webhooks: https://dashboard.stripe.com/webhooks
   - **You need separate webhook endpoints for test and live!**

2. **Webhook Security:**
   - Always verify webhook signatures (already done in the function)
   - Never expose webhook secrets
   - Use HTTPS for webhook URLs

3. **Idempotency:**
   - The webhook is idempotent - safe to call multiple times
   - If invoice is already `paid`, it won't update again

## Next Steps

After webhook is working:
1. ✅ Test with multiple invoices
2. ✅ Verify stock updates in Mozello
3. ✅ Switch to live mode when ready
4. ✅ Set up live mode webhook endpoint
5. ✅ Update environment variables for live mode


