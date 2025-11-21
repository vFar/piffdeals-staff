# 📋 Deployment Summary - Vercel

Quick overview of what you need to deploy `staff.piffdeals.lv` to **Vercel** while keeping development keys.

---

## 🎯 Goal

Deploy your React + Vite application from `localhost` to `https://staff.piffdeals.lv` on **Vercel** while keeping all development/test keys (no production keys needed yet).

**Why Vercel?** Optimal performance, seamless transitions, zero-downtime deployments - perfect for agency workflows.

---

## 📚 Documentation Files

1. **[VERCEL_DEPLOYMENT_GUIDE.md](VERCEL_DEPLOYMENT_GUIDE.md)** - Complete Vercel deployment guide
2. **[QUICK_VERCEL_DEPLOY.md](QUICK_VERCEL_DEPLOY.md)** - Fast Vercel deployment steps
3. **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Pre/post deployment checklist

---

## ⚡ Quick Start

### 1. Build Your Project
```bash
npm run build
```

### 2. Deploy to Vercel

**Option A: Via Dashboard (Recommended)**
- Go to https://vercel.com → **Add New** → **Project**
- Import from Git (GitHub/GitLab/Bitbucket)
- Framework: `Vite` (auto-detected)
- Click **Deploy**

**Option B: Via CLI**
```bash
npm install -g vercel
vercel login
vercel
vercel --prod
```

### 3. Add Environment Variables
In Vercel → Your Project → **Settings** → **Environment Variables**:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_MOZELLO_API_URL=https://api.mozello.com/v1
VITE_MOZELLO_API_KEY=your_mozello_api_key_here
```

**Important:** Enable for **Production, Preview, Development** → **Save** → **Redeploy**

### 4. Add Custom Domain
- In Vercel project → **Settings** → **Domains** → **Add Domain**
- Enter: `staff.piffdeals.lv`
- Add DNS CNAME record in Cloudflare:
  - **Type:** `CNAME`
  - **Name:** `staff`
  - **Target:** `cname.vercel-dns.com` (or value shown by Vercel)
  - **Proxy:** ✅ ON (orange cloud)
- Wait 2-5 minutes for SSL

### 5. Test
Visit `https://staff.piffdeals.lv` and verify everything works!

---

## 🔑 Key Points

### Environment Variables
- ✅ All variables must start with `VITE_` to be accessible in frontend
- ✅ Use your **development/test keys** (that's what we want for now)
- ✅ After adding variables, you must **redeploy** for them to take effect

### Files Added
- ✅ `vercel.json` - Vercel configuration with optimal settings
- ✅ `public/_redirects` - Backup SPA routing (vercel.json handles this)
- ✅ `vite.config.js` - Updated with production build optimizations

### CORS Configuration
- ✅ Edge Functions already have CORS headers (`*` allowed)
- ✅ Add `staff.piffdeals.lv` to Supabase CORS settings:
  - Go to Supabase Dashboard → Settings → API → CORS
  - Add: `https://staff.piffdeals.lv`

---

## 🚨 Important Notes

### Development Keys
- ✅ **Keep using test keys** - This is correct for development/testing phase
- ✅ Stripe: Use `pk_test_...` keys
- ✅ Supabase: Use your development project
- ✅ When ready for production, just update environment variables (no code changes)

### Security
- ✅ `VITE_` variables are public (they're in the frontend bundle) - this is normal
- ✅ Secret keys (service_role, etc.) stay in Supabase Edge Functions - never in frontend
- ✅ HTTPS is automatic with Cloudflare Pages

### Updates
**Automatic (Recommended):**
- Push to Git → Vercel auto-deploys
- Zero-downtime deployments
- Instant rollbacks available

**Manual:**
- Redeploy from Vercel Dashboard
- Or use CLI: `vercel --prod`

---

## 📝 Required Environment Variables

Copy these from your local `.env.local` (if you have one) or from your development setup:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
VITE_MOZELLO_API_URL=https://api.mozello.com/v1
VITE_MOZELLO_API_KEY=your_mozello_api_key_here
```

---

## ✅ Pre-Deployment Checklist

- [ ] Project builds: `npm run build`
- [ ] Preview works: `npm run preview`
- [ ] Have all environment variable values ready
- [ ] `_redirects` file exists in `public/` folder
- [ ] Supabase project is set up
- [ ] Edge Functions are deployed (if using any)

---

## 🧪 Post-Deployment Checklist

- [ ] Site loads at `https://staff.piffdeals.lv`
- [ ] Login works
- [ ] No console errors
- [ ] All routes work (no 404s)
- [ ] Added `staff.piffdeals.lv` to Supabase CORS settings
- [ ] SSL certificate is active

---

## 🔄 When Ready for Production

When you're ready to switch to production keys:

1. **Update environment variables in Cloudflare Pages:**
   - Replace `pk_test_...` with `pk_live_...` (Stripe)
   - Update other keys as needed

2. **Update Supabase Edge Function secrets:**
   - Go to Supabase Dashboard → Edge Functions → Secrets
   - Update `STRIPE_SECRET_KEY` from `sk_test_...` to `sk_live_...`

3. **Redeploy:**
   - If using Git: push a commit
   - If using Direct Upload: upload new build

**No code changes needed!** Just environment variables.

---

## 📞 Need Help?

1. Check [VERCEL_DEPLOYMENT_GUIDE.md](VERCEL_DEPLOYMENT_GUIDE.md) for detailed instructions
2. Check [QUICK_VERCEL_DEPLOY.md](QUICK_VERCEL_DEPLOY.md) for quick reference
3. Check [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for troubleshooting
4. Check browser console for errors (F12)
5. Check Vercel deployment logs in Dashboard

---

## 🎉 You're Ready!

Follow the steps above and your application will be live at `https://staff.piffdeals.lv` on Vercel with:
- ✅ Optimal performance (Edge Network)
- ✅ Zero-downtime deployments
- ✅ Instant rollbacks
- ✅ Preview deployments for testing
- ✅ All development keys intact

**Status:** ✅ Ready to Deploy to Vercel
**Phase:** Development/Testing
**Keys:** Development/Test (as intended)
**Platform:** Vercel (Agency-Optimized)

---

**Last Updated:** December 2024

