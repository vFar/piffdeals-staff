# Login Rate Limiting Implementation

## Overview
Implemented rate limiting for login attempts that blocks users after 5 failed attempts for 15 minutes.

## Features
- ✅ Tracks failed login attempts per email address
- ✅ Blocks login after 5 failed attempts
- ✅ 15-minute cooldown period
- ✅ Real-time countdown timer showing remaining minutes
- ✅ Login button disabled when blocked
- ✅ Form inputs disabled when blocked
- ✅ Latvian error messages
- ✅ Auto-clears attempts on successful login
- ✅ Auto-resets after 15 minutes

## Database Changes

### New Table: `login_attempts`
Tracks failed login attempts with:
- `email` - Email address (lowercase)
- `attempt_count` - Number of failed attempts
- `last_attempt_at` - Timestamp of last attempt
- `blocked_until` - Timestamp when block expires

### New Functions:
1. **`is_email_blocked(check_email)`** - Checks if email is currently blocked
2. **`get_blocked_until(check_email)`** - Returns when block expires
3. **`record_failed_login(check_email)`** - Records a failed attempt and returns status
4. **`clear_login_attempts(check_email)`** - Clears attempts on successful login

## Frontend Changes

### Updated: `src/pages/Login.jsx`
- Added state management for blocked status
- Checks block status before allowing login
- Records failed attempts automatically
- Shows Latvian error message: "Bloķēts, mēģiniet vēlāk pēc X minūtēm!"
- Disables form inputs and button when blocked
- Real-time countdown timer
- Auto-unblocks after 15 minutes

## Deployment Steps

### 1. Run SQL Migration
Execute `add-login-rate-limiting.sql` in Supabase SQL Editor:
- Go to Supabase Dashboard → SQL Editor
- Copy and paste the contents of `add-login-rate-limiting.sql`
- Click "Run"

### 2. Deploy Frontend Changes
The frontend changes are already in `src/pages/Login.jsx`. To deploy:

```bash
# Commit changes
git add .
git commit -m "Add login rate limiting - block after 5 attempts for 15 minutes"
git push origin main
```

Vercel will automatically:
- Build the project (`npm run build`)
- Deploy to production

## Testing

1. **Test Failed Attempts:**
   - Try logging in with wrong password 5 times
   - Should see error message after 5th attempt
   - Login button should be disabled
   - Form inputs should be disabled

2. **Test Block Message:**
   - Should see: "Bloķēts, mēģiniet vēlāk pēc X minūtēm!"
   - Countdown should update every second

3. **Test Auto-Unblock:**
   - Wait 15 minutes (or manually update database)
   - Form should become enabled again

4. **Test Successful Login:**
   - After successful login, attempts should be cleared
   - Block status should reset

## Error Messages (Latvian)

- **Blocked:** "Bloķēts, mēģiniet vēlāk pēc X minūtēm!"
- **Invalid credentials:** "Nepareizs e-pasts vai parole!" (existing)

## Notes

- Rate limiting is per email address
- Counter resets after 15 minutes of inactivity
- Successful login clears all attempts immediately
- Works with anonymous users (no authentication required to track attempts)

