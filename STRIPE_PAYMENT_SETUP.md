# Stripe Payment Integration Setup Guide

## Overview

This guide will help you set up Stripe payment integration with your staff portal. When employees create and send invoices, a Stripe payment link is automatically generated. When customers pay, the invoice status automatically updates to "paid" and stock is updated in your Mozello store.

---

## 🎯 Features

- ✅ **Automatic Payment Link Generation** - Stripe payment links created when invoice is sent
- ✅ **Real-time Payment Updates** - Webhook automatically updates invoice status when paid
- ✅ **Automatic Stock Updates** - Mozello stock decreases when payment is received
- ✅ **Live Dashboard Updates** - Employees see status changes in real-time
- ✅ **No Manual Work** - Everything happens automatically

---

## 📋 Prerequisites

1. **Stripe Account** - Sign up at [stripe.com](https://stripe.com)
2. **Mozello API Access** - Get your API credentials from Mozello
3. **Supabase Project** - Your existing project
4. **Supabase CLI** - Install from [supabase.com/docs/guides/cli](https://supabase.com/docs/guides/cli)

---

## 🛠️ Step 1: Database Schema Updates

Run this SQL in your Supabase SQL Editor to add Stripe-related fields:

```sql
-- Add Stripe and stock update columns to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stripe_payment_link TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stripe_payment_link_id TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'stripe';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stock_updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stock_update_status TEXT CHECK (stock_update_status IN ('pending', 'completed', 'failed', 'partial'));

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_payment_link_id ON invoices(stripe_payment_link_id);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_reference ON invoices(payment_method);
CREATE INDEX IF NOT EXISTS idx_invoices_stock_update_status ON invoices(stock_update_status);

-- Add comment for documentation
COMMENT ON COLUMN invoices.stripe_payment_link IS 'Stripe payment link URL sent to customer';
COMMENT ON COLUMN invoices.stripe_payment_link_id IS 'Stripe payment link ID for reference';
COMMENT ON COLUMN invoices.stripe_payment_intent_id IS 'Stripe payment intent ID when payment is received';
COMMENT ON COLUMN invoices.stock_update_status IS 'Status of Mozello stock update: pending, completed, failed, partial';
```

---

## 🔑 Step 2: Get Your Stripe Keys

### 1. Get API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers → API keys**
3. Copy:
   - **Publishable key** (starts with `pk_`)
   - **Secret key** (starts with `sk_`)

### 2. Create Webhook

1. Go to **Developers → Webhooks**
2. Click **Add endpoint**
3. Enter webhook URL: `https://YOUR_PROJECT_ID.supabase.co/functions/v1/stripe-webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Click **Add endpoint**
6. Copy the **Webhook signing secret** (starts with `whsec_`)

---

## 🌍 Step 3: Environment Variables

### Add to Supabase (Required for Edge Functions)

1. Go to **Supabase Dashboard → Project Settings → Edge Functions**
2. Add these secrets:

```bash
STRIPE_SECRET_KEY=sk_live_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
MOZELLO_API_URL=https://api.mozello.com/v1
MOZELLO_API_KEY=your_mozello_api_key_here
```

### Add to Your Frontend (.env.local)

Create a `.env.local` file in your project root:

```env
# Supabase (you already have these)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Stripe (for frontend - if needed)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key_here

# Mozello (for frontend product fetching)
VITE_MOZELLO_API_URL=https://api.mozello.com/v1
VITE_MOZELLO_API_KEY=your_mozello_api_key_here
```

---

## 🚀 Step 4: Deploy Edge Functions

### Deploy all functions at once:

```bash
# Navigate to your project directory
cd C:\Users\Markuss\Desktop\piffdeals-staff

# Login to Supabase (if not already logged in)
supabase login

# Link to your project (if not already linked)
supabase link --project-ref your-project-ref

# Deploy all Edge Functions
supabase functions deploy create-stripe-payment-link
supabase functions deploy stripe-webhook
supabase functions deploy update-mozello-stock
```

### Or use the deployment scripts:

**Windows (PowerShell):**
```powershell
.\deploy-edge-function.ps1
```

**Linux/Mac (Bash):**
```bash
./deploy-edge-function.sh
```

---

## ✅ Step 5: Test the Integration

### 1. Create a Test Invoice

1. Go to `/invoices/create`
2. Fill in customer details
3. Add test products
4. Click **Send Invoice**
5. You should see a payment link generated

### 2. Test Payment

1. Open the generated payment link in another browser/incognito
2. Use Stripe test card: `4242 4242 4242 4242`
3. Enter any future expiry date and CVC
4. Complete payment

### 3. Verify Automation

- ✅ Invoice status should change to `paid` automatically
- ✅ `paid_date` should be set
- ✅ Mozello stock should decrease
- ✅ Employee sees update in real-time

---

## 🔍 Step 6: Verify Everything is Working

### Check Stripe Webhook

1. Go to **Stripe Dashboard → Developers → Webhooks**
2. Click on your webhook
3. Check **Recent deliveries** tab
4. Should show successful deliveries (200 status)

### Check Supabase Logs

1. Go to **Supabase Dashboard → Edge Functions**
2. Click on each function to see logs
3. Check for any errors

### Check Invoice in Database

```sql
SELECT 
  invoice_number,
  status,
  stripe_payment_link,
  stripe_payment_intent_id,
  paid_date,
  stock_update_status
FROM invoices
WHERE stripe_payment_link IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

---

## 🎨 Step 7: Customize (Optional)

### Change Tax Rate

Edit `src/pages/CreateInvoice.jsx`:

```javascript
const calculateTax = () => {
  return calculateSubtotal() * 0.21; // Change 0.21 to your tax rate (e.g., 0.18 for 18%)
};
```

### Change Currency

Edit `supabase/functions/create-stripe-payment-link/index.ts`:

```typescript
price_data: {
  currency: 'eur', // Change to 'usd', 'gbp', etc.
  // ...
}
```

### Customize Payment Success Message

Edit `supabase/functions/create-stripe-payment-link/index.ts`:

```typescript
after_completion: {
  type: 'hosted_confirmation',
  hosted_confirmation: {
    custom_message: `Your custom message here`,
  },
},
```

---

## 📊 How It Works: Complete Flow

```
1. Employee creates invoice
   └─> Status: 'draft'
   
2. Employee clicks "Send Invoice"
   └─> Edge Function: create-stripe-payment-link
       ├─> Creates Stripe Payment Link
       ├─> Saves link to invoice
       └─> Updates status to 'sent'
   
3. Employee copies payment link
   └─> Sends to customer via email/WhatsApp
   
4. Customer opens link & pays
   └─> Stripe processes payment
   
5. Stripe sends webhook
   └─> Edge Function: stripe-webhook
       ├─> Verifies webhook signature
       ├─> Updates invoice to 'paid'
       ├─> Sets paid_date
       └─> Triggers stock update
   
6. Stock update runs
   └─> Edge Function: update-mozello-stock
       ├─> Gets invoice items
       ├─> Calls Mozello API for each product
       ├─> Decreases stock quantities
       └─> Updates stock_update_status
   
7. Employee sees update
   └─> Real-time subscription shows "Paid" ✅
```

---

## 🐛 Troubleshooting

### Issue: Payment link not generating

**Check:**
- Edge Function is deployed: `supabase functions list`
- Stripe API key is set in Supabase secrets
- Invoice has items
- Check Edge Function logs in Supabase Dashboard

### Issue: Webhook not receiving events

**Check:**
- Webhook URL is correct in Stripe Dashboard
- Webhook secret is set in Supabase secrets
- Stripe is sending to the right endpoint
- Check webhook delivery attempts in Stripe Dashboard

### Issue: Stock not updating

**Check:**
- Mozello API credentials are correct
- Product IDs in invoice_items match Mozello products
- Check `update-mozello-stock` function logs
- Check `stock_update_status` in database

### Issue: Real-time updates not working

**Check:**
- Browser has internet connection
- No ad-blockers blocking WebSocket connections
- Supabase Realtime is enabled for `invoices` table
- User is authenticated

---

## 🔐 Security Best Practices

1. **Never expose Secret Keys**
   - Use environment variables
   - Don't commit `.env` files to Git
   - Use Supabase secrets for Edge Functions

2. **Verify Webhook Signatures**
   - Always verify Stripe webhook signatures (already implemented)
   - This prevents fake payment notifications

3. **Use HTTPS**
   - Supabase Edge Functions use HTTPS by default
   - Always use HTTPS in production

4. **Test in Test Mode First**
   - Use Stripe test keys initially
   - Only switch to live keys after testing

---

## 📝 Going Live Checklist

- [ ] Test complete flow with Stripe test cards
- [ ] Verify stock updates in Mozello test environment
- [ ] Check all webhook deliveries are successful
- [ ] Test real-time updates work
- [ ] Replace test keys with live keys
- [ ] Update webhook endpoint to use live keys
- [ ] Test with real payment (small amount)
- [ ] Monitor first few transactions closely
- [ ] Set up email notifications for failed payments (optional)

---

## 🎉 You're Done!

Your invoice system now has:
- ✅ Automated payment link generation
- ✅ Real-time payment tracking
- ✅ Automatic stock updates
- ✅ Zero manual work for employees

Need help? Check the logs in Supabase Dashboard or Stripe Dashboard for any errors.









