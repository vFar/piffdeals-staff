# Production Deployment Guide

**Step-by-step guide to deploy Piffdeals Staff Portal to production**

---

## Pre-Deployment Checklist

Before deploying, gather all your production credentials:

### Required Information:
- [ ] Production Supabase project URL and keys
- [ ] Production Stripe API keys (Live keys)
- [ ] Production Stripe webhook secret
- [ ] Resend API key
- [ ] Mozello API key
- [ ] Domain name (e.g., staff.piffdeals.lv)

---

## Step 1: Stripe Production Setup 💳

### 1.1 Get Production Stripe Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Make sure you're in **Live mode** (toggle in top right)
3. Navigate to **Developers** → **API keys**
4. Copy:
   - **Publishable key** (starts with `pk_live_...`)
   - **Secret key** (starts with `sk_live_...`)

### 1.2 Set Up Stripe Webhook (Production)

1. In Stripe Dashboard (Live mode):
2. Go to **Developers** → **Webhooks**
3. Click **Add endpoint**
4. Enter endpoint URL:
   ```
   https://[YOUR-PROJECT-REF].supabase.co/functions/v1/stripe-webhook
   ```
   Replace `[YOUR-PROJECT-REF]` with your Supabase project reference
5. Select event: `checkout.session.completed`
6. Click **Add endpoint**
7. Copy the **Signing secret** (starts with `whsec_...`)

---

## Step 2: Environment Variables Setup 🔐

### 2.1 Vercel Environment Variables (Frontend)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add the following variables:

```env
# Supabase (Production)
VITE_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
VITE_SUPABASE_ANON_KEY=[YOUR-PRODUCTION-ANON-KEY]

# Stripe (Production - Public Key)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_[YOUR-PRODUCTION-KEY]

# Mozello (if used in frontend)
VITE_MOZELLO_API_URL=https://api.mozello.com/v1
VITE_MOZELLO_API_KEY=[YOUR-MOZELLO-KEY]
```

**Important:**
- Make sure to select **Production** environment for each variable
- Replace `[YOUR-PROJECT-REF]` with your actual Supabase project reference
- Get keys from Supabase Dashboard → Settings → API

### 2.2 Supabase Secrets (Backend - Edge Functions)

Set these via Supabase CLI or Dashboard:

**Option A: Using Supabase CLI (Recommended)**

```bash
# Login to Supabase CLI (if not already)
supabase login

# Link your project
supabase link --project-ref [YOUR-PROJECT-REF]

# Set secrets
supabase secrets set SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY]
supabase secrets set SUPABASE_ANON_KEY=[YOUR-ANON-KEY]

# Stripe (Production)
supabase secrets set STRIPE_SECRET_KEY=sk_live_[YOUR-PRODUCTION-KEY]
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_[YOUR-WEBHOOK-SECRET]

# Resend
supabase secrets set RESEND_API_KEY=re_[YOUR-RESEND-KEY]
supabase secrets set FROM_EMAIL=noreply@piffdeals.lv
supabase secrets set COMPANY_NAME=Piffdeals
supabase secrets set PUBLIC_SITE_URL=https://staff.piffdeals.lv
supabase secrets set FRONTEND_URL=https://staff.piffdeals.lv

# Mozello
supabase secrets set MOZELLO_API_KEY=[YOUR-MOZELLO-KEY]
```

**Option B: Using Supabase Dashboard**

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Edge Functions** → **Secrets**
3. Add each secret manually

### 2.3 Get Supabase Keys

1. Go to Supabase Dashboard
2. Select your production project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key**
   - **service_role key** (⚠️ Keep this secret!)

---

## Step 3: Update Code for Production Keys

### 3.1 Verify Environment Variable Usage

Check that your code uses environment variables (not hardcoded values):

**Frontend (`src/lib/supabase.js`):**
```javascript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

**Stripe (Edge Functions):**
- Uses `Deno.env.get('STRIPE_SECRET_KEY')`
- Uses `Deno.env.get('STRIPE_WEBHOOK_SECRET')`

### 3.2 No Code Changes Needed!

Your code should already be using environment variables. Just update the values in Vercel/Supabase.

---

## Step 4: Deploy to Vercel 🚀

### 4.1 Connect Repository (If Not Already)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New Project**
3. Import your Git repository
4. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `./` (or leave default)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

### 4.2 Deploy

**Option A: Automatic (Git Push)**
```bash
# Make sure environment variables are set in Vercel Dashboard
git add .
git commit -m "Ready for production deployment"
git push origin main
# Vercel will auto-deploy
```

**Option B: Manual Deploy**
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy to production
vercel --prod
```

### 4.3 Verify Deployment

1. Check Vercel Dashboard → Deployments
2. Verify build succeeded
3. Visit your production URL
4. Test login functionality

---

## Step 5: Deploy Supabase Edge Functions 🔧

### 5.1 Deploy All Functions

```bash
# Make sure you're in project root
cd /path/to/piffdeals-staff

# Login to Supabase (if not already)
supabase login

# Link project (if not already)
supabase link --project-ref [YOUR-PROJECT-REF]

# Deploy all Edge Functions
supabase functions deploy

# Or deploy individual functions:
supabase functions deploy rate-limited-login
supabase functions deploy stripe-webhook
supabase functions deploy create-stripe-payment-link
supabase functions deploy send-invoice-email
supabase functions deploy send-password-reset-email
supabase functions deploy create-user
supabase functions deploy delete-user
supabase functions deploy fetch-mozello-products
supabase functions deploy update-mozello-stock
supabase functions deploy mark-overdue-invoices
supabase functions deploy delete-old-drafts
supabase functions deploy log-activity
supabase functions deploy cleanup-expired-sessions
supabase functions deploy send-invoice-reminder
```

### 5.2 Verify Functions Deployed

1. Go to Supabase Dashboard
2. Navigate to **Edge Functions**
3. Verify all functions are listed and active

---

## Step 6: Configure Custom Domain 🌐

### 6.1 In Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add domain: `staff.piffdeals.lv`
3. Follow DNS configuration instructions
4. Update DNS records at your domain registrar

### 6.2 Update Environment Variables

After domain is live, update:
- `PUBLIC_SITE_URL=https://staff.piffdeals.lv`
- `FRONTEND_URL=https://staff.piffdeals.lv`

---

## Step 7: Final Verification ✅

### 7.1 Test Critical Flows

- [ ] **Login:** Test login with production credentials
- [ ] **Invoices:** Create/view invoices
- [ ] **Stripe:** Test payment link creation
- [ ] **Email:** Test invoice email sending
- [ ] **Products:** Test product fetching from Mozello
- [ ] **Error Handling:** Verify error messages are user-friendly

### 7.2 Check Logs

1. **Vercel:** Dashboard → Your Project → Logs
2. **Supabase:** Dashboard → Logs → Edge Functions
3. **Stripe:** Dashboard → Logs → Webhooks

### 7.3 Monitor Performance

- Check page load times
- Verify pagination works
- Check database query performance

---

## Step 8: Post-Deployment Checklist 📋

### Security
- [ ] All secrets are in environment variables (not in code)
- [ ] Service role key is only in Supabase secrets (never in frontend)
- [ ] Production Stripe keys are used (not test keys)
- [ ] Webhook secret is configured correctly

### Functionality
- [ ] Login works
- [ ] Invoice creation works
- [ ] Payment links work
- [ ] Emails send successfully
- [ ] Products fetch correctly
- [ ] Error handling works (no technical errors shown)

### Configuration
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] All Edge Functions deployed
- [ ] Environment variables set correctly

---

## Troubleshooting 🔧

### Issue: Build Fails

**Check:**
- Environment variables are set in Vercel
- Build command is correct
- No syntax errors in code

### Issue: Stripe Webhook Not Working

**Check:**
- Webhook URL is correct in Stripe Dashboard
- Webhook secret matches in Supabase secrets
- Edge Function is deployed
- Check Stripe Dashboard → Logs → Webhooks

### Issue: Emails Not Sending

**Check:**
- Resend API key is set correctly
- FROM_EMAIL matches verified domain
- Edge Function is deployed
- Check Supabase logs for errors

### Issue: Login Not Working

**Check:**
- Supabase URL and keys are correct
- Edge Functions are deployed
- Check browser console for errors
- Check Supabase logs

---

## Quick Reference: Environment Variables

### Vercel (Frontend)
```env
VITE_SUPABASE_URL=https://[PROJECT-REF].supabase.co
VITE_SUPABASE_ANON_KEY=[ANON-KEY]
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_[KEY]
VITE_MOZELLO_API_URL=https://api.mozello.com/v1
VITE_MOZELLO_API_KEY=[KEY]
```

### Supabase Secrets (Backend)
```env
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[SERVICE-ROLE-KEY]
SUPABASE_ANON_KEY=[ANON-KEY]
STRIPE_SECRET_KEY=sk_live_[KEY]
STRIPE_WEBHOOK_SECRET=whsec_[SECRET]
RESEND_API_KEY=re_[KEY]
FROM_EMAIL=noreply@piffdeals.lv
COMPANY_NAME=Piffdeals
PUBLIC_SITE_URL=https://staff.piffdeals.lv
FRONTEND_URL=https://staff.piffdeals.lv
MOZELLO_API_KEY=[KEY]
```

---

## Production vs Development Keys

### Stripe Keys:
- **Development:** `pk_test_...` / `sk_test_...`
- **Production:** `pk_live_...` / `sk_live_...`

### Supabase:
- Use the same project for dev/prod OR
- Use separate projects (recommended for production)

---

## Next Steps After Deployment

1. **Monitor:** Check logs daily for first week
2. **Test:** Verify all critical flows work
3. **Optimize:** Monitor performance and optimize if needed
4. **Backup:** Ensure database backups are configured
5. **Documentation:** Update any internal docs with production URLs

---

## Support

If you encounter issues:
1. Check logs (Vercel, Supabase, Stripe)
2. Verify environment variables are set correctly
3. Check that Edge Functions are deployed
4. Verify webhook URLs are correct

---

**Good luck with your deployment! 🚀**

