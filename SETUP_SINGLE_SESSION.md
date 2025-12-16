# Quick Setup Guide: Single Session Authentication

## Prerequisites
- Supabase project with admin access
- Supabase CLI installed (optional, for migrations)

## Step-by-Step Setup

### Step 1: Apply Database Migration

**Option A: Using Supabase Dashboard (Recommended)**
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the contents of `supabase/migrations/create_active_sessions_table.sql`
5. Paste into the SQL editor
6. Click **Run** to execute

**Option B: Using Supabase CLI**
```bash
# From project root
supabase db push
```

### Step 2: Deploy Edge Functions

Deploy the updated `rate-limited-login` function:

```bash
# Deploy rate-limited-login with session management
supabase functions deploy rate-limited-login

# Deploy cleanup function (optional but recommended)
supabase functions deploy cleanup-expired-sessions
```

### Step 3: Verify Database Setup

Run this query in SQL Editor to verify the table was created:

```sql
SELECT * FROM public.active_sessions LIMIT 1;
```

Verify functions exist:

```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'terminate_other_sessions',
    'cleanup_expired_sessions',
    'is_session_valid',
    'update_session_activity'
  );
```

You should see all 4 functions listed.

### Step 4: Test the Implementation

1. **Test Concurrent Login**:
   - Open your app in Browser 1
   - Log in with a test user
   - Open the app in Browser 2 (or incognito mode)
   - Log in with the same test user
   - Wait 30 seconds on Browser 1
   - Browser 1 should show "Session Terminated" modal

2. **Test Normal Logout**:
   - Log in on any browser
   - Click the logout button
   - Should redirect to login without showing termination modal
   - No errors in console

3. **Check Activity Logs** (if enabled):
   - Go to Activity Logs page
   - Verify login events are being recorded
   - Check for any errors

### Step 5: Set Up Cleanup Cron Job (Optional)

To automatically clean up expired sessions, set up a cron job:

**Option A: Using Supabase Cron (if available)**
```sql
-- Run cleanup every hour
SELECT cron.schedule(
  'cleanup-expired-sessions',
  '0 * * * *',  -- Every hour
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/cleanup-expired-sessions',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

**Option B: Using External Cron Service**
- Use services like cron-job.org, EasyCron, or your own server
- Set up hourly HTTP POST to:
  ```
  https://YOUR_PROJECT.supabase.co/functions/v1/cleanup-expired-sessions
  ```
- Add header: `Authorization: Bearer YOUR_ANON_KEY`

**Option C: Manual Cleanup (Development)**
```sql
-- Run manually in SQL Editor when needed
SELECT cleanup_expired_sessions();
```

## Configuration Options

### Adjust Session Validation Interval

**File**: `src/contexts/AuthContext.jsx`

Find this code (around line 115):
```javascript
const intervalId = setInterval(async () => {
  // Validate session
}, 30000); // 30 seconds
```

Change `30000` to adjust the interval:
- `15000` = 15 seconds (more responsive, more server load)
- `60000` = 60 seconds (less responsive, less server load)

### Adjust Session Expiration Time

**File**: `supabase/functions/rate-limited-login/index.ts`

Find this code (around line 175):
```javascript
const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
```

Change the calculation:
- `30 * 60 * 1000` = 30 minutes
- `2 * 60 * 60 * 1000` = 2 hours
- `24 * 60 * 60 * 1000` = 24 hours

**Important**: Should match your JWT token expiration time!

## Verification Checklist

- [ ] Database table `active_sessions` created successfully
- [ ] All 4 database functions exist and have correct permissions
- [ ] Edge function `rate-limited-login` deployed with session management
- [ ] Edge function `cleanup-expired-sessions` deployed (optional)
- [ ] Frontend code updated (AuthContext, App.jsx)
- [ ] SessionTerminatedNotifier component created
- [ ] Test: Concurrent login terminates old session
- [ ] Test: Normal logout works without errors
- [ ] Test: Session validation runs every 30 seconds
- [ ] Cron job set up for cleanup (optional)

## Troubleshooting

### "Function is_session_valid does not exist"
**Solution**: Run the migration SQL again, ensure all functions are created.

### Sessions not being terminated
**Solution**: 
1. Check Edge Function logs in Supabase Dashboard
2. Verify `terminate_other_sessions` function has correct permissions
3. Test function manually:
   ```sql
   SELECT terminate_other_sessions(
     'USER_ID_HERE'::uuid,
     'CURRENT_SESSION_ID_HERE'
   );
   ```

### Users getting logged out immediately after login
**Solution**:
1. Check that `session_id` is being stored in localStorage
2. Verify session expiration time is reasonable (at least 1 hour)
3. Check browser console for JavaScript errors

### "Session Terminated" modal not showing
**Solution**:
1. Verify SessionTerminatedNotifier is imported in App.jsx
2. Check that session validation is running (console.log in validateSession)
3. Ensure localStorage has `session_id` before termination

## Testing Commands

### Check active sessions for a user
```sql
SELECT * FROM active_sessions 
WHERE user_id = 'USER_ID_HERE'::uuid;
```

### Manually terminate all sessions for a user
```sql
DELETE FROM active_sessions 
WHERE user_id = 'USER_ID_HERE'::uuid;
```

### Check expired sessions
```sql
SELECT * FROM active_sessions 
WHERE expires_at < now();
```

### Clean up expired sessions manually
```sql
SELECT cleanup_expired_sessions();
```

## Rollback

If you need to disable this feature:

1. **Revert AuthContext changes**:
   - Remove session validation code
   - Change signOut back to `scope: 'local'`

2. **Remove SessionTerminatedNotifier** from App.jsx

3. **Redeploy old rate-limited-login** (without session management)

4. **Drop table** (optional):
   ```sql
   DROP TABLE IF EXISTS active_sessions CASCADE;
   ```

## Next Steps

After successful setup:
1. Monitor user feedback for any issues
2. Check activity logs for login patterns
3. Consider adding session management UI
4. Review security logs regularly

## Support

For detailed information, see: `SINGLE_SESSION_IMPLEMENTATION.md`

For project overview, see: `PROJECT_OVERVIEW.md`

