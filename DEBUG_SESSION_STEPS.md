# Debug Steps: Why Single Session Isn't Working

## What You've Done ✅
- [x] Created database table `active_sessions`
- [x] Deployed Edge Functions

## What to Check Now

### Step 1: Verify Database Setup

Run this in **Supabase Dashboard → SQL Editor**:

```sql
-- Check if table exists
SELECT * FROM active_sessions LIMIT 5;

-- Check if functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%session%';
```

**Expected Result**: 
- Table exists (may be empty)
- Should see 4 functions

---

### Step 2: Test Login and Check Sessions

1. **Log in on Computer A**
2. **Immediately check database**:

```sql
SELECT 
  user_id,
  session_id,
  created_at,
  expires_at
FROM active_sessions
ORDER BY created_at DESC
LIMIT 5;
```

**Expected Result**: You should see 1 row with your user_id

**If NO rows appear**: The Edge Function isn't creating sessions (see Step 3)

---

### Step 3: Check Edge Function Logs

Go to **Supabase Dashboard → Edge Functions → rate-limited-login → Logs**

Look for:
- ✅ "Login successful" messages
- ❌ Any errors about `active_sessions` table
- ❌ Any errors about `terminate_other_sessions` function

**Common Issues**:
- Function not deployed properly
- Database permissions issue
- Function code not updated

---

### Step 4: Check Frontend Session ID

1. Log in on Computer A
2. Open **DevTools → Console**
3. Type: `localStorage.getItem('session_id')`

**Expected Result**: Should return a session ID like `"abc-123_1234567890_xyz"`

**If NULL**: Frontend code isn't storing session_id (see Step 5)

---

### Step 5: Verify Frontend Code is Running

Open **DevTools → Console** and check for:

1. Any errors related to `validateSession`
2. Any errors related to `is_session_valid`

Also check **DevTools → Network** tab:
- Look for calls to `is_session_valid` (should happen every 30 seconds)

---

### Step 6: Manual Test

Let's manually test the flow:

#### 6.1 Create a Test Session in Database

```sql
-- Replace USER_ID with your actual user ID
INSERT INTO active_sessions (
  user_id,
  session_id,
  access_token,
  refresh_token,
  expires_at,
  ip_address
) VALUES (
  'YOUR_USER_ID_HERE'::uuid,
  'test_session_123',
  'test_token',
  'test_refresh',
  now() + interval '1 hour',
  '127.0.0.1'
);

-- Verify it was created
SELECT * FROM active_sessions WHERE session_id = 'test_session_123';
```

#### 6.2 Test the Validation Function

```sql
-- This should return TRUE
SELECT is_session_valid('YOUR_USER_ID_HERE'::uuid, 'test_session_123');

-- This should return FALSE (session doesn't exist)
SELECT is_session_valid('YOUR_USER_ID_HERE'::uuid, 'fake_session_999');
```

#### 6.3 Test the Termination Function

```sql
-- Create a second session
INSERT INTO active_sessions (
  user_id,
  session_id,
  access_token,
  refresh_token,
  expires_at
) VALUES (
  'YOUR_USER_ID_HERE'::uuid,
  'test_session_456',
  'test_token',
  'test_refresh',
  now() + interval '1 hour'
);

-- Terminate all except test_session_456
SELECT terminate_other_sessions('YOUR_USER_ID_HERE'::uuid, 'test_session_456');

-- Check: should only see test_session_456
SELECT * FROM active_sessions WHERE user_id = 'YOUR_USER_ID_HERE'::uuid;

-- Clean up
DELETE FROM active_sessions WHERE user_id = 'YOUR_USER_ID_HERE'::uuid;
```

---

## Most Likely Issues

### Issue 1: Edge Function Not Updated
**Symptom**: No sessions appear in database after login

**Solution**: Redeploy the function
```bash
supabase functions deploy rate-limited-login
```

Or check if you deployed to the correct project.

---

### Issue 2: Frontend Not Refreshed
**Symptom**: `localStorage.getItem('session_id')` returns null

**Solution**: 
- Hard refresh browser (Ctrl+Shift+R)
- Clear browser cache
- Check if dev server is running with latest code

---

### Issue 3: Session Created But Not Validated
**Symptom**: Session exists in DB, but Computer A doesn't get logged out

**Check**:
1. Is the validation interval running? (Check console for errors)
2. Is `session_id` stored in localStorage on Computer A?
3. Are there any CORS or network errors?

**Debug in Console**:
```javascript
// Check if session_id exists
console.log('Session ID:', localStorage.getItem('session_id'));

// Manually test validation (if you have access to supabase client)
// This would be in your code, not console
```

---

### Issue 4: Timing Issue
**Symptom**: Takes longer than 30 seconds to detect

**Explanation**: The validation runs every 30 seconds, so it could take up to 30 seconds to detect the terminated session.

**Test**: Wait a full 60 seconds on Computer A after logging in on Computer B

---

## Quick Diagnostic Script

Run this in **Supabase SQL Editor** to get a complete diagnostic:

```sql
-- DIAGNOSTIC REPORT
SELECT '=== TABLE CHECK ===' as section;
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'active_sessions'
) as table_exists;

SELECT '=== FUNCTION CHECK ===' as section;
SELECT COUNT(*) as function_count FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'terminate_other_sessions',
    'is_session_valid',
    'cleanup_expired_sessions',
    'update_session_activity'
  );
-- Should return 4

SELECT '=== ACTIVE SESSIONS ===' as section;
SELECT COUNT(*) as total_sessions FROM active_sessions;

SELECT '=== SESSIONS PER USER ===' as section;
SELECT 
  user_id,
  COUNT(*) as session_count,
  MAX(created_at) as latest_session
FROM active_sessions
GROUP BY user_id;

SELECT '=== RECENT SESSIONS ===' as section;
SELECT 
  user_id,
  session_id,
  created_at,
  expires_at,
  CASE 
    WHEN expires_at > now() THEN 'VALID'
    ELSE 'EXPIRED'
  END as status
FROM active_sessions
ORDER BY created_at DESC
LIMIT 10;
```

---

## What Should Happen (Complete Flow)

### Computer A Login:
1. ✅ User logs in
2. ✅ Edge Function creates session in DB
3. ✅ Frontend stores `session_id` in localStorage
4. ✅ Validation starts running every 30 seconds

### Computer B Login (Same User):
1. ✅ User logs in
2. ✅ Edge Function calls `terminate_other_sessions()`
3. ✅ Computer A's session deleted from DB
4. ✅ Edge Function creates new session for Computer B

### Computer A Detection (within 30 seconds):
1. ✅ Validation runs: `is_session_valid(user_id, session_id)`
2. ✅ Returns FALSE (session not found)
3. ✅ Frontend signs out locally
4. ✅ Shows "Sesija pārtraukta" modal
5. ✅ Redirects to login

---

## Next Steps

1. Run the diagnostic SQL above
2. Share the results
3. Check Edge Function logs
4. Check browser console for errors
5. Verify `session_id` is in localStorage after login

Let me know what you find!



