# ✅ Deployment Checklist

Use this checklist to ensure everything is set up correctly before and after deployment.

---

## 📋 Pre-Deployment Checklist

### Build & Test
- [ ] Project builds successfully: `npm run build`
- [ ] Preview works locally: `npm run preview` (test at http://localhost:4173)
- [ ] No build errors or warnings
- [ ] All pages load correctly in preview
- [ ] Login functionality works in preview
- [ ] No console errors in browser

### Environment Variables
- [ ] Have all required environment variable values ready:
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
  - [ ] `VITE_STRIPE_PUBLISHABLE_KEY` (if using Stripe)
  - [ ] `VITE_MOZELLO_API_URL` (if using Mozello)
  - [ ] `VITE_MOZELLO_API_KEY` (if using Mozello)
- [ ] All keys are **development/test keys** (not production)
- [ ] Values are copied and ready to paste

### Files
- [ ] `_redirects` file exists in `public/` folder (for SPA routing)
- [ ] `.env.local` is in `.gitignore` (if using Git)
- [ ] `dist` folder is in `.gitignore` (if using Git)

### Supabase Configuration
- [ ] Supabase project is set up and working
- [ ] Edge Functions are deployed (if using any)
- [ ] Database schema is set up
- [ ] RLS policies are configured

---

## 🚀 Deployment Steps Checklist

### Cloudflare Pages Setup
- [ ] Created Cloudflare account (or logged in)
- [ ] Created new Pages project
- [ ] Either:
  - [ ] Connected Git repository, OR
  - [ ] Built and uploaded `dist` folder directly

### Build Configuration (If Using Git)
- [ ] Framework preset: `Vite`
- [ ] Build command: `npm run build`
- [ ] Build output directory: `dist`
- [ ] Root directory: `/` (or empty)

### Environment Variables
- [ ] Added `VITE_SUPABASE_URL` in Cloudflare Pages
- [ ] Added `VITE_SUPABASE_ANON_KEY` in Cloudflare Pages
- [ ] Added `VITE_STRIPE_PUBLISHABLE_KEY` (if applicable)
- [ ] Added `VITE_MOZELLO_API_URL` (if applicable)
- [ ] Added `VITE_MOZELLO_API_KEY` (if applicable)
- [ ] All variables have correct values (double-checked)
- [ ] Redeployed after adding variables (if using Direct Upload)

### Domain Configuration
- [ ] Added custom domain `staff.piffdeals.lv` in Cloudflare Pages
- [ ] Added CNAME DNS record in Cloudflare:
  - [ ] Type: `CNAME`
  - [ ] Name: `staff`
  - [ ] Target: `[your-pages-url].pages.dev`
  - [ ] Proxy: ✅ ON (orange cloud)
- [ ] Waited 2-5 minutes for DNS propagation
- [ ] SSL certificate shows as Active/Provisioned

---

## 🧪 Post-Deployment Testing Checklist

### Basic Functionality
- [ ] Site loads at `https://staff.piffdeals.lv`
- [ ] No 404 errors on initial load
- [ ] No console errors in browser (F12)
- [ ] HTTPS is working (green lock icon)
- [ ] Page title is correct

### Authentication
- [ ] Login page loads correctly
- [ ] Can login with test credentials
- [ ] Session persists after login
- [ ] Logout works correctly
- [ ] Protected routes redirect to login when not authenticated

### Navigation & Routing
- [ ] All routes work (no 404s on navigation)
- [ ] Browser back/forward buttons work
- [ ] Direct URL access works (e.g., `/dashboard` directly)
- [ ] No infinite redirects

### Features Testing
- [ ] Dashboard loads correctly
- [ ] Invoice creation works (if applicable)
- [ ] Invoice list/view works
- [ ] User management works (if admin)
- [ ] Products load (if using Mozello)
- [ ] Charts/analytics load (if applicable)

### API Integration
- [ ] Supabase connection works (no CORS errors)
- [ ] Database queries work
- [ ] Edge Functions work (if using any)
- [ ] Stripe integration works (if applicable)
- [ ] Mozello API works (if applicable)

### Performance
- [ ] Page loads quickly (< 3 seconds)
- [ ] Images load correctly
- [ ] No broken assets (images, fonts, etc.)
- [ ] Mobile responsive (test on phone/tablet)

---

## 🔒 Security Checklist

### Environment Variables
- [ ] Only `VITE_` variables are in frontend (public)
- [ ] No secret keys exposed (service_role, etc.)
- [ ] Secret keys are only in Supabase Edge Function secrets

### CORS Configuration
- [ ] Added `staff.piffdeals.lv` to Supabase CORS settings:
  - [ ] Go to Supabase Dashboard → Settings → API
  - [ ] Add `https://staff.piffdeals.lv` to allowed origins
- [ ] No CORS errors in browser console

### HTTPS
- [ ] Site is accessible only via HTTPS
- [ ] HTTP redirects to HTTPS (automatic with Cloudflare)
- [ ] SSL certificate is valid (green lock)

---

## 📊 Monitoring Checklist

### Cloudflare Pages
- [ ] Deployment shows as "Success" in Cloudflare Pages
- [ ] Build logs show no errors
- [ ] Can view deployment history

### Analytics (Optional)
- [ ] Set up Cloudflare Analytics (if desired)
- [ ] Monitor error rates
- [ ] Check page load times

---

## 🔄 Update/Deployment Process

### For Future Updates

**If Using Git:**
- [ ] Make changes locally
- [ ] Test locally (`npm run dev`)
- [ ] Build and test preview (`npm run build && npm run preview`)
- [ ] Commit changes: `git add . && git commit -m "Update"`
- [ ] Push: `git push`
- [ ] Verify deployment in Cloudflare Pages
- [ ] Test on live site

**If Using Direct Upload:**
- [ ] Make changes locally
- [ ] Test locally (`npm run dev`)
- [ ] Build: `npm run build`
- [ ] Upload new `dist` folder to Cloudflare Pages
- [ ] Verify deployment
- [ ] Test on live site

---

## 🐛 Troubleshooting Checklist

If something doesn't work:

- [ ] Check browser console for errors (F12)
- [ ] Check Cloudflare Pages deployment logs
- [ ] Verify environment variables are set correctly
- [ ] Verify DNS record is correct (CNAME pointing to Pages URL)
- [ ] Check Supabase CORS settings
- [ ] Verify SSL certificate is active
- [ ] Try clearing browser cache
- [ ] Check if `_redirects` file is in `dist` folder after build

---

## ✅ Final Verification

Before marking deployment as complete:

- [ ] All pre-deployment items checked
- [ ] All deployment steps completed
- [ ] All post-deployment tests passed
- [ ] All security items verified
- [ ] Site is accessible and functional
- [ ] Team can access and use the site
- [ ] Documentation updated (if needed)

---

## 📝 Notes

- **Development Keys:** All keys are test/development keys - this is correct for now
- **Production Keys:** When ready for production, update environment variables (see DEPLOYMENT_GUIDE.md)
- **Updates:** Use Git for easier updates, or Direct Upload for quick changes

---

**Status:** ⏳ Ready to Deploy
**Last Updated:** December 2024

