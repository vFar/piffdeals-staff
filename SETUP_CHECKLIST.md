# ✅ Setup Checklist

Complete these steps in order:

## 🗄️ Database Setup

### [ ] Step 1: Run Database Migrations

Open Supabase SQL Editor and run these files:

**File 1:** `add-invoice-public-token.sql`
```sql
-- Copy and paste the entire contents of add-invoice-public-token.sql
-- Then click "Run"
```

**File 2:** `add-stripe-payment-columns.sql`
```sql
-- Copy and paste the entire contents of add-stripe-payment-columns.sql
-- Then click "Run"
```

**How to verify:** Run this query in SQL Editor:
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'invoices' 
AND column_name IN ('public_token', 'stripe_payment_link', 'stripe_payment_link_id');
```
You should see 3 rows returned.

---

## 🔐 Stripe Setup

### [ ] Step 2: Add Stripe Secret Key to Supabase

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Go to: **Project Settings** (gear icon) > **Edge Functions**
4. Scroll to: **Environment Variables**
5. Click: **Add variable**
6. Enter:
   - **Name:** `STRIPE_SECRET_KEY`
   - **Value:** `sk_test_your_stripe_secret_key_here` (Get from Stripe Dashboard > Developers > API keys)
7. Click: **Save**

### [ ] Step 3: Set Up Stripe Webhook

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click: **Add endpoint**
3. **Endpoint URL:** `https://[YOUR-PROJECT-REF].supabase.co/functions/v1/stripe-webhook`
   
   **Find YOUR-PROJECT-REF:**
   - Supabase Dashboard > Project Settings > API
   - Look at "Project URL" - copy the part before `.supabase.co`
   - Example: If URL is `https://abcdefgh.supabase.co`, use `abcdefgh`

4. **Select events:**
   - ✅ `checkout.session.completed`
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`

5. Click: **Add endpoint**

6. **Copy Webhook Secret:**
   - Click on the endpoint you just created
   - Click "Reveal" next to "Signing secret"
   - Copy the value (starts with `whsec_`)

### [ ] Step 4: Add Webhook Secret to Supabase

1. Back in Supabase: **Edge Functions** > **Environment Variables**
2. Click: **Add variable**
3. Enter:
   - **Name:** `STRIPE_WEBHOOK_SECRET`
   - **Value:** `whsec_[the value you copied]`
4. Click: **Save**

---

## 📧 Email Setup (Resend)

### [ ] Step 5: Create Resend Account

1. Go to: https://resend.com
2. Click: **Sign Up**
3. Verify your email
4. Go to: **API Keys** in dashboard
5. Click: **Create API Key**
6. Copy the key (starts with `re_`)

### [ ] Step 6: Add Resend Variables to Supabase

Add these environment variables in Supabase (same place as before):

**Variable 1:**
- **Name:** `RESEND_API_KEY`
- **Value:** `re_[your key here]`

**Variable 2:**
- **Name:** `FROM_EMAIL`
- **Value:** `onboarding@resend.dev` (for testing) or `noreply@yourdomain.com` (if you verified domain)

**Variable 3:**
- **Name:** `COMPANY_NAME`
- **Value:** `Your Company Name` (replace with your actual company name)

**Variable 4:**
- **Name:** `PUBLIC_SITE_URL`
- **Value:** Your production URL (e.g., `https://yoursite.com` or use localhost for testing: `http://localhost:5173`)

---

## 🚀 Deploy Edge Functions

### [ ] Step 7: Deploy Stripe Functions

Open PowerShell in your project directory:

```powershell
.\deploy-stripe-functions.ps1
```

**Or if on Linux/Mac:**
```bash
chmod +x deploy-stripe-functions.sh
./deploy-stripe-functions.sh
```

### [ ] Step 8: Deploy Email Function

```powershell
.\deploy-email-function.ps1
```

**Or if on Linux/Mac:**
```bash
chmod +x deploy-email-function.sh
./deploy-email-function.sh
```

---

## 🎨 Customize

### [ ] Step 9: Update Company Information

Edit `src/pages/PublicInvoice.jsx`:

**Around line 270** - Update company details:
```jsx
<div style={{ fontWeight: 600, marginBottom: 8 }}>Your Company Name</div>
<div style={{ color: '#6b7280', lineHeight: 1.6 }}>
  <div>Your Address Street 123</div>
  <div>City, LV-1000, Latvia</div>
  <div>info@yourcompany.com</div>
  <div>Phone: +371 12345678</div>
</div>
```

**Around line 415** - Update distances līgums link:
```jsx
<a 
  href="https://www.yoursite.com/distances-ligums" 
  target="_blank" 
  rel="noopener noreferrer"
>
  Distances līgums
</a>
```

---

## 🧪 Testing

### [ ] Step 10: Test the Complete Flow

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Login to dashboard**

3. **Create a test invoice:**
   - Add products
   - Fill in customer details
   - Click "Send Invoice"

4. **In invoice view, click "Share" button**

5. **Test Copy Link:**
   - Click "Copy Link"
   - Open link in incognito/private window
   - Verify invoice displays correctly with product images

6. **Test Payment:**
   - On public invoice page, click "Pay Invoice"
   - Use test card: `4242 4242 4242 4242`
   - Expiry: `12/25`
   - CVC: `123`
   - Complete payment
   - Go back to dashboard
   - Verify invoice status changed to "Paid"

7. **Test Email:**
   - Click "Share" > "Send email to customer"
   - Check customer's email inbox
   - Click link in email
   - Verify invoice opens

8. **Test Print/PDF:**
   - On public invoice page, click "Print / Save PDF"
   - Or press Ctrl+P
   - Verify print preview looks good
   - Save as PDF if desired

---

## 📊 Summary of Environment Variables

You should have these 6 variables set in Supabase:

| Variable | Example Value |
|----------|---------------|
| `STRIPE_SECRET_KEY` | `sk_test_51SUZZ...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_abc123...` |
| `RESEND_API_KEY` | `re_abc123...` |
| `FROM_EMAIL` | `noreply@yourdomain.com` |
| `COMPANY_NAME` | `Your Company Name` |
| `PUBLIC_SITE_URL` | `https://yoursite.com` |

---

## ✅ Checklist Complete!

Once all checkboxes are ticked, your invoice system is fully functional! 🎉

## 🆘 Having Issues?

- **Database errors:** Check that migrations ran successfully
- **Stripe not working:** Verify webhook secret matches Stripe dashboard
- **Email not sending:** Check Resend API key is correct
- **Images not showing:** Verify Mozello API credentials

See `INVOICE_PUBLIC_SHARING_SETUP.md` for detailed troubleshooting.

---

**Last Updated:** November 2024






