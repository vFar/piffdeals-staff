# 📋 Vercel Deployment Reference

**Reference guide for deploying `staff.piffdeals.lv` on Vercel.**

**Note:** For comprehensive, step-by-step instructions with thorough verification, see [VERCEL_DEPLOYMENT_GUIDE.md](VERCEL_DEPLOYMENT_GUIDE.md). This guide is a reference only.

---

## 🚀 Quick Steps

### 1. Prepare Project
```bash
npm run build  # Test build works
```

### 2. Deploy to Vercel

**Option A: Via Dashboard (Recommended)**
1. Go to https://vercel.com → **Add New** → **Project**
2. Import from Git (GitHub/GitLab/Bitbucket)
3. Select repository
4. Framework: `Vite` (auto-detected)
5. Click **Deploy**

**Option B: Via CLI**
```bash
npm install -g vercel
vercel login
vercel
vercel --prod  # For production
```

### 3. Add Environment Variables

Go to project → **Settings** → **Environment Variables**:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_MOZELLO_API_URL=https://api.mozello.com/v1
VITE_MOZELLO_API_KEY=your_mozello_api_key_here
```

**Important:** Enable for **Production, Preview, Development** → **Save** → **Redeploy**

### 4. Add Custom Domain

1. Project → **Settings** → **Domains** → **Add Domain**
2. Enter: `staff.piffdeals.lv`
3. Add DNS in Cloudflare:
   - **Type:** `CNAME`
   - **Name:** `staff`
   - **Target:** `cname.vercel-dns.com`
   - **Proxy:** ✅ ON
4. Wait 2-5 minutes for SSL

### 5. Test

Visit `https://staff.piffdeals.lv` ✅

---

## 🔧 Configuration Files

- ✅ `vercel.json` - Already created with optimal settings
- ✅ `vite.config.js` - Already optimized
- ✅ `public/_redirects` - For SPA routing (backup)

---

## 🔄 Updates

**Automatic (if using Git):**
```bash
git push  # Auto-deploys
```

**Manual:**
- Update code → Build → Push
- Or redeploy from Vercel Dashboard

---

## 🐛 Troubleshooting

**404 on routes?** `vercel.json` should fix this. Redeploy.

**Env vars not working?** Make sure they start with `VITE_` and redeploy.

**CORS errors?** Add `staff.piffdeals.lv` to Supabase CORS settings.

---

## 📝 Full Guide

See [VERCEL_DEPLOYMENT_GUIDE.md](VERCEL_DEPLOYMENT_GUIDE.md) for detailed instructions.

---

**Status:** ✅ Ready for Vercel
**Performance:** ⚡ Optimized
**Agency-Ready:** ✅ Yes

