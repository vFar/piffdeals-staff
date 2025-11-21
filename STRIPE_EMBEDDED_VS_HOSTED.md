# Stripe Checkout: Embedded vs Hosted vs Custom Domain

## Overview

You have three options for Stripe Checkout:

1. **Hosted Checkout** (Current - Recommended) ✅
2. **Embedded Checkout** (More control, more complex)
3. **Custom Domain** (Professional branding)

---

## 1. Hosted Checkout (Current Setup) ✅ RECOMMENDED

### What it is:
- Customer clicks "Apmaksāt šeit"
- Redirects to `checkout.stripe.com` (or your custom domain)
- Completes payment on Stripe's secure page
- Redirects back to your invoice page

### Pros:
- ✅ **Simplest to implement** - Just redirect to URL
- ✅ **Most secure** - Handled entirely by Stripe
- ✅ **Mobile optimized** - Works perfectly on all devices
- ✅ **PCI compliant** - No card data touches your server
- ✅ **Easy to maintain** - Stripe handles all updates
- ✅ **Works with all payment methods** - SEPA, cards, Klarna, etc.

### Cons:
- ❌ Customer leaves your site (but comes back after payment)
- ❌ Less control over exact UI (but highly customizable)

### Current Implementation:
```typescript
// In create-stripe-payment-link/index.ts
const session = await stripe.checkout.sessions.create({...})
// Returns: session.url
// Customer redirected to: session.url
```

---

## 2. Embedded Checkout (Advanced)

### What it is:
- Checkout form embedded directly in your invoice page
- Customer never leaves your site
- Payment happens in an iframe/embedded component

### Pros:
- ✅ Customer stays on your site
- ✅ More seamless experience
- ✅ Full control over page layout

### Cons:
- ❌ **More complex** - Requires frontend integration
- ❌ **More code** - Need to load Stripe.js and handle embedding
- ❌ **Mobile can be tricky** - iframe handling on mobile
- ❌ **More maintenance** - You handle updates
- ❌ **Limited payment methods** - Some methods don't work well embedded

### Implementation Required:
1. Load Stripe.js in your frontend
2. Create checkout session (same as now)
3. Embed checkout using Stripe.js
4. Handle success/cancel callbacks

### Code Example (if you want to switch):
```typescript
// Frontend: PublicInvoice.jsx
import { loadStripe } from '@stripe/stripe-js';

const stripe = await loadStripe('pk_test_...');
const checkout = await stripe.initEmbeddedCheckout({
  clientSecret: session.client_secret
});
checkout.mount('#checkout-container');
```

---

## 3. Custom Domain (Professional Branding) ⭐ RECOMMENDED

### What it is:
- Use your own domain instead of `checkout.stripe.com`
- Example: `checkout.piffdeals.lv` instead of `checkout.stripe.com`
- Customer sees your domain, not Stripe's

### Pros:
- ✅ **Professional** - Looks like your own checkout
- ✅ **Trust** - Customers see piffdeals.lv, not stripe.com
- ✅ **Branding** - Matches your website
- ✅ **Easy to set up** - Just DNS configuration
- ✅ **Works with Hosted Checkout** - No code changes needed!

### Cons:
- ❌ Requires DNS setup (one-time)
- ❌ Requires SSL certificate (Stripe provides)

### Setup Steps:

1. **In Stripe Dashboard:**
   - Go to Settings → Branding → Custom domains
   - Click "Add your domain"
   - Enter: `checkout.piffdeals.lv` (or similar)

2. **Stripe will give you DNS records:**
   ```
   Type: CNAME
   Name: checkout
   Value: [stripe-provided-value]
   ```

3. **Add DNS record in your domain provider:**
   - Go to your domain DNS settings (where you manage piffdeals.lv)
   - Add the CNAME record Stripe provides
   - Wait for DNS propagation (5-60 minutes)

4. **Verify in Stripe:**
   - Stripe will verify the domain
   - Once verified, checkout will use your domain!

### Result:
- Before: `checkout.stripe.com/c/pay/...`
- After: `checkout.piffdeals.lv/c/pay/...`

**No code changes needed!** Your current implementation will automatically use the custom domain once configured.

---

## Recommendation for PiffDeals

### Best Option: **Hosted Checkout + Custom Domain** ✅

**Why:**
1. ✅ Simple - No code changes needed
2. ✅ Professional - Custom domain looks branded
3. ✅ Secure - Stripe handles everything
4. ✅ Works with all payment methods
5. ✅ Mobile friendly
6. ✅ Easy to maintain

### Steps:
1. **Set up Custom Domain** (5 minutes)
   - Add DNS record
   - Verify in Stripe
   - Done! Checkout now uses `checkout.piffdeals.lv`

2. **Keep Hosted Checkout** (no changes needed)
   - Current code works perfectly
   - Just redirects to checkout URL
   - Custom domain is automatic

### When to Consider Embedded:
- Only if you need customers to stay on your page
- If you want to build a completely custom checkout experience
- If you're willing to maintain more complex code

---

## Quick Comparison

| Feature | Hosted | Embedded | Custom Domain |
|---------|--------|----------|---------------|
| Setup Time | ✅ 5 min | ❌ 2-4 hours | ✅ 10 min |
| Code Changes | ✅ None | ❌ Significant | ✅ None |
| Security | ✅ High | ✅ High | ✅ High |
| Mobile | ✅ Perfect | ⚠️ Can be tricky | ✅ Perfect |
| Branding | ⚠️ Limited | ✅ Full | ✅ Full |
| Maintenance | ✅ Easy | ❌ Complex | ✅ Easy |
| Payment Methods | ✅ All | ⚠️ Some limited | ✅ All |

---

## Next Steps

1. **Set up Custom Domain** (Recommended)
   - Follow steps above
   - Takes 10 minutes
   - Makes checkout look professional

2. **Keep Hosted Checkout** (Current)
   - No changes needed
   - Works perfectly
   - Custom domain will be used automatically

3. **Optional: Consider Embedded Later**
   - Only if you need more control
   - Requires frontend changes
   - More complex to maintain

---

## Custom Domain Setup Guide

### Step 1: In Stripe Dashboard
1. Go to **Settings** → **Branding** → **Custom domains**
2. Click **"Add your domain"**
3. Enter: `checkout.piffdeals.lv`
4. Click **"Get started"**

**⚠️ Important:** Custom domains are **NOT supported in sandbox/test mode**. You can only set up custom domains when you switch to **live mode**. This is a Stripe limitation.

- **Test mode:** Uses `checkout.stripe.com` (this is fine for testing)
- **Live mode:** Can use `checkout.piffdeals.lv` (set up when you go live)

### Step 2: Add DNS Record
Stripe will show you a CNAME record like:
```
Type: CNAME
Name: checkout
Value: checkout.stripe.com
```

Add this to your domain DNS (where you manage piffdeals.lv).

### Step 3: Wait & Verify
- Wait 5-60 minutes for DNS propagation
- Stripe will automatically verify
- Once verified, checkout uses your domain!

### Step 4: Test
1. Create a test invoice
2. Click "Apmaksāt šeit"
3. Check URL - should be `checkout.piffdeals.lv` instead of `checkout.stripe.com`

---

## Summary

**For PiffDeals, I recommend:**
1. ✅ **Set up Custom Domain** - Makes checkout look professional
2. ✅ **Keep Hosted Checkout** - Simple, secure, works perfectly
3. ❌ **Skip Embedded** - Not needed, adds complexity

The custom domain gives you professional branding without any code changes!

