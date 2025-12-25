# Single Session Troubleshooting Guide

## You've deployed everything but it's not working? Here's why:

---

## Use the Session Debugger

I've added a **SessionDebugger** component to your Dashboard that will show you exactly what's happening.

### To use it:

1. **Log in** to your app
2. **Go to Dashboard**
3. **Look for the yellow/orange card** at the top that says "🔍 Session Debugger"
4. **Click the buttons** to check:
   - Session ID in localStorage
   - Database sessions
   - Validation status

This will tell you EXACTLY where the problem is.

---

## Common Issues & Solutions

### Issue 1: "Session ID (localStorage): NOT FOUND"

**Problem**: The Edge Function isn't returning the `session_id` to the frontend

**Causes**:
- Edge Function code not actually updated
- Edge Function deployed to wrong project
- Edge Function error (check logs)

**Solution**:
```bash
# Redeploy the function
supabase functions deploy rate-limited-login --project-ref YOUR_PROJECT_REF

# Check the logs
# Go to Supabase Dashboard → Edge Functions → rate-limited-login → Logs
# Look for errors about "session" or "active_sessions"
```

**Manual Test**:
1. Open DevTools → Network tab
2. Log in
3. Find the `rate-limited-login` request
4. Check the response - does it have `session.session_id`?

---

### Issue 2: "Database Sessions: (empty)"

**Problem**: Sessions are not being created in the database

**Causes**:
- Edge Function can't insert into `active_sessions` table
- RLS policies blocking inserts
- Function `terminate_other_sessions` doesn't exist

**Solution**:

**Check RLS policies**:
```sql
-- In Supabase SQL Editor
SELECT * FROM pg_policies WHERE tablename = 'active_sessions';

-- Should see a policy for service_role
```

**Test manual insert**:
```sql
-- Try inserting manually
INSERT INTO active_sessions (
  user_id,
  session_id,
  access_token,
  refresh_token,
  expires_at
) VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  'test_123',
  'test',
  'test',
  now() + interval '1 hour'
);

-- If this fails, there's a permissions issue
-- If it works, the Edge Function isn't running
```

**Check Edge Function logs**:
- Go to Supabase Dashboard
- Edge Functions → rate-limited-login → Logs
- Look for errors about `active_sessions` or `terminate_other_sessions`

---

### Issue 3: "Validation Test: INVALID"

**Problem**: Session exists but validation returns false

**Causes**:
- Session expired
- Wrong session_id in localStorage
- Function `is_session_valid` has a bug

**Solution**:

**Check if session expired**:
```sql
SELECT 
  session_id,
  expires_at,
  expires_at > now() as is_valid
FROM active_sessions
WHERE user_id = 'YOUR_USER_ID'::uuid;
```

**Test the function directly**:
```sql
SELECT is_session_valid(
  'YOUR_USER_ID'::uuid,
  'YOUR_SESSION_ID'
);
-- Should return true if session exists and not expired
```

---

### Issue 4: "Validation Test: Error"

**Problem**: The validation function can't be called

**Causes**:
- Function doesn't exist
- Permission denied
- Wrong function signature

**Solution**:

**Check if function exists**:
```sql
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'is_session_valid';
```

**Check permissions**:
```sql
-- Grant permissions (run this if needed)
GRANT EXECUTE ON FUNCTION public.is_session_valid TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_session_valid TO service_role;
```

---

## Step-by-Step Debugging

### Step 1: Check Database Setup

```sql
-- Run this complete diagnostic
SELECT '=== TABLE EXISTS ===' as check;
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'active_sessions'
) as result;

SELECT '=== FUNCTIONS EXIST ===' as check;
SELECT COUNT(*) as count FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'terminate_other_sessions',
    'is_session_valid',
    'cleanup_expired_sessions',
    'update_session_activity'
  );
-- Should return 4

SELECT '=== CURRENT SESSIONS ===' as check;
SELECT * FROM active_sessions;

SELECT '=== RLS POLICIES ===' as check;
SELECT * FROM pg_policies WHERE tablename = 'active_sessions';
```

**Expected Results**:
- Table exists: `true`
- Functions count: `4`
- Sessions: May be empty or have rows
- RLS Policies: Should see at least 2 policies

---

### Step 2: Test Edge Function

1. **Check if deployed**:
   - Go to Supabase Dashboard
   - Edge Functions
   - Should see `rate-limited-login` in the list

2. **Check logs**:
   - Click on `rate-limited-login`
   - Click "Logs"
   - Log in from your app
   - Look for new log entries
   - Look for errors

3. **Test the response**:
   - Open DevTools → Network tab
   - Log in
   - Find `rate-limited-login` request
   - Check Response tab
   - Should see: `{ "success": true, "user": {...}, "session": { "session_id": "..." } }`

---

### Step 3: Test Frontend

1. **Check if code is loaded**:
   - Open DevTools → Console
   - Type: `localStorage.getItem('session_id')`
   - Should return a session ID after login

2. **Check for errors**:
   - Look in Console for any red errors
   - Especially errors about `validateSession` or `is_session_valid`

3. **Check validation is running**:
   - Open DevTools → Console
   - Wait 30 seconds after login
   - You should see network requests to `is_session_valid` every 30 seconds
   - Check Network tab → Filter by "is_session_valid"

---

## The Complete Flow (What Should Happen)

### When you log in on Computer A:

1. ✅ Edge Function receives login request
2. ✅ Authenticates with Supabase
3. ✅ Generates `session_id` like `"abc123_1234567890_xyz"`
4. ✅ Calls `terminate_other_sessions()` (deletes old sessions)
5. ✅ Inserts new session into `active_sessions` table
6. ✅ Returns response with `session.session_id`
7. ✅ Frontend stores `session_id` in localStorage
8. ✅ Frontend starts validation interval (every 30 seconds)

### When you log in on Computer B (same user):

1. ✅ Edge Function receives login request
2. ✅ Generates NEW `session_id` like `"xyz789_9876543210_abc"`
3. ✅ Calls `terminate_other_sessions()` → **Deletes Computer A's session**
4. ✅ Inserts Computer B's session
5. ✅ Computer B is now logged in

### On Computer A (within 30 seconds):

1. ✅ Validation interval runs
2. ✅ Calls `is_session_valid(user_id, "abc123_1234567890_xyz")`
3. ✅ Function returns `false` (session not found in database)
4. ✅ Frontend detects invalid session
5. ✅ Signs out locally
6. ✅ Shows "Sesija pārtraukta" modal
7. ✅ Redirects to login

---

## Quick Fixes

### Fix 1: Redeploy Everything

```bash
# 1. Redeploy Edge Function
supabase functions deploy rate-limited-login

# 2. Hard refresh browser
# Press Ctrl+Shift+R (or Cmd+Shift+R on Mac)

# 3. Clear browser data
# DevTools → Application → Clear storage → Clear site data

# 4. Log in again
```

### Fix 2: Reset Database

```sql
-- Delete all sessions and start fresh
DELETE FROM active_sessions;

-- Verify functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name LIKE '%session%';

-- If functions missing, run the migration SQL again
```

### Fix 3: Check Environment

```bash
# Make sure you're deploying to the right project
supabase projects list

# Link to correct project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy again
supabase functions deploy rate-limited-login
```

---

## Using the Session Debugger

The SessionDebugger component on your Dashboard will show you:

### 1. Session ID (localStorage)
- ✅ **Shows a long string**: Good! Session ID is stored
- ❌ **"NOT FOUND"**: Edge Function isn't returning session_id

### 2. Database Sessions
- ✅ **Shows 1 session**: Perfect! Sessions are being created
- ❌ **Empty**: Edge Function isn't inserting into database
- ⚠️ **Shows multiple sessions**: `terminate_other_sessions` not working

### 3. Validation Test
- ✅ **"VALID ✓"**: Everything working correctly
- ❌ **"INVALID ✗"**: Session was terminated (expected after login elsewhere)
- ❌ **"Error"**: Function doesn't exist or permission issue

---

## Still Not Working?

### Share These Details:

1. **Session Debugger screenshot** (from Dashboard)

2. **Database query result**:
```sql
SELECT * FROM active_sessions ORDER BY created_at DESC LIMIT 5;
```

3. **Edge Function logs** (screenshot or copy/paste)

4. **Browser console errors** (screenshot or copy/paste)

5. **Network tab** (screenshot of rate-limited-login response)

With these details, I can tell you exactly what's wrong!

---

## Remove Debugger After Testing

Once everything works, remove the SessionDebugger:

```javascript
// In src/pages/Dashboard.jsx
// Remove this line:
import SessionDebugger from '../components/SessionDebugger';

// Remove this line:
<SessionDebugger />
```

---

## Expected Behavior After Fix

1. **Log in on Computer A** → Works normally
2. **Log in on Computer B** (same user) → Works normally
3. **Computer A** (wait 30 seconds) → Shows modal "Sesija pārtraukta"
4. **Computer A** → Redirects to login
5. **Computer B** → Still logged in and working

That's it! Single session enforcement working correctly.



