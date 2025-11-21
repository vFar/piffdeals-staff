# Stripe Payment Methods - Baltic Countries Configuration

## Recommended Configuration for Latvia, Estonia, Lithuania

### ✅ KEEP ENABLED (Essential for Baltic)

1. **Cards** ✅
   - Credit/debit cards (Visa, Mastercard)
   - Works everywhere
   - Most popular payment method

2. **SEPA Direct Debit** ✅
   - **ESSENTIAL** - Works with ALL Latvian banks:
     - Citadele
     - Luminor
     - Swedbank
     - SEB
     - All other SEPA banks in Latvia, Estonia, Lithuania
   - Popular in Baltic region
   - ⚠️ **Requires webhooks** (delayed notification - 6 business days)

3. **Klarna** ✅
   - Buy now, pay later
   - Available in Baltic countries
   - Popular with customers

4. **PayPal** ✅
   - Digital wallet
   - Popular in Baltic region
   - Trusted by customers

### ✅ KEEP ENABLED (Global - Good to Have)

5. **Apple Pay** ✅
   - Works globally
   - Popular on mobile devices
   - No harm keeping it

6. **Google Pay** ✅
   - Works globally
   - Popular on mobile devices
   - No harm keeping it

7. **Link** ✅
   - Stripe's own wallet
   - Works globally
   - Convenient for repeat customers

---

## ❌ TURN OFF (Not Relevant for Baltic)

### Cards (Regional)
- ❌ **Cartes Bancaires** - France only
- ❌ **Korean cards** - South Korea only

### Wallets (Regional)
- ❌ **Kakao Pay** - South Korea
- ❌ **MB WAY** - Portugal
- ❌ **MobilePay** - Denmark, Finland (not Baltic)
- ❌ **Naver Pay** - South Korea
- ❌ **PAYCO** - South Korea
- ❌ **Revolut Pay** - Not needed (cards work)
- ❌ **Samsung Pay** - South Korea
- ❌ **Satispay** - Italy, Austria, etc.

### Vouchers
- ❌ **Multibanco** - Portugal

### Bank Redirects (Not Baltic)
- ❌ **Bancontact** - Belgium
- ❌ **BLIK** - Poland (not Baltic)
- ❌ **EPS** - Austria
- ❌ **giropay** - Germany
- ❌ **iDEAL** - Netherlands (already disabled)
- ❌ **Przelewy24** - Poland (already disabled)
- ❌ **Sofort** - Germany, Austria (already disabled)
- ❌ **TWINT** - Switzerland

### Bank Debits
- ❌ **ACH Direct Debit** - United States (already disabled)

### Bank Transfers
- ❌ **Bank transfer** - Already disabled (SEPA is better)

---

## Quick Action List

### Turn OFF These (Click "Turn off" or "Configure" → "Turn off"):

1. Cartes Bancaires
2. Kakao Pay
3. MB WAY
4. MobilePay
5. Naver Pay
6. PAYCO
7. Revolut Pay
8. Samsung Pay
9. Satispay
10. Multibanco
11. Bancontact
12. BLIK
13. EPS
14. giropay
15. TWINT

### Keep ENABLED:

1. ✅ Cards
2. ✅ SEPA Direct Debit (ESSENTIAL for Latvian banks)
3. ✅ Klarna
4. ✅ PayPal
5. ✅ Apple Pay
6. ✅ Google Pay
7. ✅ Link

---

## Important: SEPA Webhooks

### ⚠️ SEPA Requires Webhooks

SEPA Direct Debit is a **delayed notification** payment method:
- Payment takes **6 business days** to clear
- Funds not immediately available
- **You MUST use webhooks** to know when payment is confirmed

### Why Webhooks Are Critical:

Without webhooks:
- ❌ You might fulfill orders before payment clears
- ❌ Customer could cancel payment
- ❌ You lose money

With webhooks:
- ✅ You're notified when payment is confirmed
- ✅ Invoice marked as paid automatically
- ✅ Stock updated only after payment clears
- ✅ Safe and secure

### Your Webhook Setup:

Your code already handles this! The `stripe-webhook` function:
1. Receives webhook events from Stripe
2. Updates invoice status to `paid`
3. Updates Mozello stock
4. Handles SEPA delayed notifications

**Make sure webhook is configured:**
- Stripe Dashboard → Developers → Webhooks
- Endpoint: `https://[your-project].supabase.co/functions/v1/stripe-webhook`
- Events: `checkout.session.completed`, `payment_intent.succeeded`

---

## Final Configuration

### Enabled Payment Methods (7 total):

1. **Cards** - Credit/debit cards
2. **SEPA Direct Debit** - Latvian banks (Citadele, Luminor, Swedbank, SEB)
3. **Klarna** - Buy now, pay later
4. **PayPal** - Digital wallet
5. **Apple Pay** - Mobile wallet
6. **Google Pay** - Mobile wallet
7. **Link** - Stripe wallet

### Disabled Payment Methods:

Everything else - not relevant for Baltic countries.

---

## Summary

**For Baltic Countries (Latvia, Estonia, Lithuania):**

✅ **Keep:** Cards, SEPA, Klarna, PayPal, Apple Pay, Google Pay, Link
❌ **Turn off:** Everything else (regional payment methods not used in Baltics)

**Important:** Make sure webhooks are configured for SEPA (your code already handles this!)


