# Stripe Payment Methods Setup Guide

## Overview

This guide explains how to set up payment methods for **development/testing** and what to do when you go **live**.

---

## Part 1: Development/Test Mode Setup

### Step 1: Enable Payment Methods in Stripe Dashboard

1. **Go to Stripe Dashboard**
   - Navigate to: https://dashboard.stripe.com/test/settings/payment_methods
   - Make sure you're in **Test mode** (toggle in top right)

2. **Enable Payment Methods**
   - Scroll to find each payment method
   - Click the toggle to **enable** each one:

   **For Baltic Countries (Recommended):**
   - ✅ **Cards** (Credit/debit cards) - Usually enabled by default
   - ✅ **SEPA Direct Debit** - For Latvian banks (Citadele, Luminor, Swedbank, SEB)
   - ✅ **Klarna** - Buy now, pay later (available in Baltic countries)
   - ✅ **PayPal** - Digital wallet

3. **Save Changes**
   - Changes are saved automatically
   - No need to redeploy code

### Step 2: Verify Payment Methods Are Enabled

1. Go to: **Settings** → **Payment methods**
2. Check that these show as **Enabled**:
   - Cards
   - SEPA Direct Debit
   - Klarna
   - PayPal

### Step 3: Test Payment Methods

#### Test Cards (Always Available)
```
Card Number: 4242 4242 4242 4242
Expiry: Any future date (e.g., 12/25)
CVC: Any 3 digits (e.g., 123)
ZIP: Any 5 digits (e.g., 12345)
```

#### Test SEPA Direct Debit
- Use test IBAN: `DE89370400440532013000`
- Or any valid SEPA IBAN format
- Stripe will simulate the payment

#### Test Klarna
- Use test card: `4242 4242 4242 4242`
- Klarna will appear as an option if enabled

#### Test PayPal
- Use PayPal test account
- Or use test card through PayPal

---

## Part 2: Live Mode Setup (When Going Live)

### Step 1: Switch to Live Mode

1. **In Stripe Dashboard:**
   - Click the **"Test mode"** toggle in top right
   - Switch to **"Live mode"**
   - Confirm the switch

### Step 2: Enable Payment Methods in Live Mode

1. **Go to Live Mode Payment Methods:**
   - Navigate to: https://dashboard.stripe.com/settings/payment_methods
   - Make sure you're in **Live mode**

2. **Enable Same Payment Methods:**
   - ✅ Cards
   - ✅ SEPA Direct Debit
   - ✅ Klarna
   - ✅ PayPal

3. **Important Notes:**
   - Some payment methods require **account verification**
   - SEPA requires business verification
   - Klarna may require additional setup
   - PayPal requires PayPal account connection

### Step 3: Set Up Custom Domain (Live Mode Only)

1. **In Stripe Dashboard:**
   - Go to **Settings** → **Branding** → **Custom domains**
   - Click **"Add your domain"**
   - Enter: `checkout.piffdeals.lv`

2. **Add DNS Record:**
   - Stripe will provide a CNAME record
   - Add it to your domain DNS (where you manage piffdeals.lv)
   - Example:
     ```
     Type: CNAME
     Name: checkout
     Value: [stripe-provided-value]
     ```

3. **Wait for Verification:**
   - Wait 5-60 minutes for DNS propagation
   - Stripe will automatically verify
   - Once verified, checkout uses `checkout.piffdeals.lv`

---

## Payment Methods Configuration

### Current Setup (In Code)

Your code already has these payment methods configured:

```typescript
payment_method_types: [
  'card',           // Credit/debit cards
  'sepa_debit',     // SEPA Direct Debit (Latvian banks)
  'klarna',         // Klarna (buy now, pay later)
  'paypal',         // PayPal
]
```

### What You Need to Do

**In Stripe Dashboard:**
- Enable these payment methods
- That's it! The code is already configured

**No code changes needed** - just enable in Stripe Dashboard.

---

## Testing Checklist

### Development/Test Mode

- [ ] Enable Cards in test mode
- [ ] Enable SEPA Direct Debit in test mode
- [ ] Enable Klarna in test mode (if available)
- [ ] Enable PayPal in test mode (if available)
- [ ] Test with test card: `4242 4242 4242 4242`
- [ ] Test SEPA with test IBAN: `DE89370400440532013000`
- [ ] Verify Latvian language appears
- [ ] Verify payment methods show in checkout

### Live Mode (When Ready)

- [ ] Switch to Live mode
- [ ] Enable all payment methods in live mode
- [ ] Complete account verification (if required)
- [ ] Set up custom domain: `checkout.piffdeals.lv`
- [ ] Add DNS record
- [ ] Verify custom domain works
- [ ] Test with real payment methods
- [ ] Test with real Latvian bank accounts (SEPA)

---

## Payment Methods Details

### 1. Cards (Credit/Debit)
- **Status:** Usually enabled by default
- **Test:** Use `4242 4242 4242 4242`
- **Live:** Works automatically
- **Requirements:** None

### 2. SEPA Direct Debit
- **Status:** Must be enabled manually
- **Test:** Use test IBAN `DE89370400440532013000`
- **Live:** Requires business verification
- **Requirements:** 
  - Business verification
  - Bank account in SEPA zone
  - Works with ALL Latvian banks (Citadele, Luminor, Swedbank, SEB)

### 3. Klarna
- **Status:** Must be enabled manually
- **Test:** Use test card through Klarna
- **Live:** May require additional setup
- **Requirements:**
  - Available in Baltic countries
  - May need to contact Klarna for activation

### 4. PayPal
- **Status:** Must be enabled manually
- **Test:** Use PayPal test account
- **Live:** Requires PayPal account connection
- **Requirements:**
  - Connect your PayPal business account
  - Popular in Baltic region

---

## Troubleshooting

### Payment Method Not Showing?

1. **Check if enabled in Dashboard:**
   - Go to Settings → Payment methods
   - Verify it's toggled ON

2. **Check account status:**
   - Some methods require account verification
   - Check for any pending requirements

3. **Check test vs live mode:**
   - Make sure you're testing in the correct mode
   - Test mode uses test payment methods
   - Live mode uses real payment methods

### SEPA Not Working?

1. **Verify SEPA is enabled:**
   - Settings → Payment methods → SEPA Direct Debit

2. **Check business verification:**
   - Some countries require business verification
   - Check Stripe Dashboard for requirements

3. **Test with test IBAN:**
   - Use: `DE89370400440532013000`
   - Should work in test mode

---

## Quick Start

### For Development (Right Now):

1. **Enable Payment Methods:**
   ```
   Stripe Dashboard → Settings → Payment methods
   Enable: Cards, SEPA, Klarna, PayPal
   ```

2. **Test:**
   ```
   Create invoice → Click "Gatavs nosūtīšanai"
   → Click "Apmaksāt šeit"
   → Should see all payment methods
   ```

3. **Done!** Everything works with `checkout.stripe.com`

### For Production (When Live):

1. **Switch to Live Mode**
2. **Enable Payment Methods** (same as test)
3. **Set Up Custom Domain** (10 minutes)
4. **Done!** Checkout uses `checkout.piffdeals.lv`

---

## Summary

**Development:**
- ✅ Enable payment methods in Stripe Dashboard (test mode)
- ✅ Test with test cards/IBANs
- ✅ Everything works with `checkout.stripe.com`

**Production:**
- ✅ Switch to live mode
- ✅ Enable payment methods (live mode)
- ✅ Set up custom domain: `checkout.piffdeals.lv`
- ✅ Test with real payment methods

**No code changes needed** - just enable in Stripe Dashboard!


