# 🔐 Stripe Setup Instructions

## Your Stripe Test Keys

**⚠️ IMPORTANT:** These are TEST keys - perfect for development. When going live, you'll need to replace them with production keys.

**Get your Stripe keys from:** https://dashboard.stripe.com/test/apikeys

```
Publishable Key (pk_test_...): 
pk_test_your_publishable_key_here

Secret Key (sk_test_...):
sk_test_your_secret_key_here
```

**⚠️ SECURITY:** Never commit actual API keys to Git. Always use placeholders in documentation.

## 📋 Setup Steps

### 1. Add Stripe Keys to Supabase

1. **Go to Supabase Dashboard:** https://supabase.com/dashboard
2. **Select your project:** piffdeals-staff
3. **Navigate to:** Project Settings (gear icon) > Edge Functions
4. **Scroll to:** Environment Variables
5. **Add this variable:**

```
Name: STRIPE_SECRET_KEY
Value: sk_test_your_stripe_secret_key_here
```

**Get your actual key from:** Stripe Dashboard > Developers > API keys > Secret key

6. **Click "Add variable"**

### 2. Set Up Stripe Webhook

1. **Go to Stripe Dashboard:** https://dashboard.stripe.com
2. **Navigate to:** Developers > Webhooks
3. **Click:** "Add endpoint"
4. **Enter Endpoint URL:**
   ```
   https://[YOUR-PROJECT-REF].supabase.co/functions/v1/stripe-webhook
   ```
   
   **To find YOUR-PROJECT-REF:**
   - Go to Supabase Dashboard
   - Project Settings > API
   - Look at the URL, it will be something like: `https://abcdefgh.supabase.co`
   - Copy the part before `.supabase.co` (e.g., `abcdefgh`)
   
   **Full example:** `https://abcdefgh.supabase.co/functions/v1/stripe-webhook`

5. **Select events to listen for:**
   - Click "Select events"
   - Search and select:
     - ✅ `checkout.session.completed`
     - ✅ `payment_intent.succeeded`
     - ✅ `payment_intent.payment_failed`
   - Click "Add events"

6. **Click "Add endpoint"**

7. **Get Webhook Signing Secret:**
   - After creating the endpoint, click on it
   - You'll see "Signing secret" - click "Reveal"
   - Copy the value (starts with `whsec_`)

8. **Add Webhook Secret to Supabase:**
   - Go back to Supabase Dashboard > Edge Functions > Environment Variables
   - Add this variable:
   ```
   Name: STRIPE_WEBHOOK_SECRET
   Value: whsec_[the value you just copied]
   ```

### 3. Test Stripe Connection

Once you've set up the webhook, you can test it:

1. **Create a test invoice** in your dashboard
2. **Send the invoice** (generates Stripe payment link)
3. **Click the payment link**
4. **Use Stripe test card:**
   - Card number: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/25`)
   - CVC: Any 3 digits (e.g., `123`)
   - ZIP: Any 5 digits (e.g., `12345`)

5. **Complete payment**
6. **Check your dashboard:** Invoice should update to "Paid" status

### 4. Monitor Webhook Events

In Stripe Dashboard > Developers > Webhooks:
- Click on your endpoint
- You'll see all webhook events received
- Click on individual events to see details
- Useful for debugging if something doesn't work

## ⚠️ Important Notes

### Test vs Production Keys

**Test Keys (what you have now):**
- Start with `pk_test_` or `sk_test_`
- Only work with test cards
- Perfect for development
- Free to use

**Production Keys (when going live):**
- Start with `pk_live_` or `sk_live_`
- Work with real cards
- Real money transactions
- Need to activate Stripe account fully

### When to Switch to Production

Switch to production keys when:
1. ✅ You've tested everything thoroughly
2. ✅ Your business is verified with Stripe
3. ✅ You're ready to accept real payments

To switch:
1. Get production keys from Stripe Dashboard
2. Update `STRIPE_SECRET_KEY` in Supabase
3. Create new webhook endpoint for production URL
4. Update `STRIPE_WEBHOOK_SECRET` in Supabase

### Security

**✅ DO:**
- Keep secret keys in environment variables
- Use HTTPS for webhook URLs
- Verify webhook signatures

**❌ DON'T:**
- Commit secret keys to git
- Share secret keys publicly
- Use test keys in production

## 🎉 Next Steps

After setting up Stripe:
1. Run database migrations (see `INVOICE_PUBLIC_SHARING_SETUP.md`)
2. Set up email service (Resend)
3. Deploy edge functions
4. Test the full invoice flow

## 🆘 Troubleshooting

### "Webhook signature verification failed"
- Check that `STRIPE_WEBHOOK_SECRET` matches the one in Stripe Dashboard
- Make sure you're using the correct webhook endpoint URL

### "Payment succeeded but invoice not updating"
- Check Supabase Edge Function logs
- Verify webhook events are being received in Stripe Dashboard
- Make sure `invoice_id` is in the payment link metadata

### "Cannot connect to Stripe"
- Verify `STRIPE_SECRET_KEY` is set correctly in Supabase
- Check that you're using the test key for test mode

---

**Need help?** Check the full setup guide in `INVOICE_PUBLIC_SHARING_SETUP.md`






