# Stripe Checkout - Latvian Language Setup

## Current Configuration ✅

Your checkout is **already configured** to use Latvian language!

### In Code (`create-stripe-payment-link/index.ts`):

```typescript
// Language - Set to Latvian
locale: 'lv', // Latvian
```

### Additional Latvian Text:

```typescript
custom_text: {
  submit: {
    message: `Apmaksāt rēķinu ${invoice.invoice_number}`,
  },
  shipping_address: {
    message: 'Lūdzu, ievadiet savu adresi',
  },
  terms_of_service_acceptance: {
    message: 'Noklikšķinot, jūs piekrītat maksājuma noteikumiem',
  },
},
```

### SEPA Mandate in Latvian:

```typescript
payment_method_options: {
  sepa_debit: {
    mandate_options: {
      preferred_locale: 'lv', // Latvian language for mandate
    },
  },
},
```

---

## How Stripe Determines Language

Stripe uses the `locale` parameter to set the checkout language. However, there are a few things that can affect it:

### 1. Browser Language (Can Override)

If a customer's browser is set to a different language, Stripe might:
- Show a language selector
- Auto-detect browser language
- Prefer browser language over `locale` setting

**Solution:** The `locale: 'lv'` setting forces Latvian, but Stripe may still show a language selector.

### 2. Customer Location

Stripe may adjust language based on customer's detected location.

**Solution:** `locale: 'lv'` should override this.

### 3. Stripe Account Settings

Your Stripe account's default language can affect checkout.

**Check in Stripe Dashboard:**
- Settings → Localization
- Make sure default is set correctly

---

## Verifying Latvian Language

### Test the Checkout:

1. Create a test invoice
2. Click "Gatavs nosūtīšanai"
3. Click "Apmaksāt šeit"
4. Check the checkout page:
   - Should show Latvian text
   - Button should say "Apmaksāt" or similar
   - Form labels in Latvian

### What You Should See:

- ✅ Form labels in Latvian
- ✅ Button text in Latvian
- ✅ Error messages in Latvian
- ✅ Payment method names (may be in English, but interface is Latvian)
- ✅ SEPA mandate in Latvian

---

## If Language Is Not Latvian

### Check 1: Verify Code

Make sure `locale: 'lv'` is set in:
`supabase/functions/create-stripe-payment-link/index.ts`

### Check 2: Clear Browser Cache

- Clear browser cache
- Try incognito/private mode
- Stripe may cache language preferences

### Check 3: Browser Language

- Customer's browser language might override
- Stripe shows language selector if browser language differs
- Customer can manually select Latvian

### Check 4: Redeploy Edge Function

If you changed the code:
```bash
# Redeploy the edge function
supabase functions deploy create-stripe-payment-link
```

---

## Available Locales

If you need to change language, here are common options:

- `'lv'` - Latvian ✅ (Current)
- `'en'` - English
- `'et'` - Estonian
- `'lt'` - Lithuanian
- `'ru'` - Russian
- `'de'` - German
- `'fr'` - French

Full list: https://stripe.com/docs/checkout/languages

---

## Force Latvian (No Language Selector)

If you want to **force** Latvian and hide language selector:

```typescript
locale: 'lv',
// This should force Latvian
// But Stripe may still show selector based on browser
```

**Note:** Stripe may still show a language selector if:
- Customer's browser is set to different language
- Customer is in a different country
- This is normal behavior

---

## Custom Latvian Text

You can add more Latvian text:

```typescript
custom_text: {
  submit: {
    message: `Apmaksāt rēķinu ${invoice.invoice_number}`,
  },
  shipping_address: {
    message: 'Lūdzu, ievadiet savu adresi',
  },
  terms_of_service_acceptance: {
    message: 'Noklikšķinot, jūs piekrītat maksājuma noteikumiem',
  },
  // Add more custom text if needed
},
```

---

## Summary

✅ **Your checkout is already set to Latvian!**

- `locale: 'lv'` is configured
- Custom Latvian text is set
- SEPA mandate is in Latvian

**If you're not seeing Latvian:**
1. Clear browser cache
2. Try incognito mode
3. Check browser language settings
4. Redeploy edge function if code was changed

The checkout should display in Latvian for most customers. Some may see a language selector if their browser is set to a different language, but they can select Latvian.


