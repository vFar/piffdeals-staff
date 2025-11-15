# Environment Variables Template

## 📋 Quick Reference

Copy these to your `.env.local` file:

```env
# ===========================================
# SUPABASE (Required)
# ===========================================
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# ===========================================
# STRIPE (Required for Payments)
# ===========================================
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here

# ===========================================
# MOZELLO API (Required for Stock Updates)
# ===========================================
VITE_MOZELLO_API_URL=https://api.mozello.com/v1
VITE_MOZELLO_API_KEY=your_mozello_api_key_here
```

---

## ⚙️ Supabase Edge Function Secrets

Set these in **Supabase Dashboard → Edge Functions → Manage secrets**:

```bash
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
MOZELLO_API_URL=https://api.mozello.com/v1
MOZELLO_API_KEY=your_mozello_api_key_here
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

---

## 🔑 Where to Get Keys

### Supabase
1. Go to **Supabase Dashboard**
2. Select your project
3. Go to **Settings → API**
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** → `VITE_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (for Edge Functions only!)

### Stripe
1. Go to **[Stripe Dashboard](https://dashboard.stripe.com)**
2. Go to **Developers → API keys**
3. Copy:
   - **Publishable key** (pk_test_ or pk_live_) → `VITE_STRIPE_PUBLISHABLE_KEY`
   - **Secret key** (sk_test_ or sk_live_) → `STRIPE_SECRET_KEY` (Supabase secrets only!)
4. Go to **Developers → Webhooks**
5. Create endpoint: `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook`
6. Copy **Signing secret** → `STRIPE_WEBHOOK_SECRET`

### Mozello
1. Login to your Mozello account
2. Go to API settings
3. Copy:
   - **API URL** → `VITE_MOZELLO_API_URL` and `MOZELLO_API_URL`
   - **API Key** → `VITE_MOZELLO_API_KEY` and `MOZELLO_API_KEY`

---

## 🔒 Security Best Practices

### DO:
- ✅ Keep `.env.local` in `.gitignore`
- ✅ Use test keys first, then switch to live
- ✅ Store secrets in Supabase Edge Function secrets
- ✅ Never commit keys to Git

### DON'T:
- ❌ Commit `.env` or `.env.local` files
- ❌ Share keys publicly
- ❌ Use live keys in development
- ❌ Put secret keys (sk_) in frontend code

---

## 🧪 Test Mode vs Live Mode

### Test Mode (Development)
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```
- Use Stripe test cards
- No real charges
- Test webhooks

### Live Mode (Production)
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
```
- Real payments
- Real charges
- Update webhook URL in Stripe Dashboard

---

## ✅ Checklist

- [ ] Created `.env.local` file
- [ ] Added all VITE_ variables
- [ ] Set Supabase Edge Function secrets
- [ ] Created Stripe webhook
- [ ] Tested with test keys
- [ ] Ready to switch to live keys

---

## 📝 Notes

1. **Frontend variables** must start with `VITE_` to be accessible
2. **Backend variables** (Edge Functions) don't need `VITE_` prefix
3. Never expose secret keys in frontend code
4. Service role key is for Edge Functions only, never in frontend

---

See `STRIPE_PAYMENT_SETUP.md` for complete setup instructions.


