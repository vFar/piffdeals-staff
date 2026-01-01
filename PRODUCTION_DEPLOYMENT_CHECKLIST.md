# Production Deployment Checklist

**Quick checklist to go live** 🚀

---

## ✅ What You've Already Done

- [x] Stripe secret key in Supabase secrets (`STRIPE_SECRET_KEY`)
- [x] Setting up Stripe webhook (in progress)
- [x] Supabase project is set up

---

## 🎯 What's Left to Do

### 1. Complete Stripe Webhook Setup ⚡ IN PROGRESS

- [ ] Finish creating webhook in Stripe (Live mode)
- [ ] Select event: `checkout.session.completed`
- [ ] Webhook URL: `https://emqhyievrsyeinwrqqhw.supabase.co/functions/v1/stripe-webhook`
- [ ] Copy the **Signing secret** (`whsec_...`)
- [ ] Update `STRIPE_WEBHOOK_SECRET` in Supabase secrets

**Note:** Stripe is ONLY for payment processing (not invoices/emails). Your system handles invoices and emails separately.

---

### 2. Set Up Resend Email API 📧

**What Resend is used for:**
- Sending invoice emails to customers
- Password reset emails
- Invoice reminder emails

**Steps:**

1. **Get Resend API Key:**
   - Go to [Resend Dashboard](https://resend.com/api-keys)
   - Create account (if needed) or log in
   - Go to **API Keys** section
   - Click **Create API Key**
   - Copy the key (starts with `re_...`)

2. **Verify Your Domain (IMPORTANT):**
   - In Resend Dashboard, go to **Domains**
   - Add your domain (e.g., `piffdeals.lv`)
   - Follow DNS verification steps
   - **OR** use Resend's default domain for testing (limited)

3. **Add to Supabase Secrets:**
   - Go to Supabase Dashboard → **Edge Functions** → **Secrets**
   - Add/Update: `RESEND_API_KEY` = `re_[YOUR-KEY]`
   - Add/Update: `FROM_EMAIL` = `noreply@piffdeals.lv` (or your verified domain email)
   - Add/Update: `COMPANY_NAME` = `Piffdeals` (or your company name)

---

### 3. Update Vercel Environment Variables (Frontend) 🌐

Go to Vercel Dashboard → Your Project → **Settings** → **Environment Variables**

Add these (select **Production** environment):

```env
VITE_SUPABASE_URL=https://emqhyievrsyeinwrqqhw.supabase.co
VITE_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]  # From Supabase Dashboard → Settings → API
```

**Note:** `VITE_STRIPE_PUBLISHABLE_KEY` is NOT needed! Stripe is used server-side only (Edge Functions), not in the frontend.

**Optional (if used in frontend):**
```env
VITE_MOZELLO_API_URL=https://api.mozello.com/v1
VITE_MOZELLO_API_KEY=[YOUR-MOZELLO-KEY]
```

---

### 4. Verify All Supabase Secrets Are Set ✅

In Supabase Dashboard → **Edge Functions** → **Secrets**, make sure you have:

**Required:**
- [x] `SUPABASE_URL` ✅ (you have this)
- [x] `SUPABASE_SERVICE_ROLE_KEY` ✅ (you have this)
- [x] `SUPABASE_ANON_KEY` ✅ (you have this)
- [x] `STRIPE_SECRET_KEY` ✅ (you have this, update to live key)
- [ ] `STRIPE_WEBHOOK_SECRET` ⏳ (update after webhook is created)
- [ ] `RESEND_API_KEY` ❌ (need to add)
- [ ] `FROM_EMAIL` ❌ (need to add - e.g., `noreply@piffdeals.lv`)
- [ ] `COMPANY_NAME` ❌ (need to add - e.g., `Piffdeals`)
- [x] `PUBLIC_SITE_URL` ✅ (you have this)
- [x] `FRONTEND_URL` ✅ (you have this)
- [x] `MOZELLO_API_KEY` ✅ (you have this)
- [x] `MOZELLO_API_URL` ✅ (you have this)

---

### 5. Deploy Edge Functions 📦

Make sure all Edge Functions are deployed:

```bash
# Login to Supabase CLI (if not already)
supabase login

# Link your project
supabase link --project-ref emqhyievrsyeinwrqqhw

# Deploy all functions
supabase functions deploy stripe-webhook
supabase functions deploy create-stripe-payment-link
supabase functions deploy send-invoice-email
supabase functions deploy send-password-reset-email
supabase functions deploy send-invoice-reminder
supabase functions deploy rate-limited-login
# ... deploy any other functions you have
```

**Or deploy all at once:**
```bash
supabase functions deploy --no-verify-jwt
```

---

### 6. Deploy Frontend to Vercel 🚀

1. Push your code to Git (if using Git integration)
2. Vercel will auto-deploy, OR
3. Go to Vercel Dashboard → Your Project → **Deployments** → **Redeploy**

---

### 7. Test Everything 🧪

After deployment, test:

- [ ] **Login works** (test with a user account)
- [ ] **Create invoice** (create a test invoice)
- [ ] **Stripe payment link** (click payment link, verify it opens Stripe checkout)
- [ ] **Email sending** (send test invoice email, check it arrives)
- [ ] **Password reset** (test password reset email)
- [ ] **Webhook** (complete a test payment, verify webhook fires in Stripe Dashboard → Webhooks → Logs)

---

## 📋 Quick Summary

### Stripe (Payment Processing Only):
- ✅ Secret key → Supabase secrets (`STRIPE_SECRET_KEY`)
- ⏳ Webhook secret → Supabase secrets (`STRIPE_WEBHOOK_SECRET`) *[in progress]*
- ❌ Publishable key → **NOT NEEDED** (Stripe is server-side only, no frontend integration)

### Resend (Email Sending):
- ❌ API key → Supabase secrets (`RESEND_API_KEY`) *[need to add]*
- ❌ From email → Supabase secrets (`FROM_EMAIL`) *[need to add]*
- ❌ Company name → Supabase secrets (`COMPANY_NAME`) *[need to add]*

### Vercel (Frontend):
- ✅ Supabase URL → Vercel env (`VITE_SUPABASE_URL`)
- ✅ Supabase anon key → Vercel env (`VITE_SUPABASE_ANON_KEY`)
- ❌ Stripe publishable key → **NOT NEEDED** (Stripe is server-side only)

---

## 🆘 Need Help?

- **Stripe Keys:** Dashboard → Developers → API keys (make sure you're in **Live mode**)
- **Resend Keys:** Dashboard → API Keys → Create API Key
- **Supabase Secrets:** Dashboard → Edge Functions → Secrets
- **Vercel Variables:** Dashboard → Project → Settings → Environment Variables

---

**Once all checkboxes are done, you're ready for production! 🎉**

