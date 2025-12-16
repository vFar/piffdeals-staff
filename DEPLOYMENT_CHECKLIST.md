# 🚀 Single Session Authentication - Deployment Checklist

## Pre-Deployment Verification

### Code Review
- [x] Database migration SQL file created
- [x] Edge Functions updated/created
- [x] Frontend components created/modified
- [x] No linter errors in code
- [x] Documentation completed

### Files Created
- [x] `supabase/migrations/create_active_sessions_table.sql`
- [x] `supabase/functions/cleanup-expired-sessions/index.ts`
- [x] `src/components/SessionTerminatedNotifier.jsx`
- [x] `SINGLE_SESSION_IMPLEMENTATION.md`
- [x] `SETUP_SINGLE_SESSION.md`
- [x] `SINGLE_SESSION_SUMMARY.md`
- [x] `SINGLE_SESSION_FLOW.md`
- [x] `README_SINGLE_SESSION.md`
- [x] `DEPLOYMENT_CHECKLIST.md` (this file)

### Files Modified
- [x] `supabase/functions/rate-limited-login/index.ts`
- [x] `src/contexts/AuthContext.jsx`
- [x] `src/App.jsx`

---

## Deployment Steps

### Step 1: Database Migration ⏳

**Action**: Apply the database migration

**How**:
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Click "New Query"
4. Copy contents of `supabase/migrations/create_active_sessions_table.sql`
5. Paste and click "Run"

**Verification**:
```sql
-- Check table exists
SELECT * FROM active_sessions LIMIT 1;

-- Check functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'terminate_other_sessions',
    'cleanup_expired_sessions',
    'is_session_valid',
    'update_session_activity'
  );
```

**Expected Result**: Table exists, 4 functions returned

**Status**: [ ] Complete

---

### Step 2: Deploy Edge Functions ⏳

**Action**: Deploy updated Edge Functions

**How**:
```bash
# Navigate to project root
cd /path/to/piffdeals-staff

# Deploy rate-limited-login (updated)
supabase functions deploy rate-limited-login

# Deploy cleanup-expired-sessions (new)
supabase functions deploy cleanup-expired-sessions
```

**Verification**:
- Check Supabase Dashboard → Edge Functions
- Both functions should be listed
- Check function logs for any errors

**Status**: [ ] Complete

---

### Step 3: Frontend Deployment ⏳

**Action**: Deploy frontend changes

**How**:
```bash
# Build the frontend
npm run build

# Deploy to your hosting (Vercel/Netlify/etc)
# This depends on your deployment setup
```

**Verification**:
- Visit the deployed app
- Check browser console for errors
- Verify SessionTerminatedNotifier is loaded

**Status**: [ ] Complete

---

### Step 4: Testing ⏳

#### Test 1: Concurrent Login
**Steps**:
1. Open app in Browser 1 (e.g., Chrome)
2. Log in with test user
3. Open app in Browser 2 (e.g., Firefox or Incognito)
4. Log in with same test user
5. Wait 30 seconds on Browser 1
6. Observe Browser 1

**Expected Result**: 
- Browser 1 shows "Sesija pārtraukta" modal
- Modal explains user logged in from another device
- Clicking "Pieslēgties" redirects to login

**Status**: [ ] Pass / [ ] Fail

---

#### Test 2: Normal Logout
**Steps**:
1. Log in on any browser
2. Click logout button
3. Observe behavior

**Expected Result**:
- Redirects to login page
- No "Session Terminated" modal shown
- No errors in console

**Status**: [ ] Pass / [ ] Fail

---

#### Test 3: Session Validation
**Steps**:
1. Log in on Browser 1
2. Note the session_id in localStorage
3. In Supabase SQL Editor, run:
   ```sql
   DELETE FROM active_sessions WHERE session_id = 'YOUR_SESSION_ID';
   ```
4. Wait 30 seconds on Browser 1
5. Observe behavior

**Expected Result**:
- Browser 1 detects invalid session
- Shows "Session Terminated" modal
- Redirects to login

**Status**: [ ] Pass / [ ] Fail

---

#### Test 4: Session Timeout (Existing Feature)
**Steps**:
1. Log in
2. Wait 15 minutes without activity
3. Observe behavior

**Expected Result**:
- Shows "Sesija beigusies" modal (different from termination)
- Redirects to login
- Session timeout feature still works

**Status**: [ ] Pass / [ ] Fail

---

#### Test 5: Database Functions
**Steps**:
Run these queries in SQL Editor:

```sql
-- Test 1: Create test session
INSERT INTO active_sessions (user_id, session_id, access_token, refresh_token, expires_at)
VALUES (
  'TEST_USER_ID'::uuid,
  'test_session_1',
  'test_token',
  'test_refresh',
  now() + interval '1 hour'
);

-- Test 2: Validate session
SELECT is_session_valid('TEST_USER_ID'::uuid, 'test_session_1');
-- Expected: true

-- Test 3: Create second session and terminate first
INSERT INTO active_sessions (user_id, session_id, access_token, refresh_token, expires_at)
VALUES (
  'TEST_USER_ID'::uuid,
  'test_session_2',
  'test_token',
  'test_refresh',
  now() + interval '1 hour'
);

SELECT terminate_other_sessions('TEST_USER_ID'::uuid, 'test_session_2');

-- Test 4: Verify first session is gone
SELECT is_session_valid('TEST_USER_ID'::uuid, 'test_session_1');
-- Expected: false

-- Test 5: Cleanup test data
DELETE FROM active_sessions WHERE user_id = 'TEST_USER_ID'::uuid;
```

**Expected Result**: All queries execute without errors

**Status**: [ ] Pass / [ ] Fail

---

### Step 5: Monitoring ⏳

**Action**: Monitor for issues

**What to Check**:
- [ ] Supabase Edge Function logs (no errors)
- [ ] Browser console (no JavaScript errors)
- [ ] User feedback (no complaints about unexpected logouts)
- [ ] Database (sessions being created/terminated correctly)

**Monitoring Queries**:
```sql
-- View all active sessions
SELECT 
  user_id,
  session_id,
  created_at,
  expires_at,
  ip_address
FROM active_sessions
ORDER BY created_at DESC;

-- Count sessions per user (should all be 1)
SELECT 
  user_id,
  COUNT(*) as session_count
FROM active_sessions
GROUP BY user_id;

-- Check for expired sessions
SELECT COUNT(*) FROM active_sessions WHERE expires_at < now();
```

**Status**: [ ] Complete

---

### Step 6: Cron Job Setup (Optional) ⏳

**Action**: Set up automatic cleanup of expired sessions

**Options**:

**Option A: External Cron Service**
- Service: cron-job.org, EasyCron, etc.
- Frequency: Hourly
- URL: `https://YOUR_PROJECT.supabase.co/functions/v1/cleanup-expired-sessions`
- Method: POST
- Header: `Authorization: Bearer YOUR_ANON_KEY`

**Option B: Supabase Cron (if available)**
```sql
SELECT cron.schedule(
  'cleanup-expired-sessions',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/cleanup-expired-sessions',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

**Option C: Manual (Development)**
- Run manually when needed:
  ```sql
  SELECT cleanup_expired_sessions();
  ```

**Status**: [ ] Complete / [ ] Skipped

---

## Post-Deployment Verification

### Functional Tests
- [ ] Users can log in successfully
- [ ] Concurrent login terminates old session
- [ ] Normal logout works correctly
- [ ] Session timeout still works (15 min)
- [ ] No unexpected logouts
- [ ] Modal messages are correct (in Latvian)

### Technical Tests
- [ ] No errors in Supabase logs
- [ ] No errors in browser console
- [ ] Database functions work correctly
- [ ] Sessions are being tracked in database
- [ ] Expired sessions are cleaned up (if cron enabled)

### Performance Tests
- [ ] Login speed is acceptable
- [ ] No noticeable lag from session validation
- [ ] Database queries are fast
- [ ] No memory leaks from validation interval

### Security Tests
- [ ] Only one session per user at a time
- [ ] Old sessions are terminated immediately
- [ ] Session validation detects invalid sessions
- [ ] RLS policies protect session data
- [ ] Tokens are stored securely

---

## Rollback Plan (If Needed)

### If Critical Issues Found

**Step 1: Disable Session Validation**
```javascript
// In src/contexts/AuthContext.jsx
// Comment out the periodic validation useEffect
/*
useEffect(() => {
  if (!currentUser) return;
  const intervalId = setInterval(async () => {
    // ... validation code
  }, 30000);
  return () => clearInterval(intervalId);
}, [currentUser, validateSession]);
*/
```

**Step 2: Change SignOut Scope**
```javascript
// In src/contexts/AuthContext.jsx
// Change from 'global' back to 'local'
await supabase.auth.signOut({ scope: 'local' });
```

**Step 3: Redeploy Frontend**
```bash
npm run build
# Deploy to hosting
```

**Step 4: Revert Edge Function (if needed)**
- Restore previous version of rate-limited-login
- Redeploy: `supabase functions deploy rate-limited-login`

**Step 5: Drop Table (optional)**
```sql
DROP TABLE IF EXISTS active_sessions CASCADE;
```

---

## Success Criteria

### Must Have (Critical)
- [x] Code implemented without errors
- [ ] Database migration applied successfully
- [ ] Edge Functions deployed successfully
- [ ] Frontend deployed successfully
- [ ] Concurrent login terminates old session
- [ ] Normal logout works correctly
- [ ] No errors in logs

### Should Have (Important)
- [ ] Session validation runs every 30 seconds
- [ ] Modal messages are user-friendly
- [ ] Session timeout still works
- [ ] Performance is acceptable
- [ ] Cron job set up for cleanup

### Nice to Have (Optional)
- [ ] Activity logs show login events
- [ ] Session management UI (future)
- [ ] Email notifications (future)
- [ ] Device fingerprinting (future)

---

## Known Limitations

1. **Validation Delay**: Up to 30 seconds before terminated session is detected
   - **Mitigation**: Can reduce interval if needed (trade-off with server load)

2. **Token Refresh Window**: Brief window where old session might refresh token
   - **Mitigation**: Validation on TOKEN_REFRESHED event prevents this

3. **Network Issues**: If validation fails due to network, user might be logged out
   - **Mitigation**: Validation function handles errors gracefully

4. **Database Load**: Validation queries run every 30 seconds per active user
   - **Mitigation**: Queries are indexed and very fast

---

## Communication Plan

### Internal Team
- [ ] Notify team of deployment
- [ ] Share documentation links
- [ ] Explain new behavior
- [ ] Provide support contact

### Users (if needed)
- [ ] Prepare announcement (optional)
- [ ] Explain single-session policy
- [ ] Provide support for questions
- [ ] Monitor feedback

### Sample Announcement (if needed):
```
Uzlabojumi drošībā

Mēs esam ieviesuši papildu drošības pasākumu: 
katrs lietotājs var būt pieteicies tikai vienā ierīcē vienlaicīgi.

Ja pieteicaties no jaunas ierīces, iepriekšējā sesija tiks automātiski 
pārtraukta. Jūs saņemsiet paziņojumu un varēsiet pieteikties no jauna.

Šis pasākums palīdz aizsargāt jūsu kontu un nodrošināt datu drošību.
```

---

## Support & Resources

### Documentation
- [README_SINGLE_SESSION.md](README_SINGLE_SESSION.md) - Quick reference
- [SETUP_SINGLE_SESSION.md](SETUP_SINGLE_SESSION.md) - Setup guide
- [SINGLE_SESSION_IMPLEMENTATION.md](SINGLE_SESSION_IMPLEMENTATION.md) - Technical details
- [SINGLE_SESSION_FLOW.md](SINGLE_SESSION_FLOW.md) - Flow diagrams
- [SINGLE_SESSION_SUMMARY.md](SINGLE_SESSION_SUMMARY.md) - Overview

### Useful Commands
```bash
# View Supabase logs
supabase functions logs rate-limited-login

# Test Edge Function locally
supabase functions serve rate-limited-login

# Check database
supabase db diff
```

### Useful SQL Queries
```sql
-- View active sessions
SELECT * FROM active_sessions ORDER BY created_at DESC;

-- Count sessions per user
SELECT user_id, COUNT(*) FROM active_sessions GROUP BY user_id;

-- Clean up expired sessions
SELECT cleanup_expired_sessions();

-- Manually terminate all sessions for a user
DELETE FROM active_sessions WHERE user_id = 'USER_ID'::uuid;
```

---

## Sign-Off

### Completed By
- **Developer**: AI Assistant
- **Date**: December 16, 2025
- **Version**: 1.0.0

### Deployment Sign-Off
- [ ] Code Review Approved
- [ ] Testing Completed
- [ ] Documentation Reviewed
- [ ] Deployment Successful
- [ ] Post-Deployment Verification Complete

### Approvals
- [ ] Technical Lead: _________________ Date: _______
- [ ] Product Owner: _________________ Date: _______
- [ ] DevOps: _______________________ Date: _______

---

**Status**: ✅ Implementation Complete - Ready for Deployment
**Next Action**: Apply database migration and deploy Edge Functions

