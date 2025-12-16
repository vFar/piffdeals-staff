# Single Session Authentication Implementation

## Overview

This document describes the implementation of single-session-only authentication for the Piffdeals Staff application. When a user logs in from a new device or browser, all previous sessions for that user are automatically terminated.

## Security Benefits

- **Prevents concurrent access**: Only one active session per user account
- **Reduces credential sharing**: Users cannot share accounts across multiple devices simultaneously
- **Immediate session termination**: Old sessions are terminated instantly when new login occurs
- **Session validation**: Periodic checks ensure sessions remain valid

## Implementation Components

### 1. Database Schema (`supabase/migrations/create_active_sessions_table.sql`)

#### Table: `active_sessions`
Tracks all active user sessions with the following columns:
- `id` - Unique session record identifier
- `user_id` - References the authenticated user
- `session_id` - Unique session identifier (generated on login)
- `access_token` - JWT access token
- `refresh_token` - JWT refresh token
- `created_at` - Session creation timestamp
- `expires_at` - Session expiration timestamp
- `ip_address` - Client IP address
- `user_agent` - Browser/device information
- `last_activity` - Last activity timestamp

#### Database Functions

**`terminate_other_sessions(p_user_id, p_current_session_id)`**
- Deletes all sessions for a user except the current one
- Called automatically during login

**`cleanup_expired_sessions()`**
- Removes expired session records
- Should be called periodically via cron job

**`is_session_valid(p_user_id, p_session_id)`**
- Checks if a session is still active and not expired
- Used for session validation

**`update_session_activity(p_session_id)`**
- Updates the last_activity timestamp
- Can be used for activity tracking

### 2. Backend: Rate-Limited Login Edge Function

**File**: `supabase/functions/rate-limited-login/index.ts`

**Changes Made**:
1. Generates unique `session_id` for each login
2. Calls `terminate_other_sessions()` to remove old sessions
3. Inserts new session record into `active_sessions` table
4. Returns `session_id` in response for client-side tracking

**Flow**:
```
User Login Request
  ↓
Authenticate with Supabase
  ↓
Generate unique session_id
  ↓
Terminate all other sessions for this user
  ↓
Store new session in active_sessions table
  ↓
Return session data with session_id
```

### 3. Frontend: AuthContext

**File**: `src/contexts/AuthContext.jsx`

**New Features**:

#### Session ID Tracking
- Stores `session_id` in localStorage and state
- Used to validate session on each check

#### Session Validation
- `validateSession(userId)` - Checks if current session is still active
- Called on:
  - Initial app load
  - Token refresh events
  - Periodic intervals (every 30 seconds)

#### Automatic Sign-Out
When session is invalid (terminated elsewhere):
- Signs out locally
- Clears user state
- Removes session_id from localStorage
- User sees notification modal

#### Global Sign-Out
- Changed from `scope: 'local'` to `scope: 'global'`
- Ensures sign-out terminates all sessions

### 4. Frontend: Session Terminated Notifier

**File**: `src/components/SessionTerminatedNotifier.jsx`

**Purpose**: Shows a modal notification when user's session is terminated

**Features**:
- Detects when user was logged in but is now logged out
- Distinguishes between normal logout and forced termination
- Shows user-friendly message in Latvian
- Redirects to login page

**Message**:
```
"Jūsu sesija tika pārtraukta, jo pieteicāties no citas ierīces vai pārlūkprogrammas.
Sistēmā var būt aktīva tikai viena sesija vienlaicīgi."
```

### 5. Cleanup Edge Function

**File**: `supabase/functions/cleanup-expired-sessions/index.ts`

**Purpose**: Periodically removes expired session records

**Usage**: Should be called via cron job (e.g., every hour)

## User Experience Flow

### Scenario 1: User Logs In on Second Device

1. **User A** is logged in on Computer 1
2. **User A** logs in on Computer 2
3. **System** generates new session for Computer 2
4. **System** terminates session on Computer 1
5. **Computer 1** detects invalid session (within 30 seconds)
6. **Computer 1** shows "Session Terminated" modal
7. **User A** must log in again on Computer 1

### Scenario 2: Normal Logout

1. **User** clicks logout button
2. **System** signs out globally (all sessions terminated)
3. **System** clears local storage
4. **User** redirected to login page
5. No "Session Terminated" modal shown

### Scenario 3: Session Timeout

1. **User** is inactive for 15 minutes
2. **System** shows "Session Expired" modal (SessionTimeoutNotifier)
3. **User** must log in again
4. Different from session termination (different modal)

## Configuration

### Session Validation Interval
**Location**: `src/contexts/AuthContext.jsx`
```javascript
const intervalId = setInterval(async () => {
  // Validate session
}, 30000); // 30 seconds
```

**Recommendation**: 30 seconds provides good balance between:
- Quick detection of terminated sessions
- Minimal server load

### Session Expiration
**Location**: `supabase/functions/rate-limited-login/index.ts`
```javascript
const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
```

**Note**: Should match JWT token expiration time

## Database Migration

To apply the database changes:

```bash
# Using Supabase CLI
supabase db push

# Or run the SQL file directly in Supabase Dashboard
# SQL Editor → New Query → Paste contents of create_active_sessions_table.sql
```

## Cron Job Setup (Optional but Recommended)

Set up a cron job to clean up expired sessions:

**Using Supabase Edge Functions + Cron**:
1. Deploy the `cleanup-expired-sessions` function
2. Set up a cron job in Supabase Dashboard or external service
3. Call the function hourly:
```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/cleanup-expired-sessions \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Testing

### Test Case 1: Concurrent Login
1. Open browser 1, log in as user1
2. Open browser 2 (or incognito), log in as user1
3. Wait 30 seconds on browser 1
4. Browser 1 should show "Session Terminated" modal

### Test Case 2: Normal Logout
1. Log in on any browser
2. Click logout button
3. Should redirect to login without showing termination modal

### Test Case 3: Session Validation
1. Log in on browser 1
2. Manually delete session from database
3. Wait 30 seconds on browser 1
4. Should detect invalid session and show modal

## Security Considerations

### Strengths
✅ Only one active session per user
✅ Immediate termination of old sessions
✅ Periodic validation prevents stale sessions
✅ Session data stored securely in database
✅ RLS policies protect session data

### Potential Improvements
- Add session management UI (view/terminate specific sessions)
- Add email notifications when new login occurs
- Add device fingerprinting for better tracking
- Add "Remember this device" option
- Add session activity logs

## Troubleshooting

### Issue: Users keep getting logged out
**Possible Causes**:
- Session validation interval too aggressive
- Database function errors
- Token expiration mismatch

**Solution**:
- Check browser console for errors
- Verify `is_session_valid` function works correctly
- Ensure session expiration matches JWT expiration

### Issue: Old sessions not terminated
**Possible Causes**:
- `terminate_other_sessions` function not called
- Database permissions issue
- Edge function error

**Solution**:
- Check Edge Function logs
- Verify database function permissions
- Test function manually in SQL editor

### Issue: Session validation fails
**Possible Causes**:
- `session_id` not stored in localStorage
- Database connection issues
- RLS policy blocking access

**Solution**:
- Check localStorage for `session_id`
- Verify database function has correct permissions
- Check Supabase logs for errors

## Files Modified/Created

### Created
- `supabase/migrations/create_active_sessions_table.sql`
- `supabase/functions/cleanup-expired-sessions/index.ts`
- `src/components/SessionTerminatedNotifier.jsx`
- `SINGLE_SESSION_IMPLEMENTATION.md` (this file)

### Modified
- `supabase/functions/rate-limited-login/index.ts`
- `src/contexts/AuthContext.jsx`
- `src/App.jsx`

## Rollback Instructions

If you need to revert this feature:

1. **Remove session validation from AuthContext**:
   - Remove `validateSession` function
   - Remove periodic validation useEffect
   - Remove session validation from auth state listener

2. **Revert signOut scope**:
   ```javascript
   await supabase.auth.signOut({ scope: 'local' });
   ```

3. **Remove session tracking from login**:
   - Remove session_id storage in signIn function
   - Remove session management code from rate-limited-login

4. **Remove components**:
   - Remove SessionTerminatedNotifier from App.jsx
   - Delete SessionTerminatedNotifier.jsx file

5. **Drop database table** (optional):
   ```sql
   DROP TABLE IF EXISTS public.active_sessions CASCADE;
   ```

## Future Enhancements

1. **Session Management UI**
   - Show list of active sessions
   - Allow users to terminate specific sessions
   - Display device/location information

2. **Enhanced Security**
   - Email notifications on new login
   - Suspicious activity detection
   - Device fingerprinting

3. **Flexible Session Policies**
   - Allow multiple sessions for certain roles
   - Configurable session limits per user
   - "Trusted device" feature

4. **Analytics**
   - Track concurrent login attempts
   - Monitor session patterns
   - Generate security reports

## Support

For questions or issues with this implementation, please refer to:
- Supabase Auth documentation: https://supabase.com/docs/guides/auth
- Project overview: `PROJECT_OVERVIEW.md`
- Activity logs: Check `activity_logs` table for login events

