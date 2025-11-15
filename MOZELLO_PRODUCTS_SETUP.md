# Mozello Products API Setup Guide

## Overview
This guide explains how to securely load products from the Mozello API in your invoice creation page using Supabase Edge Functions.

## Why Use Edge Functions?

Previously, the Mozello API key was hardcoded in the frontend (`mozelloService.js`), which meant:
- ❌ Anyone could view your API key in the browser
- ❌ Your API key could be stolen and misused
- ❌ Security risk for your Mozello store

Now with Edge Functions:
- ✅ API key is stored securely in Supabase secrets
- ✅ API calls are made server-side
- ✅ Frontend only calls your secure Edge Function
- ✅ Much better security!

---

## Prerequisites

1. Supabase CLI installed
2. Project linked to Supabase
3. Mozello API Key

---

## Step 1: Install Supabase CLI

### Windows (PowerShell)
```powershell
# Using npm
npm install -g supabase

# OR using Scoop
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Mac/Linux
```bash
npm install -g supabase
```

### Verify Installation
```bash
supabase --version
```

---

## Step 2: Get Your Mozello API Key

Your Mozello API key is currently in `src/services/mozelloService.js`:

```javascript
const MOZELLO_API_KEY = 'MZL-2322156-d84bf15a29941297f704ebd31b71bb54';
```

**Copy this key** - you'll need it in Step 4!

Alternatively, get it from your Mozello dashboard:
1. Go to your Mozello admin panel
2. Navigate to API settings
3. Copy your API key

---

## Step 3: Deploy the Edge Function

We've created a deployment script that will guide you through the process.

### Windows (PowerShell)

```powershell
.\deploy-mozello-function.ps1
```

### Mac/Linux

```bash
chmod +x deploy-mozello-function.sh
./deploy-mozello-function.sh
```

The script will:
1. ✅ Check if Supabase CLI is installed
2. ✅ Login to Supabase (opens browser)
3. ✅ Link your project (asks for project reference ID)
4. ✅ Set Mozello API key as a secret
5. ✅ Deploy the edge function

### What You'll Need

**Project Reference ID:**
- Go to https://supabase.com/dashboard
- Open your project
- Go to **Settings** > **General**
- Copy your **Reference ID** (e.g., `emqhyievrsyeinwrqqhw`)

**Mozello API Key:**
- Use the key from `mozelloService.js` (see Step 2)

---

## Step 4: Remove Hardcoded API Key (IMPORTANT!)

After successful deployment, remove the hardcoded API key from your code:

The `mozelloService.js` file has already been updated to use the Edge Function instead. The old code with the exposed API key has been removed.

You can verify by checking `src/services/mozelloService.js` - it should now look like this:

```javascript
async getProducts() {
  try {
    // Call Edge Function to securely fetch products
    const { data, error } = await supabase.functions.invoke(
      'fetch-mozello-products',
      {
        body: {},
      }
    );
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error fetching Mozello products:', error);
    throw error;
  }
}
```

---

## Step 5: Test the Integration

1. Run your development server:
```bash
npm run dev
```

2. Navigate to the **Create Invoice** page

3. The product dropdown should load products from Mozello

4. Open browser DevTools (F12) → Network tab to verify the Edge Function is being called:
   - Look for a request to: `fetch-mozello-products`
   - Should return status 200 with product data

---

## How It Works

```
┌─────────────────┐
│  Create Invoice │
│      Page       │
└────────┬────────┘
         │ 1. User opens page
         │
         ▼
┌─────────────────────┐
│  mozelloService.js  │
│  getProducts()      │
└────────┬────────────┘
         │ 2. Calls Edge Function
         │
         ▼
┌──────────────────────────────┐
│  Supabase Edge Function      │
│  fetch-mozello-products      │
│  (Server-side, Secure)       │
└────────┬─────────────────────┘
         │ 3. Uses secret API key
         │
         ▼
┌──────────────────────────────┐
│     Mozello API              │
│     api.mozello.com          │
└────────┬─────────────────────┘
         │ 4. Returns products
         │
         ▼
┌──────────────────────────────┐
│   Frontend displays products │
└──────────────────────────────┘
```

---

## Troubleshooting

### Error: "MOZELLO_API_KEY not configured"

**Solution:** Run the deployment script again and make sure to set the API key:
```bash
supabase secrets set MOZELLO_API_KEY="your-key-here"
```

### Error: "Unauthorized"

**Cause:** User is not logged in

**Solution:** Make sure you're logged into the app before accessing the Create Invoice page

### Error: "Failed to fetch products"

**Cause:** Mozello API might be down or API key is invalid

**Solution:**
1. Check if your Mozello API key is correct
2. Verify the API key works by testing it directly
3. Check Supabase function logs:
   ```bash
   supabase functions logs fetch-mozello-products
   ```

### Products not loading

1. Open browser DevTools (F12) → Console tab
2. Check for error messages
3. Verify the Edge Function is deployed:
   ```bash
   supabase functions list
   ```
4. Check function logs:
   ```bash
   supabase functions logs fetch-mozello-products
   ```

---

## Updating the Edge Function

If you need to modify the function logic:

1. Edit `supabase/functions/fetch-mozello-products/index.ts`
2. Redeploy:
   ```bash
   supabase functions deploy fetch-mozello-products
   ```

---

## Security Best Practices

✅ **DO:**
- Keep API keys in Supabase secrets
- Use Edge Functions for sensitive API calls
- Verify user authentication in Edge Functions

❌ **DON'T:**
- Hardcode API keys in frontend code
- Commit secrets to Git
- Expose API keys in environment variables that are bundled with frontend

---

## Summary

You've now:
1. ✅ Created a secure Edge Function to fetch Mozello products
2. ✅ Stored your Mozello API key securely in Supabase
3. ✅ Updated the frontend to use the Edge Function
4. ✅ Removed the hardcoded API key from your code

Your Mozello integration is now **secure and production-ready**! 🎉


