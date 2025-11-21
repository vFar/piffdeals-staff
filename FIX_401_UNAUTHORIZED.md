# Fix 401 Unauthorized Error - Step by Step

## ✅ Step 1: Check Edge Function Logs

1. Go to **Supabase Dashboard**
2. Navigate to **Edge Functions** → **send-invoice-email**
3. Click **Logs** tab
4. Try sending an email again
5. Look for these log messages:
   - `Request method: POST`
   - `Authorization header: Present` or `Missing`
   - `Environment check:` - Does it show `hasSupabaseUrl: true` and `hasAnonKey: true`?

## 🔧 Step 2: Set Required Secrets

If logs show `hasSupabaseUrl: false` or `hasAnonKey: false`, you need to add these secrets:

### Get Your Values:

1. **SUPABASE_URL:**
   - Go to **Project Settings** → **API**
   - Copy your **Project URL**: `https://emqhyievrsyeinwrqqhw.supabase.co`

2. **SUPABASE_ANON_KEY:**
   - Same page (**Project Settings** → **API**)
   - Copy your **anon** (public) key (starts with `eyJ...`)

### Add to Secrets:

1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Click **Add New Secret**
3. Add these two secrets:

| Name | Value |
|------|-------|
| `SUPABASE_URL` | `https://emqhyievrsyeinwrqqhw.supabase.co` |
| `SUPABASE_ANON_KEY` | Your anon key from API settings |

4. Click **Save**

## 🔄 Step 3: Redeploy Edge Function (if needed)

If you made changes to the function code, you need to redeploy:

### Option A: Via Supabase Dashboard
1. Go to **Edge Functions** → **send-invoice-email**
2. Click **Edit** or **Redeploy**
3. Make sure the latest code is there
4. Click **Deploy**

### Option B: Via CLI (if you have it)
```bash
supabase functions deploy send-invoice-email --no-verify-jwt
```

## ✅ Step 4: Test Again

1. Go back to your app
2. Try sending an email again
3. Check browser console - should see success message
4. Check edge function logs - should see success logs

## 🔍 Common Issues

### Issue: "Authorization header: Missing"
**Solution:** The header is being sent but not received. Check if you're using the latest code.

### Issue: "hasSupabaseUrl: false"
**Solution:** Add `SUPABASE_URL` secret with value: `https://emqhyievrsyeinwrqqhw.supabase.co`

### Issue: "hasAnonKey: false"
**Solution:** Add `SUPABASE_ANON_KEY` secret with your anon key from API settings.

### Issue: Still 401 after adding secrets
**Solution:** 
1. Wait 30 seconds for secrets to propagate
2. Redeploy the function
3. Check logs again

---

## 📋 Quick Checklist

- [ ] Edge function `send-invoice-email` exists
- [ ] `SUPABASE_URL` secret is set
- [ ] `SUPABASE_ANON_KEY` secret is set
- [ ] `RESEND_API_KEY` secret is set
- [ ] `FROM_EMAIL` secret is set
- [ ] `COMPANY_NAME` secret is set
- [ ] `PUBLIC_SITE_URL` secret is set
- [ ] Function code is latest version
- [ ] Checked edge function logs
- [ ] Tested sending email again

---

**After setting these secrets, wait 30 seconds and try again!**


