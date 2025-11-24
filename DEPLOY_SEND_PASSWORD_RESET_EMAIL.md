# Deploy send-password-reset-email Function

## Quick Deploy via Supabase Dashboard

### Option 1: Deploy via Dashboard (Easiest)

1. **Go to Supabase Dashboard**
   - Open https://app.supabase.com
   - Select your project
   - Go to **Edge Functions** in the left sidebar

2. **Create/Deploy Function**
   - Click **"Create a new function"** or find `send-password-reset-email`
   - If it exists, click on it and then **"Deploy"** or **"Redeploy"**
   - If it doesn't exist, click **"Create function"**

3. **Copy Function Code**
   - Open `supabase/functions/send-password-reset-email/index.ts` in your editor
   - Copy the ENTIRE file contents
   - Paste into the Dashboard code editor

4. **Set Environment Variables (Secrets)**
   - In the function settings, go to **Secrets** or **Environment Variables**
   - Add these required secrets:
     - `SUPABASE_SERVICE_ROLE_KEY` - Your service role key (from Project Settings → API)
     - `RESEND_API_KEY` - Your Resend API key
     - `FROM_EMAIL` (optional) - Email address to send from (e.g., `noreply@piffdeals.lv`)
     - `COMPANY_NAME` (optional) - Defaults to "Piffdeals"
     - `PUBLIC_SITE_URL` (optional) - Your site URL (e.g., `https://staff.piffdeals.lv`)

5. **Deploy**
   - Click **"Deploy"** or **"Save"**
   - Wait for deployment to complete

### Option 2: Deploy via CLI

```bash
# 1. Make sure you're in the project directory
cd C:\Users\Markuss\Desktop\piffdeals-staff

# 2. Login to Supabase (if not already logged in)
supabase login

# 3. Link to your project (if not already linked)
supabase link --project-ref emqhyievrsyeinwrqqhw

# 4. Deploy the function
supabase functions deploy send-password-reset-email
```

## Verify Deployment

1. **Check Supabase Dashboard**
   - Go to Edge Functions
   - Verify `send-password-reset-email` is in the list
   - Check that it shows "Active" status
   - Check the "Last Updated" timestamp

2. **Test the Function**
   - Try sending a password reset email from the app
   - Check function logs in Dashboard → Edge Functions → Logs

## Troubleshooting

### Function Not Found (404)
- Verify function name is exactly `send-password-reset-email` (with hyphens, not underscores)
- Check that function is deployed and active
- Verify you're using the correct Supabase project

### CORS Errors
- The function should work with direct URL (no proxy needed)
- If CORS errors occur, check function CORS headers in the code

### Email Not Sending
- Verify `RESEND_API_KEY` is set correctly
- Check `FROM_EMAIL` is a verified domain in Resend
- Check function logs for errors

## Function Name
- **Correct**: `send-password-reset-email` ✅
- **Wrong**: `send-reset-password-email` ❌
- **Wrong**: `send_password_reset_email` ❌

Make sure the folder name and function name match exactly!

