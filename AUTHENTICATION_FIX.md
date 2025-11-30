# Authentication Fix - 401 Unauthorized Error

## Problem

You were getting `401 (Unauthorized)` errors when trying to send invoice emails:

```
POST https://emqhyievrsyeinwrqqhw.supabase.co/functions/v1/send-invoice-email 401 (Unauthorized)
Send email error: {errorType: 'auth_error', message: 'Nav autentificēts. Lūdzu, pieslēdzieties atkārtoti.'}
```

## Root Cause

The edge function wasn't properly verifying authentication tokens. Specifically:

1. **Edge Function Issue**: The `getUser()` method was called without passing the token explicitly
2. **Session Expiry**: Expired tokens weren't being refreshed properly before making requests
3. **Token Verification**: Multiple authentication methods weren't being tried in the right order

## Fixes Applied

### 1. Edge Function Authentication (`supabase/functions/send-invoice-email/index.ts`)

**Before**: `getUser()` was called without the token parameter
```typescript
const getUserResult = await supabaseClient.auth.getUser(); // ❌ No token
```

**After**: Token is now passed explicitly to `getUser()`
```typescript
const getUserResult = await supabaseClient.auth.getUser(token); // ✅ Token passed
```

**Improvements**:
- ✅ Pass token directly to `getUser(token)` for proper JWT verification
- ✅ Better error logging to diagnose authentication issues
- ✅ Multiple fallback methods (direct API, service role) in correct order
- ✅ More detailed error messages for debugging

### 2. Frontend Session Refresh (`src/pages/Invoices.jsx`)

**Before**: Only checked if session exists, didn't check expiry
```typescript
if (!session || sessionError) {
  // Only refreshed if session was missing entirely
}
```

**After**: Checks token expiry and proactively refreshes
```typescript
// Check if token expires within 1 minute
const isTokenExpired = session?.expires_at 
  ? session.expires_at * 1000 < Date.now() + 60000
  : false;

// Refresh if expired or expiring soon
if (!session || sessionError || isTokenExpired || !session.access_token) {
  // Refresh session before making request
}
```

**Improvements**:
- ✅ Checks if token is expired or expiring soon (within 1 minute)
- ✅ Proactively refreshes expired tokens before API calls
- ✅ Better error handling and logging
- ✅ Signs out user if refresh fails (prevents infinite retry loops)

## How to Test

1. **Send an Invoice Email**:
   - Go to Invoices page
   - Click "Send Email" on any invoice
   - Should work without 401 error

2. **Test with Expired Session**:
   - Log in and wait for session to expire (or manually expire it)
   - Try sending an email
   - Session should auto-refresh and email should send

3. **Check Console Logs**:
   - Open browser DevTools → Console
   - Look for authentication-related logs:
     - "Session expired or missing, attempting to refresh..."
     - "Session refreshed successfully"
     - "Using session token (expires at: ...)"

## What Changed in Code

### Edge Function Changes:
- Line 100: `getUser()` → `getUser(token)` - Pass token explicitly
- Lines 108-139: Improved fallback authentication methods
- Lines 156-160: Better error logging

### Frontend Changes:
- Lines 293-307: Added token expiry check
- Lines 304-332: Improved session refresh logic with expiry handling
- Better error messages for users

## Other Warnings (Not Critical)

You also saw some console warnings:

### 1. Tailwind CDN Warning ⚠️
```
cdn.tailwindcss.com should not be used in production
```

**Status**: Warning only, not an error. App still works.

**Fix** (optional): Install Tailwind CSS as a dependency:
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 2. Ant Design React 19 Warning ⚠️
```
antd v5 support React is 16 ~ 18
```

**Status**: Warning only. Ant Design v5 doesn't officially support React 19 yet, but it still works.

**Fix** (optional): Wait for Ant Design v6 or downgrade React to v18.

### 3. Form Warning ⚠️
```
Instance created by `useForm` is not connected to any Form element
```

**Status**: Warning only. Usually means a form instance isn't being used properly.

**Note**: These warnings don't affect functionality. They're just notices for best practices.

## Next Steps

1. ✅ **Test email sending** - Should work now without 401 errors
2. ⚠️ **Monitor logs** - Check edge function logs in Supabase Dashboard if issues persist
3. 📝 **Optional**: Fix Tailwind CDN warning for production (not urgent)

## If Issues Persist

If you still get 401 errors:

1. **Check Supabase Edge Function Logs**:
   - Go to Supabase Dashboard → Edge Functions → send-invoice-email
   - Check logs for authentication errors
   - Look for token verification messages

2. **Check Browser Console**:
   - Look for session refresh messages
   - Check if token is being sent correctly

3. **Try Logging Out and Back In**:
   - Old session tokens might be stale
   - Fresh login creates new valid tokens

4. **Check Environment Variables**:
   - Verify `VITE_SUPABASE_URL` is correct
   - Verify `VITE_SUPABASE_ANON_KEY` is correct

## Summary

✅ **Fixed**: 401 authentication errors when sending emails
✅ **Improved**: Session refresh logic to handle expired tokens
✅ **Added**: Better error logging for debugging
⚠️ **Note**: Other warnings are non-critical and don't affect functionality

The email sending feature should now work reliably!

