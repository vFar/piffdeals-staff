# Stripe Checkout Customization Guide

## Overview

We've switched from Stripe Payment Links to **Stripe Checkout Sessions** for better customization, Latvian language support, and European payment methods.

## What Changed

### Before (Payment Links)
- Limited customization
- No language options
- Only card payments
- Stripe branding

### After (Checkout Sessions)
- ✅ Latvian language (`locale: 'lv'`)
- ✅ European payment methods (SEPA, iDEAL, Bancontact, etc.)
- ✅ Custom branding (logo, colors)
- ✅ Custom text in Latvian
- ✅ Better user experience

## Payment Methods Enabled

The checkout now supports:

1. **Card** - Credit/debit cards (Visa, Mastercard, etc.)
2. **SEPA Direct Debit** - European bank transfers (Latvia, EU)
3. **iDEAL** - Netherlands
4. **Bancontact** - Belgium
5. **EPS** - Austria
6. **Giropay** - Germany
7. **Przelewy24 (P24)** - Poland
8. **BLIK** - Poland
9. **Sofort** - Germany, Austria

## Customization Steps

### 1. Add Your Logo (Recommended)

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Settings** → **Branding**
3. Upload your PiffDeals logo
4. The logo will automatically appear on checkout pages

### 2. Customize Colors (Optional)

In Stripe Dashboard → Settings → Branding:
- Set primary color to match PiffDeals brand (#0068FF)
- Set background color
- Preview changes

### 3. Test the Checkout

1. Create a test invoice
2. Click "Gatavs nosūtīšanai"
3. Click "Apmaksāt šeit"
4. You should see:
   - Latvian language interface
   - Multiple payment method options
   - PiffDeals branding (if logo uploaded)

## Code Configuration

The checkout is configured in:
`supabase/functions/create-stripe-payment-link/index.ts`

Key settings:
- `locale: 'lv'` - Latvian language
- `payment_method_types` - European payment methods
- `custom_text` - Latvian text for buttons
- `success_url` / `cancel_url` - Redirect after payment

## Success/Cancel URLs

After payment, customers are redirected to:
- **Success**: `/i/{public_token}?payment=success`
- **Cancel**: `/i/{public_token}?payment=cancelled`

You can customize these in the edge function if needed.

## Testing

### Test Mode
- Use Stripe test cards: `4242 4242 4242 4242`
- Test SEPA: Use test bank account details
- All payment methods work in test mode

### Live Mode
- Ensure your Stripe account is activated
- Add your bank account for payouts
- Test with real payment methods

## Additional Customization Options

### Add More Payment Methods

Edit `payment_method_types` array in the edge function:
```typescript
payment_method_types: [
  'card',           // Always include - most popular
  'sepa_debit',     // For Latvian/EU banks (Citadele, Luminor, Swedbank, SEB)
  'klarna',         // Buy now, pay later
  'paypal',         // Digital wallet
  // Add more as needed
],
```

### Latvian Banks Supported via SEPA

When customers select **SEPA Direct Debit**, they can pay directly from their bank account. This works with:
- ✅ **Citadele** (Latvia)
- ✅ **Luminor** (Latvia, Estonia, Lithuania)
- ✅ **Swedbank** (Latvia, Estonia, Lithuania)
- ✅ **SEB** (Latvia, Estonia, Lithuania)
- ✅ **All other SEPA-compliant banks** in Latvia, Estonia, Lithuania

**Note:** Stripe doesn't show individual bank logos, but when customers select SEPA Direct Debit, they'll be redirected to their bank's login page (Citadele, Luminor, etc.) to complete the payment.

### Change Language

Change `locale: 'lv'` to:
- `'en'` - English
- `'de'` - German
- `'fr'` - French
- See [Stripe Locales](https://stripe.com/docs/checkout/languages) for full list

### Custom Success Message

Edit `custom_text.submit.message` in Latvian:
```typescript
custom_text: {
  submit: {
    message: `Apmaksāt rēķinu ${invoice.invoice_number}`,
  },
}
```

## Troubleshooting

### Payment methods not showing?
- Check if payment methods are enabled in your Stripe account
- Some methods require account verification
- Test mode has limited payment methods

### Language not changing?
- Clear browser cache
- Check if locale is set correctly
- Some browsers may override language

### Logo not appearing?
- Ensure logo is uploaded in Stripe Dashboard
- Logo must be in PNG/JPG format
- Recommended size: 128x128px or larger

## Custom Domain Setup (Recommended) ⭐

### What is Custom Domain?
Instead of `checkout.stripe.com`, use `checkout.piffdeals.lv` - looks more professional and branded!

### Setup Steps:
1. **In Stripe Dashboard:**
   - Settings → Branding → Custom domains
   - Click "Add your domain"
   - Enter: `checkout.piffdeals.lv`

2. **Add DNS Record:**
   - Stripe will provide a CNAME record
   - Add it to your domain DNS settings
   - Wait 5-60 minutes for verification

3. **Done!**
   - No code changes needed
   - Checkout automatically uses your domain
   - Looks professional and branded

### Benefits:
- ✅ Professional appearance
- ✅ Customer trust (sees piffdeals.lv, not stripe.com)
- ✅ Better branding
- ✅ No code changes required

See `STRIPE_EMBEDDED_VS_HOSTED.md` for detailed comparison of all options.

## Next Steps

1. ✅ Upload PiffDeals logo in Stripe Dashboard
2. ✅ **Set up Custom Domain** (10 minutes - highly recommended!)
3. ✅ Test checkout with different payment methods
4. ✅ Customize colors to match brand
5. ✅ Test in production mode

## Support

For more customization options, see:
- [Stripe Checkout Customization](https://stripe.com/docs/payments/checkout/customization)
- [Stripe Localization](https://stripe.com/docs/localization)
- [Stripe Payment Methods](https://stripe.com/docs/payments/payment-methods)

