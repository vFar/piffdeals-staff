# User Creation Setup Guide

This guide explains how to set up user creation functionality in the Piffdeals Staff Portal.

## Overview

User creation requires two steps:
1. Create user in Supabase Auth (requires admin privileges)
2. Create user profile in `user_profiles` table

Since Supabase Admin API requires server-side access, you need to set up either:
- **Option 1: Supabase Edge Function** (Recommended)
- **Option 2: Backend API Endpoint**

## Option 1: Supabase Edge Function (Recommended)

### Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

### Step 2: Login to Supabase

```bash
supabase login
```

### Step 3: Link Your Project

```bash
supabase link --project-ref your-project-ref
```

You can find your project ref in your Supabase dashboard URL: `https://app.supabase.com/project/[project-ref]`

### Step 4: Set Environment Variables

In your Supabase dashboard:
1. Go to Project Settings → Edge Functions
2. Add the following secrets:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (found in Project Settings → API)

Or use the CLI:

```bash
supabase secrets set SUPABASE_URL=your-project-url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Step 5: Deploy the Edge Function

```bash
supabase functions deploy create-user
```

### Step 6: Update Environment Variables

Make sure your `.env` file has:

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

The edge function will be available at: `${VITE_SUPABASE_URL}/functions/v1/create-user`

## Option 2: Backend API Endpoint

If you prefer to use your own backend API:

1. Create an API endpoint (e.g., `/api/users/create`)
2. Use Supabase Admin Client with service role key:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Create auth user
const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

// Create profile
await supabaseAdmin
  .from('user_profiles')
  .insert({
    id: authData.user.id,
    email,
    username,
    role,
    status,
  });
```

3. Update `src/pages/UserAccounts.jsx` to call your API endpoint instead of the edge function.

## Database Function Setup

The `create_user_profile` function is already created in the database schema. To ensure it exists, run:

```sql
-- See create-user-function.sql for the function definition
```

Or run it directly in your Supabase SQL editor.

## Testing

1. Open the User Accounts page
2. Click "Pievienot jaunu lietotāju" (Add New User)
3. Fill in the form:
   - Name
   - Email
   - Password
   - Role (employee, admin, super_admin)
   - Status (active, inactive, suspended)
4. Click "Izveidot lietotāju" (Create User)

## Troubleshooting

### Error: "Lietotāja izveide prasa servera piekļuvi"

This means the edge function or backend API is not set up. Follow Option 1 or 2 above.

### Error: "Invalid role" or "Invalid status"

Make sure you're using valid values:
- Roles: `employee`, `admin`, `super_admin`
- Status: `active`, `inactive`, `suspended`

### Error: "Email already exists"

The email is already registered. Use a different email or check existing users.

## Security Notes

⚠️ **Important**: Never expose your service role key in client-side code. Always use it server-side (Edge Functions or backend API).

The service role key bypasses Row Level Security (RLS), so it should only be used in secure server-side environments.


