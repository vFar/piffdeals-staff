# 📧 Invoice Public Sharing & Payment Setup Guide

This guide will help you set up the public invoice sharing feature with Stripe payment integration.

## 🎯 What You'll Get

### For Your Staff:
- **View invoices** in dashboard
- **Share invoices** 3 ways:
  - 📥 **Download PDF** - Opens print dialog in browser
  - 🔗 **Copy Link** - Copies secure public URL to clipboard
  - 📧 **Send Email** - Sends professional email with invoice link to customer

### For Your Customers:
- **Receive email** with invoice link (or shared link)
- **View invoice** online - beautiful, professional design with product images
- **Pay online** - Secure Stripe payment button on invoice page
- **Print/Save PDF** - Using browser's print function (Ctrl+P)

## 🔐 Security Model

- **Invoice Number** (e.g., `#12345678`): Human-readable, displayed on invoice, searchable by staff
- **Public Token** (UUID): Used in URL only, unguessable (340 undecillion combinations)
- **Example URL**: `https://yoursite.com/i/a8f5f167-6f4f-4d8f-8b8f-1c8f5f167a8f`
- **Access**: Anyone with the link can view, but cannot guess other invoices

## 📋 Setup Steps

### Step 1: Run Database Migrations

Run these SQL files in your Supabase SQL Editor (in order):

```bash
# 1. Add public_token column for secure URLs
add-invoice-public-token.sql

# 2. Add Stripe payment tracking columns
add-stripe-payment-columns.sql
```

**Or run them via psql:**
```bash
psql -h db.xxxxx.supabase.co -U postgres -d postgres -f add-invoice-public-token.sql
psql -h db.xxxxx.supabase.co -U postgres -d postgres -f add-stripe-payment-columns.sql
```

### Step 2: Set Up Stripe

#### 2.1 Get Stripe API Keys

1. Go to [https://stripe.com](https://stripe.com)
2. Sign up or log in
3. Go to **Developers > API Keys**
4. Copy:
   - **Publishable key** (starts with `pk_`)
   - **Secret key** (starts with `sk_`)
   - **Webhook secret** (we'll get this in step 2.3)

#### 2.2 Set Stripe Environment Variables in Supabase

Go to **Supabase Dashboard > Project Settings > Edge Functions > Environment Variables**

Add these variables:
```
STRIPE_SECRET_KEY=sk_test_xxxxx...  (use your secret key)
STRIPE_WEBHOOK_SECRET=whsec_xxxxx... (get this in next step)
```

#### 2.3 Set Up Stripe Webhook

1. In Stripe Dashboard, go to **Developers > Webhooks**
2. Click **Add endpoint**
3. Enter webhook URL:
   ```
   https://xxxxx.supabase.co/functions/v1/stripe-webhook
   ```
   (Replace `xxxxx` with your Supabase project ref)
4. Select events to listen for:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add it to Supabase environment variables as `STRIPE_WEBHOOK_SECRET`

### Step 3: Set Up Email Service (Resend)

#### 3.1 Create Resend Account

1. Go to [https://resend.com](https://resend.com)
2. Sign up (free tier: 3,000 emails/month)
3. Verify your email
4. Go to **API Keys** in dashboard
5. Create new API key
6. Copy the key (starts with `re_`)

#### 3.2 Add Domain (Optional but Recommended)

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `yourdomain.com`)
4. Add the DNS records they provide to your domain provider
5. Wait for verification (usually 15 minutes)

**Without domain:** You can only send from `onboarding@resend.dev` (for testing)  
**With domain:** You can send from `noreply@yourdomain.com` (looks professional)

#### 3.3 Set Email Environment Variables

Go to **Supabase Dashboard > Project Settings > Edge Functions > Environment Variables**

Add these variables:
```
RESEND_API_KEY=re_xxxxx...  (your Resend API key)
FROM_EMAIL=noreply@yourdomain.com  (or onboarding@resend.dev for testing)
COMPANY_NAME=Your Company Name
PUBLIC_SITE_URL=https://yoursite.com  (your production URL)
```

### Step 4: Deploy Edge Functions

#### Deploy Stripe Payment Function
```powershell
# Windows (PowerShell)
.\deploy-stripe-functions.ps1

# Linux/Mac (Bash)
chmod +x deploy-stripe-functions.sh
./deploy-stripe-functions.sh
```

#### Deploy Email Function
```powershell
# Windows (PowerShell)
.\deploy-email-function.ps1

# Linux/Mac (Bash)
chmod +x deploy-email-function.sh
./deploy-email-function.sh
```

### Step 5: Update Company Information

In `src/pages/PublicInvoice.jsx`, update your company details (around line 270):

```jsx
<div>
  <div style={{ fontWeight: 600, marginBottom: 8 }}>Your Company Name</div>
  <div style={{ color: '#6b7280', lineHeight: 1.6 }}>
    <div>Your Address Street 123</div>
    <div>City, LV-1000, Latvia</div>
    <div>info@yourcompany.com</div>
    <div>Phone: +371 12345678</div>
  </div>
</div>
```

Also update the distances līgums link at the bottom:
```jsx
<a 
  href="https://www.yoursite.com/distances-ligums" 
  target="_blank" 
  rel="noopener noreferrer"
>
  Distances līgums
</a>
```

## 🧪 Testing

### Test Public Invoice Viewing

1. **Create a test invoice** in your dashboard
2. **Send the invoice** (this generates the public token and Stripe payment link)
3. **Click "Share"** button on the invoice
4. **Copy the public link**
5. **Open link in incognito/private window** (to test without authentication)
6. Verify:
   - ✅ Invoice displays correctly
   - ✅ Product images show up
   - ✅ "Pay Invoice" button appears
   - ✅ Print functionality works (Ctrl+P)

### Test Email Sending

1. In invoice view, click **"Share"**
2. Click **"Send email to customer"**
3. Check customer's email inbox
4. Verify:
   - ✅ Email received
   - ✅ Link works
   - ✅ Invoice opens correctly

### Test Stripe Payment

1. Open public invoice link
2. Click **"Pay Invoice"** button
3. Use Stripe test card:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
4. Complete payment
5. Check your dashboard:
   - ✅ Invoice status changes to "Paid"
   - ✅ Payment date is set
   - ✅ Stock updated in Mozello (if applicable)

## 📊 Environment Variables Summary

### Supabase Edge Functions Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `STRIPE_SECRET_KEY` | Stripe secret API key | `sk_test_xxxxx...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_xxxxx...` |
| `RESEND_API_KEY` | Resend email service API key | `re_xxxxx...` |
| `FROM_EMAIL` | Email address to send from | `noreply@yourdomain.com` |
| `COMPANY_NAME` | Your company name for emails | `Your Company Name` |
| `PUBLIC_SITE_URL` | Your production URL | `https://yoursite.com` |

## 🎨 Distances Līgums (Distance Contract)

**What is it?**  
A legal requirement for EU/Latvia online sales. It's a terms page that outlines:
- Consumer rights for online purchases
- Return policy
- Privacy policy
- Terms of service

**Do you need it?**  
Yes, if you sell to consumers in EU/Latvia.

**How to add it:**  
1. Create a terms page on your website (e.g., `/distances-ligums`)
2. Include:
   - Your company information
   - Return policy (14-day right of withdrawal)
   - Privacy policy
   - Payment terms
3. Update the link in `PublicInvoice.jsx` (line 415)

**Template:** You can find templates at:
- [Latvian Consumer Rights Center](https://ptac.gov.lv)
- Or hire a lawyer to create one

## 🔧 Troubleshooting

### Public token not generating

**Problem:** Invoice sent but no public link appears  
**Solution:** Check database trigger was created:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_invoice_sent_generate_token';
```

### Email not sending

**Problem:** "Email service not configured" error  
**Solution:** Verify Resend API key is set in Supabase environment variables

### Stripe payment not updating invoice

**Problem:** Payment succeeds but invoice stays "Sent"  
**Solution:** 
1. Check webhook is receiving events: Stripe Dashboard > Webhooks > Your endpoint
2. Verify `STRIPE_WEBHOOK_SECRET` matches the signing secret
3. Check Supabase Edge Function logs for errors

### Images not showing on public invoice

**Problem:** Products display but no images  
**Solution:** 
1. Verify Mozello API credentials are correct
2. Check product has images in Mozello
3. Check browser console for CORS errors

## 🚀 Next Steps

1. **Create a terms page** (distances līgums) on your website
2. **Test the full flow** with a real customer (friend/family)
3. **Update company information** in PublicInvoice.jsx
4. **Customize email template** if needed (in send-invoice-email/index.ts)
5. **Set up production Stripe keys** when ready to go live

## 📝 Notes

- **PDF Generation:** Uses browser's built-in print-to-PDF (Ctrl+P)
- **Security:** UUID tokens have 5.3×10³⁶ possible combinations (impossible to guess)
- **Storage:** No file storage needed - invoices are web pages
- **Responsive:** Works on mobile and desktop
- **Print-friendly:** Optimized CSS for printing

## 🆘 Need Help?

If you encounter issues:
1. Check Supabase Edge Function logs
2. Check browser console for errors
3. Verify all environment variables are set correctly
4. Test with Stripe test mode first

---

**Created:** November 2024  
**Version:** 1.0






