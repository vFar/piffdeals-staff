# ⚡ Quick Deploy Guide

Fast deployment steps for `staff.piffdeals.lv` (keeping dev keys).

---

## 🚀 Quick Steps (Cloudflare Pages)

### 1. Build Locally
```bash
npm run build
```

### 2. Deploy to Cloudflare Pages

**Option A: Direct Upload (Fastest)**
1. Go to https://dash.cloudflare.com → **Workers & Pages** → **Pages**
2. Click **Create a project** → **Upload assets**
3. Drag and drop your `dist` folder
4. Project name: `piffdeals-staff`
5. Click **Deploy site**

**Option B: Git (Recommended for updates)**
1. Push your code to GitHub/GitLab
2. Go to Cloudflare Pages → **Create application** → **Connect to Git**
3. Select your repository
4. Build settings:
   - Framework: `Vite`
   - Build command: `npm run build`
   - Output directory: `dist`

### 3. Add Environment Variables

Go to your project → **Settings** → **Environment variables**:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_MOZELLO_API_URL=https://api.mozello.com/v1
VITE_MOZELLO_API_KEY=your_mozello_api_key_here
```

**Important:** After adding variables, **redeploy** (retry latest deployment or upload again).

### 4. Add Custom Domain

1. In your Pages project → **Custom domains** → **Set up a custom domain**
2. Enter: `staff.piffdeals.lv`
3. Add DNS record in Cloudflare:
   - **Type:** `CNAME`
   - **Name:** `staff`
   - **Target:** `[your-pages-url].pages.dev` (shown by Cloudflare)
   - **Proxy:** ✅ ON (orange cloud)
4. Wait 2-5 minutes for SSL

### 5. Test

Visit `https://staff.piffdeals.lv` and verify:
- ✅ Site loads
- ✅ Login works
- ✅ No console errors

---

## 🔧 Troubleshooting

**404 on routes?** The `_redirects` file in `public/` should fix this. Rebuild and redeploy.

**Environment variables not working?** Make sure they start with `VITE_` and redeploy after adding them.

**CORS errors?** Add `staff.piffdeals.lv` to Supabase CORS settings (Dashboard → Settings → API).

---

## 📝 Full Guide

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed instructions.

