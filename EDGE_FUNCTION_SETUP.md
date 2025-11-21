# Supabase Edge Function Setup Guide

## Overview
The `create-user` edge function allows admins to create new users with authentication accounts and profiles.

## Prerequisites
1. Supabase CLI installed
2. Project linked to Supabase
3. Service Role Key configured

---

## Step 1: Install Supabase CLI

### Windows (PowerShell)
```powershell
# Using Scoop
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# OR using npm
npm install -g supabase
```

### Verify Installation
```bash
supabase --version
```

---

## Step 2: Login to Supabase

```bash
supabase login
```

This will open your browser to authenticate with Supabase.

---

## Step 3: Link Your Project

1. **Get your project reference ID:**
   - Go to https://supabase.com/dashboard
   - Open your project
   - Go to **Settings** > **General**
   - Copy your **Reference ID** (looks like: `emqhyievrsyeinwrqqhw`)

2. **Link the project:**
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

Example:
```bash
supabase link --project-ref emqhyievrsyeinwrqqhw
```

---

## Step 4: Set Environment Variables (Service Role Key)

1. **Get your Service Role Key:**
   - Go to https://supabase.com/dashboard
   - Open your project
   - Go to **Settings** > **API**
   - Copy your **service_role key** (secret key - DO NOT expose publicly!)

2. **Set the secret in Supabase:**
```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Example:
```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Step 5: Deploy the Edge Function

From your project root directory:

```bash
supabase functions deploy create-user
```

You should see output like:
```
Deploying function create-user...
Function create-user deployed successfully!
URL: https://emqhyievrsyeinwrqqhw.supabase.co/functions/v1/create-user
```

---

## Step 6: Verify Deployment

Test the function is accessible:

```bash
curl -i https://YOUR_PROJECT_REF.supabase.co/functions/v1/create-user
```

You should get a CORS or authentication error (this is expected - it means the function is running).

---

## Step 7: Test Creating a User

Now try creating a user through your application. The function will:
1. ✅ Create user in Supabase Auth
2. ✅ Create profile in `user_profiles` table
3. ✅ User appears in both Auth and your application table

---

## Troubleshooting

### CORS Errors
- Make sure you deployed the function (it has CORS headers built-in)
- Check the function logs: `supabase functions logs create-user`

### "Missing service_role key" Error
- Run: `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_key`
- Verify: `supabase secrets list`

### Function Not Found (404)
- Verify deployment: `supabase functions list`
- Redeploy: `supabase functions deploy create-user`

### View Function Logs
```bash
supabase functions logs create-user --follow
```

---

## What Happens When You Create a User

1. **Frontend** sends request with user details (email, password, username, role, status)
2. **Edge Function** receives request with auth token
3. **Creates Auth User** using Supabase Admin API (bypasses normal restrictions)
4. **Creates Profile** in `user_profiles` table with same ID as auth user
5. **Returns** the new user ID to frontend
6. **Frontend** refreshes the user list - new user appears in table
7. **User can login** with their email and password

---

## Security Notes

⚠️ **NEVER** expose your Service Role Key in:
- Frontend code
- Git repositories
- Browser console
- Public documentation

✅ Service Role Key is ONLY stored in:
- Supabase Edge Function environment (secure)
- Your local `.env` file (never committed to git)

---

## Alternative: Manual User Creation (Temporary Workaround)

If you can't deploy edge functions right now, you can manually create users:

1. Go to Supabase Dashboard > Authentication > Users
2. Click "Add User"
3. Enter email and password
4. Copy the User ID
5. Go to Table Editor > user_profiles
6. Insert new row with:
   - `id`: (paste User ID from step 4)
   - `email`: user email
   - `username`: user name
   - `role`: employee/admin/super_admin
   - `status`: active

This creates users in both Auth and profiles table manually.










