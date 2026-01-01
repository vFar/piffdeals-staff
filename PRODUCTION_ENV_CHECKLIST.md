# Production Environment Variables Checklist

**Use this checklist to ensure all environment variables are set correctly**

---

## Vercel Environment Variables (Frontend)

### Required Variables:

```env
✅ VITE_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
✅ VITE_SUPABASE_ANON_KEY=[YOUR-PRODUCTION-ANON-KEY]
✅ VITE_STRIPE_PUBLISHABLE_KEY=pk_live_[YOUR-PRODUCTION-KEY]
```

### Optional Variables:

```env
⭕ VITE_MOZELLO_API_URL=https://api.mozello.com/v1
⭕ VITE_MOZELLO_API_KEY=[YOUR-MOZELLO-KEY]
```

**How to Set:**
1. Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each variable
3. Select **Production** environment
4. Save

---

## Supabase Secrets (Backend - Edge Functions)

### Required Secrets:

```env
✅ SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
✅ SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY]
✅ SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
✅ STRIPE_SECRET_KEY=sk_live_[YOUR-PRODUCTION-KEY]
✅ STRIPE_WEBHOOK_SECRET=whsec_[YOUR-WEBHOOK-SECRET]
✅ RESEND_API_KEY=re_[YOUR-RESEND-KEY]
✅ FROM_EMAIL=noreply@piffdeals.lv
✅ COMPANY_NAME=Piffdeals
✅ PUBLIC_SITE_URL=https://staff.piffdeals.lv
✅ FRONTEND_URL=https://staff.piffdeals.lv
```

### Optional Secrets:

```env
⭕ MOZELLO_API_KEY=[YOUR-MOZELLO-KEY]
```

**How to Set:**
```bash
# Using Supabase CLI
supabase secrets set KEY=value

# Or use Supabase Dashboard
# Settings → Edge Functions → Secrets
```

---

## Quick Setup Script

### Set All Secrets at Once:

```bash
# Make sure you're linked to your project
supabase link --project-ref [YOUR-PROJECT-REF]

# Set all secrets
supabase secrets set SUPABASE_URL="https://[YOUR-PROJECT-REF].supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="[YOUR-SERVICE-ROLE-KEY]"
supabase secrets set SUPABASE_ANON_KEY="[YOUR-ANON-KEY]"
supabase secrets set STRIPE_SECRET_KEY="sk_live_[YOUR-KEY]"
supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_[YOUR-SECRET]"
supabase secrets set RESEND_API_KEY="re_[YOUR-KEY]"
supabase secrets set FROM_EMAIL="noreply@piffdeals.lv"
supabase secrets set COMPANY_NAME="Piffdeals"
supabase secrets set PUBLIC_SITE_URL="https://staff.piffdeals.lv"
supabase secrets set FRONTEND_URL="https://staff.piffdeals.lv"
supabase secrets set MOZELLO_API_KEY="[YOUR-KEY]"
```

---

## Verify Secrets Are Set

### Check Supabase Secrets:

```bash
supabase secrets list
```

### Check Vercel Variables:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Verify all variables are listed
3. Check they're set for **Production** environment

---

## Important Notes

⚠️ **Production Stripe Keys:**
- Must start with `pk_live_` (public) or `sk_live_` (secret)
- NOT `pk_test_` or `sk_test_` (those are for testing)

⚠️ **Service Role Key:**
- Never expose in frontend code
- Only use in Edge Functions (Supabase secrets)

⚠️ **Webhook Secret:**
- Get from Stripe Dashboard → Webhooks → Your endpoint → Signing secret
- Starts with `whsec_`

---

## Checklist

### Before Deployment:
- [ ] All Vercel environment variables set
- [ ] All Supabase secrets set
- [ ] Stripe production keys (not test keys)
- [ ] Stripe webhook configured
- [ ] Domain configured (if using custom domain)

### After Deployment:
- [ ] Verify variables are working (test login, etc.)
- [ ] Check logs for any missing variable errors
- [ ] Test Stripe payment flow
- [ ] Test email sending

---

## Quick Reference

### Where to Get Keys:

1. **Supabase:**
   - Dashboard → Settings → API
   - Project URL, anon key, service_role key

2. **Stripe:**
   - Dashboard (Live mode) → Developers → API keys
   - Publishable key, Secret key
   - Webhooks → Your endpoint → Signing secret

3. **Resend:**
   - Dashboard → API Keys
   - Generate new API key

4. **Mozello:**
   - Your Mozello account settings

