# 🔐 Single Session Authentication

## Quick Overview

Your Piffdeals Staff application now enforces **single-session-only authentication**. This means:

- ✅ Only **one active session** per user at any time
- ✅ Logging in from a new device **automatically terminates** previous sessions
- ✅ Users are **notified** when their session is terminated
- ✅ Enhanced security with **periodic session validation**

---

## 📚 Documentation

| Document | Purpose | Audience |
|----------|---------|----------|
| **[SINGLE_SESSION_SUMMARY.md](SINGLE_SESSION_SUMMARY.md)** | High-level overview of changes | Everyone |
| **[SETUP_SINGLE_SESSION.md](SETUP_SINGLE_SESSION.md)** | Step-by-step setup guide | Developers/DevOps |
| **[SINGLE_SESSION_IMPLEMENTATION.md](SINGLE_SESSION_IMPLEMENTATION.md)** | Detailed technical documentation | Developers |
| **[SINGLE_SESSION_FLOW.md](SINGLE_SESSION_FLOW.md)** | Visual flow diagrams | Developers/Architects |
| **README_SINGLE_SESSION.md** (this file) | Quick reference | Everyone |

---

## 🚀 Quick Start

### 1. Apply Database Migration

**Supabase Dashboard → SQL Editor → New Query**

Copy and run: `supabase/migrations/create_active_sessions_table.sql`

### 2. Deploy Edge Functions

```bash
supabase functions deploy rate-limited-login
supabase functions deploy cleanup-expired-sessions
```

### 3. Test

1. Login on Browser 1
2. Login on Browser 2 (same user)
3. Wait 30 seconds on Browser 1
4. Browser 1 should show "Session Terminated" modal ✅

---

## 📦 What's Included

### New Files

```
📁 supabase/
  📁 migrations/
    📄 create_active_sessions_table.sql      ← Database schema
  📁 functions/
    📁 cleanup-expired-sessions/
      📄 index.ts                            ← Cleanup function

📁 src/
  📁 components/
    📄 SessionTerminatedNotifier.jsx         ← Notification modal

📄 SINGLE_SESSION_SUMMARY.md                 ← Overview
📄 SINGLE_SESSION_IMPLEMENTATION.md          ← Technical docs
📄 SETUP_SINGLE_SESSION.md                   ← Setup guide
📄 SINGLE_SESSION_FLOW.md                    ← Flow diagrams
📄 README_SINGLE_SESSION.md                  ← This file
```

### Modified Files

```
📄 supabase/functions/rate-limited-login/index.ts
   ✏️ Added session management logic

📄 src/contexts/AuthContext.jsx
   ✏️ Added session validation and tracking

📄 src/App.jsx
   ✏️ Added SessionTerminatedNotifier component
```

---

## 🎯 How It Works

### Login Flow

```
User logs in on Device B
    ↓
System terminates all sessions on Device A
    ↓
Device A detects invalid session (within 30 seconds)
    ↓
Device A shows "Session Terminated" modal
    ↓
User must log in again on Device A
```

### Session Validation

- **Every 30 seconds**: Frontend checks if session is still valid
- **On token refresh**: Validates session before accepting new token
- **On auth events**: Validates session on any auth state change

---

## ⚙️ Configuration

### Validation Interval (Default: 30 seconds)

**File**: `src/contexts/AuthContext.jsx` (line ~115)

```javascript
setInterval(async () => {
  // Validate session
}, 30000); // ← Change this value
```

### Session Expiration (Default: 1 hour)

**File**: `supabase/functions/rate-limited-login/index.ts` (line ~175)

```javascript
const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // ← Change this
```

⚠️ **Important**: Should match JWT token expiration time!

---

## 🔍 Testing Checklist

- [ ] Database migration applied
- [ ] Edge functions deployed
- [ ] Test: Concurrent login terminates old session
- [ ] Test: Normal logout works correctly
- [ ] Test: Session timeout (15 min) still works
- [ ] No errors in browser console
- [ ] No errors in Supabase logs

---

## 🐛 Troubleshooting

### Modal not showing when logged in elsewhere

**Check:**
- Session validation is running (check browser console)
- `session_id` exists in localStorage
- Database functions have correct permissions

**Debug:**
```javascript
// In browser console
localStorage.getItem('session_id')  // Should return a session ID
```

### Users getting logged out immediately

**Check:**
- Session expiration time is reasonable (≥1 hour)
- No JavaScript errors in console
- `session_id` is returned from login function

**Debug:**
```sql
-- In Supabase SQL Editor
SELECT * FROM active_sessions WHERE user_id = 'USER_ID_HERE'::uuid;
```

### Old sessions not terminated

**Check:**
- Edge Function logs for errors
- `terminate_other_sessions` function exists
- Database permissions are correct

**Debug:**
```sql
-- Test function manually
SELECT terminate_other_sessions(
  'USER_ID_HERE'::uuid,
  'CURRENT_SESSION_ID_HERE'
);
```

---

## 🔄 Maintenance

### Cleanup Expired Sessions (Recommended)

Set up a cron job to run hourly:

```bash
# Using external cron service
POST https://YOUR_PROJECT.supabase.co/functions/v1/cleanup-expired-sessions
Header: Authorization: Bearer YOUR_ANON_KEY
```

Or run manually in SQL Editor:
```sql
SELECT cleanup_expired_sessions();
```

### Monitor Active Sessions

```sql
-- View all active sessions
SELECT 
  user_id,
  session_id,
  created_at,
  expires_at,
  ip_address,
  last_activity
FROM active_sessions
ORDER BY created_at DESC;

-- Count sessions per user
SELECT 
  user_id,
  COUNT(*) as session_count
FROM active_sessions
GROUP BY user_id
HAVING COUNT(*) > 1;  -- Should be 0 with single-session enforcement
```

---

## 📊 Database Schema

### `active_sessions` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | User reference |
| `session_id` | text | Unique session identifier |
| `access_token` | text | JWT access token |
| `refresh_token` | text | JWT refresh token |
| `created_at` | timestamptz | Session creation time |
| `expires_at` | timestamptz | Session expiration time |
| `ip_address` | text | Client IP address |
| `user_agent` | text | Browser/device info |
| `last_activity` | timestamptz | Last activity timestamp |

### Database Functions

| Function | Purpose |
|----------|---------|
| `terminate_other_sessions()` | Removes all sessions except current |
| `is_session_valid()` | Checks if session exists and is valid |
| `cleanup_expired_sessions()` | Removes expired session records |
| `update_session_activity()` | Updates last activity timestamp |

---

## 🔐 Security Benefits

| Benefit | Description |
|---------|-------------|
| **Prevents Account Sharing** | Only one active session at a time |
| **Immediate Termination** | Old sessions killed instantly on new login |
| **Periodic Validation** | Detects terminated sessions within 30 seconds |
| **Audit Trail** | All sessions tracked in database |
| **Clean Logout** | Global sign-out ensures no lingering sessions |

---

## 🎨 User Experience

### Session Terminated Modal

When a user is logged in from another device, they see:

```
┌─────────────────────────────────────────┐
│  Sesija pārtraukta                      │
├─────────────────────────────────────────┤
│                                         │
│  Jūsu sesija tika pārtraukta, jo        │
│  pieteicāties no citas ierīces vai      │
│  pārlūkprogrammas. Sistēmā var būt      │
│  aktīva tikai viena sesija vienlaicīgi. │
│                                         │
│  Lūdzu, pieslēdzieties, lai turpinātu.  │
│                                         │
│              [ Pieslēgties ]            │
└─────────────────────────────────────────┘
```

### Different from Session Timeout

| Scenario | Modal Title | Cause |
|----------|-------------|-------|
| **Session Terminated** | "Sesija pārtraukta" | Logged in from another device |
| **Session Timeout** | "Sesija beigusies" | 15 minutes of inactivity |

---

## 📝 Implementation Status

- ✅ Database schema created
- ✅ Edge Functions updated
- ✅ Frontend session validation implemented
- ✅ Notification modal created
- ✅ Documentation completed
- ⏳ **Pending**: Database migration deployment
- ⏳ **Pending**: Edge Function deployment
- ⏳ **Pending**: Testing in production

---

## 🔄 Rollback Plan

If you need to revert this feature:

1. **Revert AuthContext**: Remove session validation code
2. **Change signOut scope**: Back to `'local'`
3. **Remove component**: SessionTerminatedNotifier from App.jsx
4. **Redeploy old Edge Function**: Without session management
5. **Drop table** (optional): `DROP TABLE active_sessions CASCADE;`

See [SINGLE_SESSION_IMPLEMENTATION.md](SINGLE_SESSION_IMPLEMENTATION.md) for detailed rollback instructions.

---

## 📞 Support

### Need Help?

1. Check [SETUP_SINGLE_SESSION.md](SETUP_SINGLE_SESSION.md) for setup issues
2. Check [SINGLE_SESSION_IMPLEMENTATION.md](SINGLE_SESSION_IMPLEMENTATION.md) for technical details
3. Check [SINGLE_SESSION_FLOW.md](SINGLE_SESSION_FLOW.md) for flow diagrams
4. Check Supabase logs for errors
5. Check browser console for JavaScript errors

### Useful SQL Queries

```sql
-- Check if functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%session%';

-- View active sessions
SELECT * FROM active_sessions;

-- Manually terminate all sessions for a user
DELETE FROM active_sessions WHERE user_id = 'USER_ID'::uuid;

-- Clean up expired sessions
SELECT cleanup_expired_sessions();
```

---

## 🎉 Next Steps

1. ✅ Review this documentation
2. ⏳ Apply database migration
3. ⏳ Deploy Edge Functions
4. ⏳ Test concurrent login behavior
5. ⏳ Set up cleanup cron job (optional)
6. ⏳ Monitor logs for issues
7. ⏳ Gather user feedback

---

**Implementation Date**: December 16, 2025  
**Status**: ✅ Complete - Ready for deployment  
**Version**: 1.0.0

---

## 📄 License & Credits

Part of the Piffdeals Staff application.  
Single-session authentication implementation by AI Assistant.

For project overview, see: [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)

