# IP-Based Rate Limiting Deployment Guide

## Overview
Server-side IP-based rate limiting that blocks login attempts by IP address. **Refreshing the page won't bypass the block** because it's enforced at the server level.

## How It Works
- ✅ Blocks by **IP address** (not just email)
- ✅ **Server-side enforcement** (Supabase Edge Function)
- ✅ **Cannot be bypassed** by refreshing the page
- ✅ Blocks after 5 failed attempts for 15 minutes
- ✅ Automatically clears on successful login

## Deployment Steps

### 1. Run SQL Migration

Execute `add-login-rate-limiting-ip.sql` in Supabase SQL Editor:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy and paste the contents of `add-login-rate-limiting-ip.sql`
3. Click **Run**

This creates:
- `login_attempts_ip` table (tracks attempts by IP)
- Functions: `is_ip_blocked`, `get_ip_blocked_until`, `record_failed_login_ip`, `clear_login_attempts_ip`

### 2. Deploy Edge Function

Deploy the `rate-limited-login` Edge Function:

#### Option A: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref
# (Get project-ref from Supabase Dashboard → Settings → General)

# Deploy the function
supabase functions deploy rate-limited-login
```

#### Option B: Using Supabase Dashboard

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Click **Create a new function**
3. Name it: `rate-limited-login`
4. Copy and paste the contents of `supabase/functions/rate-limited-login/index.ts`
5. Click **Deploy**

### 3. Set Environment Variables

The Edge Function needs these environment variables (set in Supabase Dashboard → Edge Functions → rate-limited-login → Settings):

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (from Settings → API)
- `SUPABASE_ANON_KEY` - Anonymous key (from Settings → API)

**Note:** These are usually set automatically, but verify they exist.

### 4. Deploy Frontend Changes

The frontend is already updated to use the Edge Function. Deploy:

```bash
git add .
git commit -m "Add IP-based rate limiting via Edge Function"
git push origin main
```

Vercel will automatically build and deploy.

## Testing

### Test IP Blocking

1. **Try 5 failed logins** from the same IP
2. **6th attempt should be blocked** with message: "Bloķēts, mēģiniet vēlāk pēc X minūtēm!"
3. **Refresh the page** - block should still be active (server-side enforcement)
4. **Try different IP** - should work (blocking is per-IP)
5. **Wait 15 minutes** - block should auto-expire
6. **Successful login** - should clear the block immediately

### Verify Server-Side Enforcement

1. Get blocked (5 failed attempts)
2. Open browser DevTools → Network tab
3. Try to login again
4. Check the request to `/functions/v1/rate-limited-login`
5. Response should be **429 Too Many Requests**
6. **Refresh page** - block persists (enforced by server)

## How It Works

### Flow Diagram

```
User attempts login
    ↓
Frontend calls Edge Function: /functions/v1/rate-limited-login
    ↓
Edge Function checks IP in database
    ↓
If blocked → Return 429 error
If not blocked → Attempt login
    ↓
If login fails → Record attempt in database
If login succeeds → Clear attempts
```

### IP Detection

The Edge Function detects IP from:
1. `x-forwarded-for` header (primary)
2. `x-real-ip` header (fallback)
3. Falls back to 'unknown' if neither exists

**Note:** In production (Vercel), these headers are automatically set by the proxy.

## Differences from Client-Side

| Feature | Client-Side (Old) | Server-Side IP (New) |
|--------|------------------|---------------------|
| Blocking method | By email | By IP address |
| Can bypass by refresh? | ❌ Yes | ✅ No |
| Can bypass by clearing storage? | ❌ Yes | ✅ No |
| Works across devices? | ❌ No | ✅ Yes (same IP) |
| Server enforcement | ❌ No | ✅ Yes |

## Troubleshooting

### Edge Function returns 500 error

- Check environment variables are set
- Check Supabase service role key is correct
- Check function logs in Supabase Dashboard

### IP not being detected

- Check `x-forwarded-for` header in Edge Function logs
- In development, IP might be 'unknown' (expected)
- In production (Vercel), headers are set automatically

### Block not working

- Verify SQL migration ran successfully
- Check `login_attempts_ip` table exists
- Check Edge Function is deployed and active
- Check function logs for errors

## Security Notes

- ✅ **Server-side enforcement** - cannot be bypassed
- ✅ **IP-based** - blocks entire IP, not just email
- ✅ **Automatic expiration** - 15 minutes
- ✅ **Auto-clear on success** - successful login clears block
- ✅ **Database-backed** - persistent across server restarts

## Files Changed

- ✅ `add-login-rate-limiting-ip.sql` - Database schema
- ✅ `supabase/functions/rate-limited-login/index.ts` - Edge Function
- ✅ `src/contexts/AuthContext.jsx` - Updated to use Edge Function
- ✅ `src/pages/Login.jsx` - Updated to handle 429 responses

## Rollback

If you need to rollback:

1. Revert `src/contexts/AuthContext.jsx` to use `supabase.auth.signInWithPassword` directly
2. Revert `src/pages/Login.jsx` to remove block handling
3. Deploy frontend changes

The Edge Function and database table can remain (they won't interfere with direct auth).

