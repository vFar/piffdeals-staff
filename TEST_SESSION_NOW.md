# Quick Test: Is Single Session Working?

## Test Right Now (5 minutes)

### Step 1: Check Database (30 seconds)

Go to **Supabase Dashboard → SQL Editor** and run:

```sql
-- Check if sessions are being created
SELECT 
  user_id,
  session_id,
  created_at,
  expires_at,
  ip_address
FROM active_sessions
ORDER BY created_at DESC
LIMIT 10;
```

**What to look for:**
- ✅ **If you see rows**: Sessions ARE being created → Go to Step 2
- ❌ **If empty**: Sessions NOT being created → See "Fix 1" below

---

### Step 2: Check Browser Console (1 minute)

1. Open your app
2. Log in
3. Open **DevTools** (F12)
4. Go to **Console** tab
5. Type: `localStorage.getItem('session_id')`

**What to look for:**
- ✅ **If you see a session ID**: Frontend is working → Go to Step 3
- ❌ **If null**: Frontend not storing session → See "Fix 2" below

---

### Step 3: Test Concurrent Login (2 minutes)

1. **Computer A**: Already logged in
2. **Computer A Console**: Type `localStorage.getItem('session_id')` and note the ID
3. **Computer B**: Log in with same user
4. **Computer A**: Wait 60 seconds (to be safe)
5. **Computer A**: Check if you're still logged in

**What should happen:**
- ✅ Computer A shows modal "Sesija pārtraukta"
- ✅ Computer A redirects to login

**If nothing happens:**
- Check Console for errors
- Check Network tab for `is_session_valid` calls
- See "Fix 3" below

---

## Fixes

### Fix 1: Sessions Not Being Created

**Problem**: Edge Function isn't creating sessions in database

**Check Edge Function Logs**:
1. Go to **Supabase Dashboard**
2. **Edge Functions** → **rate-limited-login**
3. Click **Logs**
4. Look for errors

**Common Issues**:
- Function not deployed: `supabase functions deploy rate-limited-login`
- Database permissions: Check RLS policies
- Function error: Look for error in logs about `active_sessions` or `terminate_other_sessions`

**Manual Test**:
```sql
-- Test if you can insert manually
INSERT INTO active_sessions (
  user_id,
  session_id,
  access_token,
  refresh_token,
  expires_at
) VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  'manual_test_123',
  'test',
  'test',
  now() + interval '1 hour'
);

-- If this fails, there's a permissions issue
-- If it works, the Edge Function isn't running the code
```

---

### Fix 2: Frontend Not Storing session_id

**Problem**: Frontend code not updated or not running

**Solution**:
1. Hard refresh browser: **Ctrl + Shift + R** (or Cmd + Shift + R on Mac)
2. Clear browser cache
3. Check if dev server is running latest code
4. Try logging out and logging in again

**Verify the code is loaded**:
In Console, type:
```javascript
// Check if AuthContext has the session validation
console.log('Auth context loaded');
```

---

### Fix 3: Validation Not Running

**Problem**: Session validation interval not working

**Check in Console**:
Look for any errors related to:
- `validateSession`
- `is_session_valid`
- `supabase.rpc`

**Check Network Tab**:
1. Open **DevTools** → **Network** tab
2. Wait 30 seconds
3. Look for a call to `is_session_valid` or similar RPC call

**If no RPC calls**: The validation interval isn't running

**Possible causes**:
- JavaScript error preventing the interval from starting
- Frontend code not updated
- Browser blocking the requests

---

## Quick Diagnostic

Run this complete check:

### Database Check:
```sql
-- 1. Table exists?
SELECT COUNT(*) FROM active_sessions;

-- 2. Functions exist?
SELECT COUNT(*) FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'terminate_other_sessions',
    'is_session_valid'
  );
-- Should return 2

-- 3. Any sessions?
SELECT * FROM active_sessions ORDER BY created_at DESC LIMIT 5;
```

### Browser Check:
```javascript
// In Console:
// 1. Session ID stored?
console.log('Session ID:', localStorage.getItem('session_id'));

// 2. Any errors?
// Look in Console for red error messages

// 3. Network calls?
// Check Network tab for 'is_session_valid' calls
```

---

## Most Likely Issue

Based on your situation (table exists, functions deployed), the most likely issues are:

### 1. Edge Function Not Actually Updated
Even though you deployed it, the code might not have the session management.

**Test**: Check Edge Function logs after login to see if there are any errors about `terminate_other_sessions` or `active_sessions`

### 2. Frontend Not Refreshed
The browser is still using old cached code.

**Test**: Hard refresh (Ctrl+Shift+R) and clear cache, then log in again

### 3. Session ID Not Being Returned
The Edge Function creates the session but doesn't return the `session_id` to the frontend.

**Test**: Check Network tab → Look at the response from `rate-limited-login` → See if `session.session_id` exists

---

## What to Share

To help debug, please share:

1. **Database query result**:
```sql
SELECT * FROM active_sessions ORDER BY created_at DESC LIMIT 5;
```

2. **localStorage check**:
```javascript
localStorage.getItem('session_id')
```

3. **Any Console errors** (screenshot or copy/paste)

4. **Edge Function logs** (if you see any errors)

This will tell us exactly where the issue is!



