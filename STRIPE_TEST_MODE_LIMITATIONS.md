# Stripe Test Mode Limitations

## Custom Domains in Test Mode

### ⚠️ Important: Custom Domains Not Available in Test Mode

Stripe **does not support custom domains in sandbox/test mode**. This is a Stripe platform limitation, not a bug.

### What This Means

**Test/Sandbox Mode:**
- ✅ All functionality works perfectly
- ✅ Uses `checkout.stripe.com` for checkout
- ✅ Uses `buy.stripe.com` for payment links
- ✅ Uses `billing.stripe.com` for customer portal
- ❌ Custom domains are disabled

**Live Mode:**
- ✅ Everything from test mode works
- ✅ **PLUS** custom domains are available
- ✅ Can use `checkout.piffdeals.lv`
- ✅ Can use `buy.piffdeals.lv`
- ✅ Can use `billing.piffdeals.lv`

## What to Do

### For Testing (Now)
1. ✅ Test everything with `checkout.stripe.com`
2. ✅ All payment methods work
3. ✅ All features work
4. ✅ Latvian language works
5. ✅ Baltic payment methods work
6. ✅ Everything functions perfectly

### For Production (When You Go Live)
1. Switch to **Live mode** in Stripe Dashboard
2. Set up custom domain (10 minutes)
3. Add DNS record
4. Done! Checkout automatically uses your domain

## Why This Limitation Exists

Stripe restricts custom domains to live mode for:
- **Security:** Prevents test domains from being used maliciously
- **Compliance:** Ensures proper domain verification
- **Support:** Reduces support burden for test environments

## Current Status

**Your checkout is working perfectly!**
- ✅ Latvian language
- ✅ Baltic payment methods (SEPA, cards, Klarna, PayPal)
- ✅ PiffDeals branding (logo, colors)
- ✅ All features functional

The only difference is the URL:
- **Test:** `checkout.stripe.com/c/pay/...`
- **Live (with custom domain):** `checkout.piffdeals.lv/c/pay/...`

## Recommendation

**Don't worry about custom domain until you go live!**

1. ✅ Continue testing with `checkout.stripe.com`
2. ✅ Everything works perfectly
3. ✅ When ready for production, switch to live mode
4. ✅ Then set up custom domain (10 minutes)
5. ✅ No code changes needed

## Summary

- **Test mode:** Custom domains disabled (Stripe limitation)
- **Live mode:** Custom domains available
- **Your code:** Works the same in both modes
- **Action needed:** None until you go live

The checkout is fully functional - the custom domain is just a nice-to-have for branding when you go live!


