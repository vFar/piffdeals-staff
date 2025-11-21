# 🚀 Vercel Deployment Guide - staff.piffdeals.lv

**Comprehensive, step-by-step deployment guide** for deploying your React + Vite application to Vercel. This guide prioritizes **thoroughness and success** over speed - take your time to ensure each step is completed correctly.

---

## 🎯 Why Vercel for Agency Projects

- ✅ **Zero-config deployments** - Automatic optimizations
- ✅ **Edge Network** - Global CDN for fast performance
- ✅ **Instant rollbacks** - Seamless transitions between deployments
- ✅ **Preview deployments** - Test before production
- ✅ **Analytics & Monitoring** - Built-in performance insights
- ✅ **Team collaboration** - Easy project sharing
- ✅ **Automatic HTTPS** - SSL certificates included

---

## ⚠️ Important: Take Your Time

This guide is designed for **thorough, error-free deployment**. Each step includes verification checks. **Do not rush** - ensure each step is completed successfully before moving to the next. It's better to take 30 minutes and succeed than to rush and encounter errors.

---

## 📋 Prerequisites

- ✅ Vercel account (free tier available)
- ✅ Git repository (GitHub, GitLab, or Bitbucket)
- ✅ Domain `piffdeals.lv` DNS access (Cloudflare)
- ✅ Environment variables ready (development keys)

---

## 🚀 Step 1: Prepare Your Project

### 1.1 Verify Build Configuration

Your `vite.config.js` is already optimized. Verify it includes:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase-vendor': ['@supabase/supabase-js'],
        },
      },
    },
  },
})
```

### 1.2 Create Vercel Configuration (Optional but Recommended)

Create `vercel.json` in project root for optimal routing:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### 1.3 Test Build Locally (CRITICAL STEP)

**This step is essential - do not skip it.** A successful local build ensures your deployment will work.

1. **Clean previous builds (if any):**
   ```bash
   rm -rf dist
   # Or on Windows:
   rmdir /s dist
   ```

2. **Install dependencies (if needed):**
   ```bash
   npm install
   ```
   
   **Verify:** Check for any errors or warnings. All dependencies should install successfully.

3. **Run the build:**
   ```bash
   npm run build
   ```
   
   **What to check:**
   - ✅ Build completes without errors
   - ✅ No warnings about missing dependencies
   - ✅ `dist` folder is created
   - ✅ `dist` folder contains `index.html` and `assets` folder
   - ✅ Build output shows file sizes (check for unusually large bundles)

4. **Test the preview:**
   ```bash
   npm run preview
   ```
   
   **What to verify:**
   - ✅ Server starts on `http://localhost:4173`
   - ✅ Application loads in browser
   - ✅ Login page appears (or redirects correctly)
   - ✅ No console errors (open browser DevTools F12)
   - ✅ All routes work (try navigating to different pages)
   - ✅ No 404 errors when refreshing pages
   - ✅ Images/assets load correctly
   - ✅ Authentication works (if you can test it)

5. **Check build output:**
   - Open `dist/index.html` - should exist and contain your app
   - Check `dist/assets` - should contain JS and CSS files
   - Verify file sizes are reasonable (not abnormally large)

**⚠️ DO NOT PROCEED if:**
- ❌ Build fails with errors
- ❌ Preview doesn't load
- ❌ Console shows critical errors
- ❌ Routes return 404 errors

**Fix any issues before continuing to Step 2.**

---

## 🔗 Step 2: Connect to Vercel

**Take your time with this step.** Proper configuration here prevents issues later.

### Option A: Via Vercel Dashboard (Recommended)

1. **Create/Login to Vercel Account:**
   - Visit https://vercel.com
   - Sign up (if new) or log in
   - **Verify:** You can access the dashboard

2. **Prepare Your Git Repository:**
   - **Ensure your code is committed and pushed:**
     ```bash
     git status  # Check for uncommitted changes
     git add .
     git commit -m "Prepare for Vercel deployment"
     git push
     ```
   - **Verify:** Code is pushed to your Git provider (GitHub/GitLab/Bitbucket)
   - **Note:** Vercel needs access to your repository

3. **Import Project:**
   - In Vercel Dashboard, click **Add New** → **Project**
   - Click **Import** next to your Git provider (GitHub/GitLab/Bitbucket)
   - **If prompted:** Authorize Vercel to access your repositories
   - **Select your repository:** Find and select `piffdeals-staff` (or your repo name)
   - Click **Import**

4. **Configure Project Settings (VERY IMPORTANT):**
   
   **Framework Preset:**
   - Should auto-detect as `Vite` ✅
   - If not, manually select `Vite` from dropdown
   
   **Root Directory:**
   - Leave as `./` (root of repository)
   - Only change if your project is in a subdirectory
   
   **Build and Output Settings:**
   - **Build Command:** Should show `npm run build` ✅
     - If not, manually enter: `npm run build`
   - **Output Directory:** Should show `dist` ✅
     - If not, manually enter: `dist`
   - **Install Command:** Should show `npm install` ✅
     - If not, manually enter: `npm install`
   
   **Node.js Version:**
   - Vercel auto-detects from your project
   - Should be Node.js 18.x or 20.x
   - You can verify in `package.json` if you have `engines` field
   
   **Environment Variables:**
   - **DO NOT add variables here yet** - we'll do this in Step 3
   - Just verify the section exists

5. **Review Configuration:**
   - Double-check all settings above
   - Verify Framework is `Vite`
   - Verify Build Command is `npm run build`
   - Verify Output Directory is `dist`

6. **Initial Deploy (Without Environment Variables):**
   - Click **Deploy** button
   - **Wait for build to complete** (2-5 minutes)
   - **Monitor the build logs:**
     - Watch for any errors
     - Build should complete successfully
     - Note: The site won't work fully yet (no env vars), but build should succeed

7. **Verify Initial Deployment:**
   - After build completes, you'll get a deployment URL (like `piffdeals-staff-xxx.vercel.app`)
   - Click the URL to open it
   - **Expected:** Site loads but may show errors about missing environment variables
   - **This is normal** - we'll add environment variables next
   - **Check:** Build succeeded and site is accessible (even if broken)

**⚠️ DO NOT PROCEED if:**
- ❌ Build fails
- ❌ Cannot access deployment URL
- ❌ Configuration settings are incorrect

**Fix any issues before continuing to Step 3.**

### Option B: Via Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```
   
   Follow prompts:
   - Link to existing project or create new
   - Set environment variables when prompted

4. **Deploy to Production:**
   ```bash
   vercel --prod
   ```

---

## 🔑 Step 3: Configure Environment Variables

**This is a critical step.** Missing or incorrect environment variables will cause the application to fail.

### 3.1 Gather Your Environment Variables

**Before adding to Vercel, collect all your values:**

1. **Check your local `.env.local` file (if you have one):**
   - Open `.env.local` in your project
   - Copy all `VITE_` variables and their values
   - **Verify:** All values are correct and current

2. **If you don't have `.env.local`, get values from:**
   - Supabase Dashboard → Settings → API (for Supabase keys)
   - Stripe Dashboard → Developers → API keys (for Stripe keys)
   - Mozello Dashboard → API settings (for Mozello keys)

3. **Required Variables List:**
   - `VITE_SUPABASE_URL` - Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Your Supabase anon/public key
   - `VITE_STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key (test key: `pk_test_...`)
   - `VITE_MOZELLO_API_URL` - Mozello API URL (usually `https://api.mozello.com/v1`)
   - `VITE_MOZELLO_API_KEY` - Your Mozello API key

4. **Verify Each Value:**
   - ✅ Supabase URL is correct (ends with `.supabase.co`)
   - ✅ Supabase anon key is the public key (not service_role)
   - ✅ Stripe key starts with `pk_test_` (for development)
   - ✅ Mozello URL and key are correct

### 3.2 Add Environment Variables in Vercel

1. **Navigate to Environment Variables:**
   - Go to your Vercel project
   - Click **Settings** tab
   - Click **Environment Variables** in the left sidebar

2. **Add Each Variable One by One:**

   **For EACH variable, follow these steps:**
   
   a. Click **Add New** or **Add Environment Variable**
   
   b. **Variable Name:** Enter exactly (case-sensitive):
      - `VITE_SUPABASE_URL`
      - `VITE_SUPABASE_ANON_KEY`
      - `VITE_STRIPE_PUBLISHABLE_KEY`
      - `VITE_MOZELLO_API_URL`
      - `VITE_MOZELLO_API_KEY`
   
   c. **Value:** Paste the exact value (no quotes, no spaces)
      - Double-check for typos
      - Ensure no leading/trailing spaces
   
   d. **Environment:** Select **ALL THREE:**
      - ✅ Production
      - ✅ Preview
      - ✅ Development
      - **Why all three?** So the variables work in all deployment types
   
   e. Click **Save**
   
   f. **Verify:** The variable appears in the list

3. **Complete Variable List:**

   Add all these variables with their correct values:

   | Variable Name | Example Value | Environments |
   |--------------|---------------|--------------|
   | `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` | ✅ All |
   | `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | ✅ All |
   | `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_test_51xxxxx...` | ✅ All |
   | `VITE_MOZELLO_API_URL` | `https://api.mozello.com/v1` | ✅ All |
   | `VITE_MOZELLO_API_KEY` | `your_mozello_key_here` | ✅ All |

4. **Double-Check All Variables:**
   - ✅ All 5 variables are added
   - ✅ All have correct names (exact spelling, case-sensitive)
   - ✅ All have correct values
   - ✅ All are enabled for Production, Preview, Development

5. **Important Notes:**
   - ⚠️ Variables must start with `VITE_` to be accessible in frontend
   - ⚠️ Values are case-sensitive
   - ⚠️ No quotes needed around values
   - ⚠️ Environment variables are encrypted and secure

### 3.3 Redeploy with Environment Variables

**After adding all variables, you MUST redeploy for them to take effect:**

1. **Option A: Redeploy from Dashboard:**
   - Go to **Deployments** tab
   - Find the latest deployment
   - Click the **three dots** (⋯) menu
   - Click **Redeploy**
   - Wait for build to complete

2. **Option B: Push a New Commit:**
   ```bash
   git commit --allow-empty -m "Trigger redeploy with environment variables"
   git push
   ```
   - This triggers a new deployment automatically

3. **Verify Redeployment:**
   - Wait for build to complete (2-5 minutes)
   - Check build logs for any errors
   - Visit the deployment URL
   - **Expected:** Application should now work (no env var errors)

**⚠️ DO NOT PROCEED if:**
- ❌ Any variables are missing
- ❌ Variable names are incorrect
- ❌ Redeployment fails
- ❌ Application still shows environment variable errors

**Fix any issues before continuing to Step 4.**

### 3.2 Environment-Specific Variables (Optional)

If you want different keys for different environments:

- **Production:** Use production keys (when ready)
- **Preview:** Use test keys (for PR previews)
- **Development:** Use local development keys

For now, use the same test keys for all environments.

---

## 🌐 Step 4: Configure Custom Domain

### 4.1 Add Domain in Vercel

1. **Go to your project:**
   - Click on your project in Vercel Dashboard

2. **Settings → Domains:**
   - Click **Settings** tab
   - Click **Domains**
   - Click **Add Domain**

3. **Enter domain:**
   - Enter: `staff.piffdeals.lv`
   - Click **Add**

4. **Get DNS configuration:**
   - Vercel will show you DNS records to add
   - Usually a CNAME record pointing to `cname.vercel-dns.com`

### 4.2 Configure DNS in Cloudflare

1. **Go to Cloudflare DNS:**
   - Go to your domain (`piffdeals.lv`) in Cloudflare
   - Click **DNS** → **Records**

2. **Add CNAME Record:**
   - Click **Add record**
   - **Type:** `CNAME`
   - **Name:** `staff`
   - **Target:** `cname.vercel-dns.com` (or value shown by Vercel)
   - **Proxy status:** ✅ **Proxied** (orange cloud ON)
   - **TTL:** Auto
   - Click **Save**

3. **Wait for DNS propagation:**
   - Usually 1-5 minutes
   - Vercel will automatically provision SSL certificate

### 4.3 Verify Domain Configuration

**This step requires patience - DNS propagation can take time.**

1. **Check Domain Status in Vercel:**
   - Go to **Settings** → **Domains**
   - Find `staff.piffdeals.lv` in the list
   - **Status should show:**
     - ✅ **Valid Configuration** (green checkmark) - DNS is correct
     - ⏳ **Pending** - DNS is propagating (wait 5-10 minutes)
     - ❌ **Invalid Configuration** - DNS record is incorrect (fix it)
   
2. **If Status is "Pending":**
   - Wait 5-10 minutes
   - Refresh the page
   - Check status again
   - **Do not proceed until status is "Valid Configuration"**

3. **If Status is "Invalid Configuration":**
   - Check the DNS record in Cloudflare
   - Verify CNAME target is correct
   - Verify proxy is enabled (orange cloud ON)
   - Wait 5 minutes after fixing, then check again

4. **SSL Certificate Provisioning:**
   - Vercel automatically provisions SSL certificates
   - This happens after DNS is valid
   - Usually takes 2-5 minutes after DNS is valid
   - You'll see SSL status in the Domains section

5. **Test the Domain:**
   - Once status shows "Valid Configuration" and SSL is active:
   - Visit `https://staff.piffdeals.lv` in your browser
   - **Expected:** Your application loads
   - **Check:** No SSL certificate errors
   - **Check:** Site loads correctly (not a placeholder page)

6. **Verify HTTPS:**
   - Ensure the site loads with `https://` (not `http://`)
   - Browser should show a lock icon (🔒)
   - No "Not Secure" warnings

**⚠️ DO NOT PROCEED if:**
- ❌ DNS status is not "Valid Configuration"
- ❌ SSL certificate is not provisioned
- ❌ Site doesn't load at `https://staff.piffdeals.lv`
- ❌ SSL certificate errors appear

**Wait for DNS/SSL to complete, or fix any issues before continuing.**

---

## ⚡ Step 5: Performance Optimizations

### 5.1 Enable Vercel Analytics (Optional)

1. **Go to project → Analytics:**
   - Click **Analytics** tab
   - Enable **Web Analytics** (free tier available)
   - Monitor performance metrics

### 5.2 Configure Caching

The `vercel.json` configuration already includes:
- ✅ Static asset caching (1 year for `/assets/*`)
- ✅ Security headers
- ✅ SPA routing rewrites

### 5.3 Image Optimization (If Using Images)

If you add images later, use Vercel's Image Optimization:
- Use `<Image>` component from `next/image` (if migrating to Next.js)
- Or use Vercel's Image Optimization API

### 5.4 Edge Functions (Future)

For even better performance, consider:
- Moving API calls to Vercel Edge Functions
- Using Edge Middleware for authentication

---

## 🔄 Step 6: Set Up Automatic Deployments

### 6.1 Git Integration

If connected via Git:

1. **Automatic deployments:**
   - Every push to `main`/`master` → Production deployment
   - Every push to other branches → Preview deployment
   - Every Pull Request → Preview deployment with unique URL

2. **Configure branches:**
   - Go to **Settings** → **Git**
   - Set production branch (usually `main` or `master`)
   - Configure preview deployments

### 6.2 Deployment Workflow

**For updates:**
```bash
git add .
git commit -m "Update"
git push
```

Vercel automatically:
- ✅ Detects push
- ✅ Runs build
- ✅ Deploys to production
- ✅ Provides deployment URL
- ✅ Sends notifications (if configured)

---

## 🧪 Step 7: Comprehensive Testing

**This is the most important step.** Thorough testing ensures everything works correctly.

### 7.1 Initial Load Test

1. **Open the site:**
   - Visit `https://staff.piffdeals.lv` in a new incognito/private window
   - **Why incognito?** To avoid cached data from previous tests

2. **Check Browser Console:**
   - Press F12 to open DevTools
   - Go to **Console** tab
   - **Check for:**
     - ✅ No red errors
     - ✅ No warnings about missing environment variables
     - ✅ No CORS errors
     - ✅ No network errors (404s, 500s)
   
   **If you see errors:**
   - Note the exact error message
   - Check if it's related to environment variables
   - Check if it's a CORS issue
   - Document the error for troubleshooting

3. **Check Network Tab:**
   - In DevTools, go to **Network** tab
   - Refresh the page
   - **Check:**
     - ✅ All resources load (status 200)
     - ✅ No failed requests (status 4xx, 5xx)
     - ✅ Page loads in reasonable time (< 3 seconds)

4. **Verify Initial Page Load:**
   - ✅ Login page appears (or redirects correctly)
   - ✅ No blank white screen
   - ✅ No error messages displayed
   - ✅ Page is responsive (not broken layout)

### 7.2 Authentication Testing

1. **Test Login:**
   - Enter valid credentials
   - Click login
   - **Verify:**
     - ✅ Login succeeds
     - ✅ Redirects to dashboard (or expected page)
     - ✅ No authentication errors
     - ✅ Session persists (refresh page, still logged in)

2. **Test Logout:**
   - Click logout
   - **Verify:**
     - ✅ Logs out successfully
     - ✅ Redirects to login page
     - ✅ Cannot access protected routes after logout

3. **Test Protected Routes:**
   - While logged in, try accessing:
     - `/dashboard`
     - `/invoices`
     - `/user-accounts` (if admin)
   - **Verify:**
     - ✅ All routes are accessible
     - ✅ No 404 errors
     - ✅ Pages load correctly

### 7.3 Environment Variables Testing

1. **Test Supabase Connection:**
   - Login to the application
   - **Verify:**
     - ✅ Authentication works (Supabase connection)
     - ✅ Data loads from Supabase (invoices, users, etc.)
     - ✅ No Supabase-related errors in console

2. **Test Stripe Integration (if applicable):**
   - Navigate to any Stripe-related feature
   - **Verify:**
     - ✅ Stripe loads correctly
     - ✅ No Stripe API errors
     - ✅ Test keys are working

3. **Test Mozello API (if applicable):**
   - Navigate to products page
   - **Verify:**
     - ✅ Products load from Mozello API
     - ✅ No API errors
     - ✅ API calls succeed

### 7.4 Feature Testing

**Test each major feature systematically:**

1. **Dashboard:**
   - ✅ Loads correctly
   - ✅ Shows expected data
   - ✅ Charts/graphs render (if applicable)

2. **Invoice Management:**
   - ✅ Create new invoice
   - ✅ View invoice list
   - ✅ Edit invoice (if allowed)
   - ✅ Delete invoice (if allowed)
   - ✅ Download PDF (if applicable)
   - ✅ Send email (if applicable)

3. **User Management (if admin):**
   - ✅ View user list
   - ✅ Create new user
   - ✅ Edit user
   - ✅ Delete user (if allowed)

4. **Navigation:**
   - ✅ All menu items work
   - ✅ Breadcrumbs work (if applicable)
   - ✅ Back/forward browser buttons work
   - ✅ Direct URL access works (e.g., `/invoices` directly)

### 7.5 Routing Testing

**Critical for SPAs - test all routes:**

1. **Test Direct URL Access:**
   - Open new tab, visit:
     - `https://staff.piffdeals.lv/dashboard`
     - `https://staff.piffdeals.lv/invoices`
     - `https://staff.piffdeals.lv/user-accounts`
   - **Verify:**
     - ✅ All routes load (no 404)
     - ✅ Correct page appears
     - ✅ Not redirected to login (if already logged in)

2. **Test Route Navigation:**
   - Navigate between pages using the app
   - **Verify:**
     - ✅ Smooth transitions
     - ✅ URL changes correctly
     - ✅ Browser back/forward works

3. **Test 404 Handling:**
   - Visit a non-existent route: `https://staff.piffdeals.lv/nonexistent`
   - **Verify:**
     - ✅ Shows 404 page (or redirects appropriately)
     - ✅ Doesn't break the app

### 7.6 Performance Testing

1. **Page Load Speed:**
   - Use browser DevTools → **Network** tab
   - Refresh page
   - **Check:**
     - ✅ Initial load < 3 seconds
     - ✅ Time to Interactive < 5 seconds
     - ✅ No unusually large files (> 1MB)

2. **Asset Loading:**
   - **Verify:**
     - ✅ Images load correctly
     - ✅ Fonts load correctly
     - ✅ CSS styles apply correctly
     - ✅ No broken images/icons

3. **Mobile Responsiveness:**
   - Open DevTools → Toggle device toolbar
   - Test on mobile viewport (375px, 768px)
   - **Verify:**
     - ✅ Layout is responsive
     - ✅ No horizontal scrolling
     - ✅ Touch interactions work
     - ✅ Menu/navigation works on mobile

### 7.7 Error Handling Testing

1. **Test Error Scenarios:**
   - Try invalid login credentials
   - Try accessing admin page as non-admin
   - Try invalid form submissions
   - **Verify:**
     - ✅ Appropriate error messages appear
     - ✅ App doesn't crash
     - ✅ User can recover from errors

### 7.8 Cross-Browser Testing (Recommended)

Test in multiple browsers:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (if available)

**Verify:** App works consistently across browsers

### 7.9 Final Verification Checklist

Before considering deployment complete:

- [ ] Site loads at `https://staff.piffdeals.lv`
- [ ] No console errors
- [ ] No network errors
- [ ] Login works
- [ ] All routes work (no 404s)
- [ ] All features work
- [ ] Environment variables work (Supabase, Stripe, Mozello)
- [ ] Performance is acceptable
- [ ] Mobile responsive
- [ ] SSL certificate is valid
- [ ] No security warnings

**⚠️ DO NOT CONSIDER DEPLOYMENT COMPLETE if:**
- ❌ Any critical errors exist
- ❌ Core features don't work
- ❌ Environment variables are not working
- ❌ Routes return 404 errors
- ❌ Authentication fails

**Fix all issues before marking deployment as complete.**

---

## 🔒 Step 8: Security Configuration

### 8.1 CORS Configuration

Add `staff.piffdeals.lv` to Supabase CORS settings:

1. **Go to Supabase Dashboard:**
   - Settings → API
   - Find **CORS settings**
   - Add: `https://staff.piffdeals.lv`
   - Save

### 8.2 Security Headers

The `vercel.json` already includes:
- ✅ `X-Content-Type-Options: nosniff`
- ✅ `X-Frame-Options: DENY`
- ✅ `X-XSS-Protection: 1; mode=block`

### 8.3 Environment Variables

- ✅ Only `VITE_` variables are public (normal for frontend)
- ✅ Secret keys stay in Supabase Edge Functions
- ✅ Never commit `.env` files to Git

---

## 🔧 Troubleshooting

### Issue: "Missing Supabase environment variables" Error

**Solution:**
1. Go to Vercel → Your Project → Settings → Environment Variables
2. Verify all `VITE_` variables are set
3. Make sure they're enabled for **Production, Preview, Development**
4. Redeploy (push a new commit or redeploy from dashboard)

### Issue: "404 Not Found" on Routes

**Solution:**
1. Verify `vercel.json` includes the rewrite rule:
   ```json
   "rewrites": [
     {
       "source": "/(.*)",
       "destination": "/index.html"
     }
   ]
   ```
2. Redeploy after adding `vercel.json`

### Issue: Environment Variables Not Working

**Solution:**
1. Make sure variables start with `VITE_`
2. Redeploy after adding variables
3. Check browser console for errors
4. Verify variables are enabled for the correct environments

### Issue: CORS Errors

**Solution:**
1. Add `staff.piffdeals.lv` to Supabase CORS settings
2. Check Edge Functions have CORS headers (they already do)
3. Verify domain is correct in CORS settings

### Issue: Build Fails

**Solution:**
1. Check build logs in Vercel Dashboard
2. Test build locally: `npm run build`
3. Verify all dependencies are in `package.json`
4. Check Node.js version (Vercel auto-detects, but you can set in `package.json`)

### Issue: Slow Performance

**Solution:**
1. Enable Vercel Analytics to identify bottlenecks
2. Check bundle size (should be optimized by Vite)
3. Verify caching headers are set
4. Consider enabling Edge Functions for API calls

---

## 📊 Monitoring & Analytics

### Vercel Analytics

1. **Enable Analytics:**
   - Go to project → **Analytics** tab
   - Enable **Web Analytics**
   - View real-time metrics

2. **Monitor:**
   - Page views
   - Performance metrics
   - Error rates
   - Geographic distribution

### Deployment Logs

1. **View logs:**
   - Go to **Deployments** tab
   - Click on any deployment
   - View build logs and runtime logs

2. **Debug:**
   - Check for build errors
   - Verify environment variables
   - Check function logs (if using Edge Functions)

---

## 🔄 Agency Workflow: Managing Multiple Projects

### Best Practices for Agency Deployments

1. **Team Organization:**
   - Create a Vercel Team (if not already)
   - Add team members
   - Set project permissions

2. **Project Naming:**
   - Use consistent naming: `client-project-name`
   - Example: `piffdeals-staff`

3. **Environment Management:**
   - Use same environment variables structure across projects
   - Document required variables in each project

4. **Deployment Strategy:**
   - Use preview deployments for testing
   - Only deploy to production after approval
   - Use branch protection for production branch

5. **Monitoring:**
   - Set up alerts for failed deployments
   - Monitor performance across all projects
   - Use Vercel Analytics for insights

### Seamless Transitions

1. **Instant Rollbacks:**
   - If deployment fails, instantly rollback to previous version
   - Go to Deployments → Click on previous deployment → Promote to Production

2. **Preview Deployments:**
   - Test changes in preview before production
   - Share preview URLs with clients
   - Merge only after approval

3. **Zero-Downtime:**
   - Vercel provides zero-downtime deployments
   - New deployment is tested before going live
   - Automatic rollback on errors

---

## 📝 Update Process

### For Regular Updates

1. **Make changes locally:**
   ```bash
   npm run dev  # Test locally
   ```

2. **Build and test:**
   ```bash
   npm run build
   npm run preview
   ```

3. **Commit and push:**
   ```bash
   git add .
   git commit -m "Update description"
   git push
   ```

4. **Vercel automatically:**
   - ✅ Detects push
   - ✅ Builds project
   - ✅ Deploys to production
   - ✅ Provides deployment URL

### For Environment Variable Updates

1. **Update in Vercel:**
   - Go to Settings → Environment Variables
   - Update values
   - Save

2. **Redeploy:**
   - Go to Deployments
   - Click **Redeploy** on latest deployment
   - Or push a new commit

---

## 🔄 Switching to Production Keys (Future)

When ready for production:

1. **Update Environment Variables in Vercel:**
   - Go to Settings → Environment Variables
   - Update `VITE_STRIPE_PUBLISHABLE_KEY` from `pk_test_...` to `pk_live_...`
   - Update other keys as needed

2. **Update Supabase Edge Function Secrets:**
   - Go to Supabase Dashboard → Edge Functions → Secrets
   - Update `STRIPE_SECRET_KEY` from `sk_test_...` to `sk_live_...`

3. **Redeploy:**
   - Push a commit or redeploy from dashboard

**No code changes needed!** Just environment variables.

---

## ✅ Deployment Checklist

- [ ] Project builds successfully: `npm run build`
- [ ] Preview works locally: `npm run preview`
- [ ] Created `vercel.json` (optional but recommended)
- [ ] Connected project to Vercel (via Git or CLI)
- [ ] Added all environment variables in Vercel
- [ ] Configured custom domain `staff.piffdeals.lv`
- [ ] Added DNS CNAME record in Cloudflare
- [ ] SSL certificate provisioned
- [ ] Site loads at `https://staff.piffdeals.lv`
- [ ] Login works
- [ ] All features tested
- [ ] Added `staff.piffdeals.lv` to Supabase CORS settings
- [ ] No console errors
- [ ] Performance is good

---

## 🎉 You're Live!

Your application is now accessible at `https://staff.piffdeals.lv` with:
- ✅ Optimal performance (Vercel Edge Network)
- ✅ Automatic deployments from Git
- ✅ Preview deployments for testing
- ✅ Zero-downtime deployments
- ✅ All development keys intact

---

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [Vercel Performance Best Practices](https://vercel.com/docs/concepts/performance)
- [Supabase CORS Configuration](https://supabase.com/docs/guides/api/api-cors)

---

**Last Updated:** December 2024
**Status:** Ready for Vercel Deployment
**Phase:** Development/Testing

