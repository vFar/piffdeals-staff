# Vercel Deployment Guide

This guide will help you deploy the Piffdeals Staff Portal to Vercel for development/staging use.

## Prerequisites

- A Vercel account (sign up at [vercel.com](https://vercel.com))
- Your Supabase project credentials
- Your Mozello API credentials
- GitHub/GitLab/Bitbucket repository (if using Git integration)

## Environment Variables

The following environment variables **must** be configured in Vercel:

### Required Variables

1. **VITE_SUPABASE_URL**
   - Your Supabase project URL
   - Format: `https://xxxxx.supabase.co`
   - Get from: Supabase Dashboard → Project Settings → API

2. **VITE_SUPABASE_ANON_KEY**
   - Your Supabase anonymous/public key
   - Get from: Supabase Dashboard → Project Settings → API

3. **VITE_MOZELLO_API_URL**
   - Mozello API endpoint
   - Format: `https://api.mozello.com/v1`
   - (or your specific Mozello API URL)

4. **VITE_MOZELLO_API_KEY**
   - Your Mozello API authentication key
   - Get from: Mozello Dashboard → API Settings

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended for first-time setup)

1. **Import Project**
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "Add New..." → "Project"
   - Import your Git repository (GitHub/GitLab/Bitbucket)
   - Or upload your project folder directly

2. **Configure Project Settings**
   - **Framework Preset**: Vite (should auto-detect)
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: `npm run build` (auto-filled)
   - **Output Directory**: `dist` (auto-filled)
   - **Install Command**: `npm install` (auto-filled)

3. **Add Environment Variables**
   - In the "Environment Variables" section, add each variable:
     - `VITE_SUPABASE_URL` = `your_supabase_url`
     - `VITE_SUPABASE_ANON_KEY` = `your_supabase_anon_key`
     - `VITE_MOZELLO_API_URL` = `https://api.mozello.com/v1`
     - `VITE_MOZELLO_API_KEY` = `your_mozello_api_key`
   - Select environments: **Production**, **Preview**, and **Development**
   - Click "Add" for each variable

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (usually 1-2 minutes)

5. **Access Your Site**
   - Once deployed, you'll get a URL like: `https://your-project.vercel.app`
   - The URL will be shown in the deployment overview

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Set Environment Variables**
   ```bash
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY
   vercel env add VITE_MOZELLO_API_URL
   vercel env add VITE_MOZELLO_API_KEY
   ```
   - Follow prompts to enter values
   - Select environments: Production, Preview, Development

4. **Deploy**
   ```bash
   vercel
   ```
   - First deployment: Follow prompts to link project
   - Subsequent deployments: `vercel --prod` for production

## Configuration Files

The project includes a `vercel.json` configuration file that handles:
- ✅ SPA routing (all routes redirect to index.html)
- ✅ Security headers (XSS protection, frame options, etc.)
- ✅ Asset caching for optimal performance
- ✅ Build settings for Vite

**No changes needed** - this file is already configured correctly.

## Post-Deployment

### Verify Deployment

1. **Check Build Logs**
   - Go to Vercel Dashboard → Your Project → Deployments
   - Click on the latest deployment
   - Review build logs for any errors

2. **Test the Application**
   - Visit your deployment URL
   - Test login functionality
   - Verify Supabase connection works
   - Test API integrations

### Update Environment Variables

If you need to update environment variables later:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Edit or add variables
3. Redeploy the project (or wait for automatic redeploy on Git push)

## Important Notes

⚠️ **Development Mode**
- This deployment is for development/staging purposes
- No production keys need to be changed as requested
- All existing credentials will work as-is

🔄 **Automatic Deployments**
- If connected to Git, Vercel will auto-deploy on:
  - Push to main branch → Production deployment
  - Push to other branches → Preview deployment
  - Pull requests → Preview deployment with PR-specific URL

📝 **Custom Domain (Optional)**
- Go to Project Settings → Domains
- Add your custom domain (e.g., `staff.piffdeals.lv`)
- Configure DNS records as instructed by Vercel
- **SSL/HTTPS is automatic!** Vercel provides SSL certificates for free
- Wait 5-60 minutes for SSL certificate to be provisioned
- See `VERCEL_SSL_SETUP.md` for detailed HTTPS setup guide

## Troubleshooting

### Build Fails
- Check build logs in Vercel Dashboard
- Ensure all environment variables are set
- Verify `package.json` has correct build script

### Environment Variables Not Working
- Ensure variables start with `VITE_` prefix (required for Vite)
- Redeploy after adding/updating variables
- Check variable names match exactly (case-sensitive)

### Routing Issues (404 on refresh)
- The `vercel.json` file already handles this with rewrites
- If issues persist, check that `vercel.json` is in the root directory

### Supabase Connection Errors
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
- Check Supabase project is active
- Ensure CORS settings in Supabase allow your Vercel domain

## Support

For Vercel-specific issues:
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Support](https://vercel.com/support)

For project-specific issues:
- Check `PROJECT_OVERVIEW.md` for project details
- Review error logs in Vercel Dashboard








