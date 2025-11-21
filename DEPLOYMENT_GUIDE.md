# 🚀 Deployment Guide: staff.piffdeals.lv

This guide will help you deploy your React + Vite application from localhost to `staff.piffdeals.lv` while **keeping all development/test keys** (no production keys needed yet).

---

## 📋 Prerequisites

- ✅ Domain `piffdeals.lv` is managed in Cloudflare
- ✅ Supabase project is set up (development/test project)
- ✅ All environment variables are configured locally
- ✅ Git repository (optional but recommended)

---

## 🎯 Deployment Options

### Option 1: Cloudflare Pages (Recommended)
**Why?** You already use Cloudflare for DNS, so this is the easiest integration.

**Pros:**
- ✅ Free tier available
- ✅ Automatic HTTPS/SSL
- ✅ Easy DNS integration
- ✅ Fast global CDN
- ✅ Environment variables management
- ✅ Automatic deployments from Git

**Cons:**
- ⚠️ Build time limit (20 minutes on free tier)

### Option 2: Vercel
**Why?** Excellent for React apps, very easy setup.

**Pros:**
- ✅ Free tier available
- ✅ Automatic HTTPS/SSL
- ✅ Easy environment variables
- ✅ Automatic deployments from Git
- ✅ Great performance

**Cons:**
- ⚠️ Need to configure DNS separately

### Option 3: Netlify
**Why?** Similar to Vercel, good for static sites.

**Pros:**
- ✅ Free tier available
- ✅ Automatic HTTPS/SSL
- ✅ Easy environment variables
- ✅ Automatic deployments from Git

**Cons:**
- ⚠️ Need to configure DNS separately

### Option 4: Self-Hosted (VPS/Server)
**Why?** Full control, but more complex setup.

**Pros:**
- ✅ Full control
- ✅ No build time limits
- ✅ Can host multiple projects

**Cons:**
- ❌ Need to manage server, SSL, updates
- ❌ More complex setup

---

## 🎯 Recommended: Cloudflare Pages

Since you already use Cloudflare for DNS, we'll use **Cloudflare Pages** for the easiest deployment.

---

## 📦 Step 1: Prepare Your Project

### 1.1 Update Vite Config (Optional - for better production builds)

Your current `vite.config.js` is fine, but you can optimize it:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable sourcemaps for production
    minify: 'esbuild', // Fast minification
  },
})
```

### 1.2 Test Build Locally

Before deploying, test that your build works:

```bash
npm run build
```

This creates a `dist` folder. Test it locally:

```bash
npm run preview
```

Visit `http://localhost:4173` and verify everything works.

### 1.3 Create `.gitignore` (if not exists)

Make sure `.env.local` is in `.gitignore`:

```
node_modules
dist
.env.local
.env
.DS_Store
```

---

## 🔑 Step 2: Prepare Environment Variables

### 2.1 List Your Environment Variables

You need these variables for deployment (all with `VITE_` prefix):

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
VITE_MOZELLO_API_URL=https://api.mozello.com/v1
VITE_MOZELLO_API_KEY=your_mozello_api_key_here
```

**⚠️ Important:** These are your **development/test keys** - that's exactly what we want for now!

### 2.2 Get Your Current Values

Copy your values from `.env.local` (if you have one) or from your local development setup.

---

## 🌐 Step 3: Deploy to Cloudflare Pages

### 3.1 Create Cloudflare Pages Project

1. **Go to Cloudflare Dashboard:**
   - Visit https://dash.cloudflare.com
   - Login to your account

2. **Navigate to Pages:**
   - Click **Workers & Pages** in the sidebar
   - Click **Create application**
   - Click **Pages** → **Connect to Git**

3. **Connect Git Repository:**
   - If your code is in GitHub/GitLab/Bitbucket, connect it
   - Select your repository
   - If you don't have Git, we'll use **Direct Upload** method (see Step 3.2)

### 3.2 Direct Upload Method (No Git Required)

If you don't want to use Git:

1. **Build your project locally:**
   ```bash
   npm run build
   ```

2. **Go to Cloudflare Pages:**
   - Visit https://dash.cloudflare.com
   - **Workers & Pages** → **Pages**
   - Click **Create a project**
   - Click **Upload assets** (instead of Connect to Git)

3. **Upload the `dist` folder:**
   - Drag and drop your `dist` folder
   - Or click to browse and select the `dist` folder

4. **Configure project:**
   - **Project name:** `piffdeals-staff` (or any name)
   - Click **Deploy site**

### 3.3 Configure Build Settings (If Using Git)

If you connected Git:

1. **Build configuration:**
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `/` (or leave empty)

2. **Environment variables:**
   - Click **Add variable** for each variable:
     - `VITE_SUPABASE_URL` = `https://your-project-id.supabase.co`
     - `VITE_SUPABASE_ANON_KEY` = `your_anon_key_here`
     - `VITE_STRIPE_PUBLISHABLE_KEY` = `pk_test_...`
     - `VITE_MOZELLO_API_URL` = `https://api.mozello.com/v1`
     - `VITE_MOZELLO_API_KEY` = `your_mozello_api_key_here`

3. **Save and deploy:**
   - Click **Save and Deploy**
   - Wait for build to complete (2-5 minutes)

### 3.4 Configure Environment Variables (Direct Upload)

If you used Direct Upload:

1. **Go to your project:**
   - Click on your project name in Cloudflare Pages

2. **Settings → Environment variables:**
   - Click **Settings** tab
   - Click **Environment variables**
   - Add each variable:
     - `VITE_SUPABASE_URL` = `https://your-project-id.supabase.co`
     - `VITE_SUPABASE_ANON_KEY` = `your_anon_key_here`
     - `VITE_STRIPE_PUBLISHABLE_KEY` = `pk_test_...`
     - `VITE_MOZELLO_API_URL` = `https://api.mozello.com/v1`
     - `VITE_MOZELLO_API_KEY` = `your_mozello_api_key_here`

3. **Redeploy:**
   - After adding variables, you need to redeploy
   - Go to **Deployments** tab
   - Click **Retry deployment** on the latest deployment
   - Or upload the `dist` folder again

---

## 🔗 Step 4: Configure Custom Domain

### 4.1 Add Custom Domain in Cloudflare Pages

1. **Go to your project:**
   - Click on your project in Cloudflare Pages

2. **Custom domains:**
   - Click **Custom domains** tab
   - Click **Set up a custom domain**
   - Enter: `staff.piffdeals.lv`
   - Click **Continue**

3. **DNS Configuration:**
   - Cloudflare will show you DNS records to add
   - Usually it's a CNAME record pointing to your Pages URL

### 4.2 Add DNS Record in Cloudflare

1. **Go to Cloudflare DNS:**
   - Go to your domain (`piffdeals.lv`) in Cloudflare
   - Click **DNS** → **Records**

2. **Add CNAME Record:**
   - Click **Add record**
   - **Type:** `CNAME`
   - **Name:** `staff`
   - **Target:** `[your-pages-url].pages.dev` (Cloudflare will show you the exact value)
   - **Proxy status:** ✅ **Proxied** (orange cloud ON)
   - **TTL:** Auto
   - Click **Save**

3. **Wait for DNS Propagation:**
   - Usually takes 1-5 minutes
   - Cloudflare Pages will automatically provision SSL certificate

### 4.3 Verify Domain

1. **Check in Cloudflare Pages:**
   - Go back to **Custom domains** in your Pages project
   - Status should show **Active** with a green checkmark

2. **Test the URL:**
   - Visit `https://staff.piffdeals.lv`
   - Should load your application!

---

## 🔄 Step 5: Set Up Automatic Deployments (Optional - If Using Git)

If you connected Git, you can set up automatic deployments:

1. **Automatic deployments are enabled by default:**
   - Every push to `main` branch triggers a new deployment
   - You can configure this in **Settings** → **Builds & deployments**

2. **Preview deployments:**
   - Pull requests get preview URLs automatically
   - Great for testing before merging

---

## 🧪 Step 6: Test Your Deployment

### 6.1 Verify Application Loads

1. Visit `https://staff.piffdeals.lv`
2. Check browser console for errors (F12)
3. Verify login page loads correctly

### 6.2 Test Environment Variables

1. **Check Supabase connection:**
   - Try logging in
   - Verify authentication works

2. **Check Stripe (if applicable):**
   - Test any Stripe integration
   - Verify test keys are working

3. **Check Mozello API:**
   - Test product loading
   - Verify API calls work

### 6.3 Test All Features

- ✅ Login/Logout
- ✅ Dashboard loads
- ✅ Invoice creation
- ✅ User management (if admin)
- ✅ All pages accessible

---

## 🔧 Troubleshooting

### Issue: "Missing Supabase environment variables" Error

**Solution:**
1. Go to Cloudflare Pages → Your Project → Settings → Environment variables
2. Verify all `VITE_` variables are set
3. Redeploy the site

### Issue: "404 Not Found" on Routes

**Solution:**
This is a common issue with SPAs. You need to configure redirects:

1. **Create `_redirects` file in `public` folder:**
   ```
   /*    /index.html   200
   ```

2. **Or create `_headers` file in `public` folder:**
   ```
   /*
     X-Frame-Options: DENY
     X-Content-Type-Options: nosniff
   ```

3. **Rebuild and redeploy:**
   ```bash
   npm run build
   ```
   Upload the new `dist` folder or push to Git

### Issue: Environment Variables Not Working

**Solution:**
1. Make sure variables start with `VITE_`
2. Redeploy after adding variables
3. Check browser console for errors
4. Verify variables are set in Cloudflare Pages settings

### Issue: CORS Errors

**Solution:**
1. Check Supabase project settings
2. Add `staff.piffdeals.lv` to allowed origins in Supabase Dashboard
3. Go to **Settings** → **API** → **CORS settings**

### Issue: SSL Certificate Not Provisioned

**Solution:**
1. Wait 5-10 minutes (Cloudflare needs time to provision SSL)
2. Check **Custom domains** in Cloudflare Pages
3. Verify DNS record is correct (CNAME pointing to Pages URL)
4. Make sure domain is proxied (orange cloud ON)

---

## 📝 Alternative: Vercel Deployment

If you prefer Vercel instead of Cloudflare Pages:

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Deploy

```bash
vercel
```

Follow the prompts:
- Link to existing project or create new
- Set environment variables when prompted

### Step 3: Configure Domain

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add `staff.piffdeals.lv`
3. Add DNS record in Cloudflare:
   - **Type:** `CNAME`
   - **Name:** `staff`
   - **Target:** `cname.vercel-dns.com` (or value shown by Vercel)
   - **Proxy:** ✅ Proxied

---

## 🔐 Security Notes

### Environment Variables

- ✅ **Safe to expose:** `VITE_` variables are public (they're in the frontend bundle)
- ✅ **This is normal:** Supabase anon key, Stripe publishable key are meant to be public
- ❌ **Never expose:** Service role keys, secret keys (these stay in Supabase Edge Functions)

### HTTPS

- ✅ Cloudflare Pages automatically provides HTTPS
- ✅ No additional SSL configuration needed

### CORS

- Make sure to add `staff.piffdeals.lv` to allowed origins in:
  - Supabase Dashboard → Settings → API → CORS
  - Any other APIs you're using

---

## 📊 Monitoring & Updates

### View Deployment Logs

1. Go to Cloudflare Pages → Your Project → **Deployments**
2. Click on any deployment to see build logs

### Update Your Site

**If using Git:**
```bash
git add .
git commit -m "Update"
git push
```
Cloudflare Pages will automatically deploy.

**If using Direct Upload:**
1. Make changes locally
2. Run `npm run build`
3. Upload new `dist` folder to Cloudflare Pages

---

## ✅ Deployment Checklist

- [ ] Project builds successfully locally (`npm run build`)
- [ ] Tested preview locally (`npm run preview`)
- [ ] Created Cloudflare Pages project
- [ ] Added all environment variables (with `VITE_` prefix)
- [ ] Deployed site (via Git or Direct Upload)
- [ ] Added custom domain `staff.piffdeals.lv`
- [ ] Added DNS CNAME record in Cloudflare
- [ ] SSL certificate provisioned (green checkmark)
- [ ] Site loads at `https://staff.piffdeals.lv`
- [ ] Login works
- [ ] All features tested
- [ ] Added `staff.piffdeals.lv` to Supabase CORS settings
- [ ] No console errors

---

## 🎉 You're Live!

Your application is now accessible at `https://staff.piffdeals.lv` with all development keys intact.

**Next Steps:**
- Monitor usage and performance
- Continue development
- When ready for production, switch to production keys (see below)

---

## 🔄 Switching to Production Keys (Future)

When you're ready to go live with production keys:

1. **Update environment variables in Cloudflare Pages:**
   - Replace `pk_test_...` with `pk_live_...` (Stripe)
   - Replace test Supabase project with production project (if you have one)
   - Update other keys as needed

2. **Update Supabase Edge Function secrets:**
   - Go to Supabase Dashboard → Edge Functions → Secrets
   - Update `STRIPE_SECRET_KEY` from `sk_test_...` to `sk_live_...`
   - Update webhook secret if needed

3. **Redeploy:**
   - If using Git: push a commit (or just redeploy)
   - If using Direct Upload: upload new build

**That's it!** No code changes needed, just environment variables.

---

## 📚 Additional Resources

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [Supabase CORS Configuration](https://supabase.com/docs/guides/api/api-cors)

---

**Last Updated:** December 2024
**Status:** Ready for Development/Testing Phase

