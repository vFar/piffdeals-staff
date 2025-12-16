# Single Session Authentication - Flow Diagrams

## 1. Login Flow (New Session Created)

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER LOGS IN                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Frontend: POST /functions/v1/rate-limited-login               │
│  Body: { email, password }                                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Edge Function: Authenticate with Supabase Auth                 │
│  - Verify credentials                                           │
│  - Generate JWT tokens                                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Edge Function: Generate Session ID                             │
│  session_id = userId_timestamp_random                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Database: terminate_other_sessions(user_id, session_id)        │
│  DELETE FROM active_sessions                                    │
│  WHERE user_id = ? AND session_id != ?                          │
│  ⚠️  ALL OTHER SESSIONS FOR THIS USER ARE DELETED               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Database: INSERT INTO active_sessions                          │
│  - user_id                                                      │
│  - session_id                                                   │
│  - access_token                                                 │
│  - refresh_token                                                │
│  - expires_at (now + 1 hour)                                    │
│  - ip_address                                                   │
│  - user_agent                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Frontend: Receive session data                                 │
│  - Store session_id in localStorage                             │
│  - Set auth state (currentUser, userProfile)                    │
│  - Start periodic session validation                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    USER IS LOGGED IN                            │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Session Validation Flow (Periodic Check)

```
┌─────────────────────────────────────────────────────────────────┐
│  Timer: Every 30 seconds                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Frontend: validateSession(user_id)                             │
│  - Get session_id from localStorage                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Database: is_session_valid(user_id, session_id)                │
│  SELECT EXISTS(                                                 │
│    SELECT 1 FROM active_sessions                                │
│    WHERE user_id = ? AND session_id = ?                         │
│      AND expires_at > now()                                     │
│  )                                                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────┴─────────┐
                    ↓                   ↓
          ┌─────────────────┐  ┌─────────────────┐
          │  Session Valid  │  │ Session Invalid │
          │  (exists=true)  │  │  (exists=false) │
          └─────────────────┘  └─────────────────┘
                    ↓                   ↓
          ┌─────────────────┐  ┌─────────────────────────────────┐
          │  Continue       │  │  Sign out locally               │
          │  normally       │  │  - Clear auth state             │
          │                 │  │  - Remove session_id            │
          └─────────────────┘  │  - Show "Session Terminated"    │
                               │    modal                        │
                               └─────────────────────────────────┘
```

## 3. Concurrent Login Scenario

```
TIME: T0
┌──────────────────────┐                    ┌──────────────────────┐
│    COMPUTER A        │                    │    COMPUTER B        │
│  (Already logged in) │                    │   (Not logged in)    │
└──────────────────────┘                    └──────────────────────┘
         │                                              │
         │ Session A active                             │
         │ session_id: "abc123"                         │
         │                                              │
         │                                              │
         │                                              │

TIME: T1 (User logs in on Computer B)
         │                                              │
         │                                              │ User enters
         │                                              │ credentials
         │                                              ↓
         │                                   ┌──────────────────────┐
         │                                   │ Login Request Sent   │
         │                                   └──────────────────────┘
         │                                              ↓
         │                                   ┌──────────────────────┐
         │                                   │ New session created  │
         │                                   │ session_id: "xyz789" │
         │                                   └──────────────────────┘
         │                                              ↓
         │                    ┌─────────────────────────────────────┐
         │                    │  DATABASE: Session A deleted!       │
         │                    │  Session B stored                   │
         │                    └─────────────────────────────────────┘
         │                                              ↓
         │                                   ┌──────────────────────┐
         │                                   │ Computer B logged in │
         │                                   │ ✅ Active Session    │
         │                                   └──────────────────────┘
         │
         │ Still showing as logged in
         │ (hasn't validated yet)
         │

TIME: T2 (Up to 30 seconds later - validation runs on Computer A)
         │
         ↓
┌──────────────────────┐
│ Validation Check     │
│ session_id: "abc123" │
└──────────────────────┘
         ↓
┌──────────────────────┐
│ Database Query:      │
│ Session "abc123"     │
│ NOT FOUND ❌         │
└──────────────────────┘
         ↓
┌──────────────────────┐
│ Sign out locally     │
│ Clear auth state     │
└──────────────────────┘
         ↓
┌──────────────────────┐
│ Show Modal:          │
│ "Sesija pārtraukta"  │
│ "Pieteicāties no     │
│  citas ierīces"      │
└──────────────────────┘
         ↓
┌──────────────────────┐
│ Redirect to Login    │
│ ❌ Logged Out        │
└──────────────────────┘

RESULT:
┌──────────────────────┐                    ┌──────────────────────┐
│    COMPUTER A        │                    │    COMPUTER B        │
│   ❌ Logged Out      │                    │   ✅ Logged In       │
│   (Must log in       │                    │   (Active Session)   │
│    again)            │                    │                      │
└──────────────────────┘                    └──────────────────────┘
```

## 4. Normal Logout Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  User clicks "Logout" button                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Frontend: signOut() called                                     │
│  - scope: 'global' (terminates all sessions)                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Supabase Auth: Sign out globally                               │
│  - Invalidate all JWT tokens                                    │
│  - Trigger SIGNED_OUT event                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Frontend: Clear local state                                    │
│  - setCurrentUser(null)                                         │
│  - setUserProfile(null)                                         │
│  - setSessionId(null)                                           │
│  - localStorage.clear()                                         │
│  - sessionStorage.clear()                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Redirect to /login                                             │
│  ✅ Clean logout (no modal shown)                               │
└─────────────────────────────────────────────────────────────────┘
```

## 5. Token Refresh Flow (with Validation)

```
┌─────────────────────────────────────────────────────────────────┐
│  JWT Access Token expires (after ~1 hour)                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Supabase Client: Automatic token refresh                       │
│  - Use refresh_token to get new access_token                    │
│  - Trigger TOKEN_REFRESHED event                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Frontend: onAuthStateChange listener                           │
│  - Detect TOKEN_REFRESHED event                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Frontend: validateSession(user_id)                             │
│  - Check if session still exists in database                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────┴─────────┐
                    ↓                   ↓
          ┌─────────────────┐  ┌─────────────────┐
          │  Session Valid  │  │ Session Invalid │
          └─────────────────┘  └─────────────────┘
                    ↓                   ↓
          ┌─────────────────┐  ┌─────────────────────────────────┐
          │  Token refresh  │  │  Reject token refresh           │
          │  successful     │  │  Sign out locally               │
          │  Continue       │  │  Show "Session Terminated"      │
          └─────────────────┘  └─────────────────────────────────┘
```

## 6. Database Session Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                    active_sessions TABLE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Session Record                                           │  │
│  │ ─────────────────────────────────────────────────────── │  │
│  │ user_id: abc-123                                         │  │
│  │ session_id: abc123_1234567890_xyz                        │  │
│  │ access_token: eyJhbGc...                                 │  │
│  │ refresh_token: v1.MR...                                  │  │
│  │ created_at: 2025-12-16 10:00:00                          │  │
│  │ expires_at: 2025-12-16 11:00:00  ← 1 hour from creation  │  │
│  │ ip_address: 192.168.1.100                                │  │
│  │ user_agent: Mozilla/5.0...                               │  │
│  │ last_activity: 2025-12-16 10:30:00                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Lifecycle:                                                     │
│  ──────────                                                     │
│                                                                 │
│  1. CREATED                                                     │
│     └─ On successful login                                      │
│     └─ All other sessions for user deleted first                │
│                                                                 │
│  2. ACTIVE                                                      │
│     └─ While expires_at > now()                                 │
│     └─ Validated every 30 seconds by frontend                   │
│                                                                 │
│  3. TERMINATED (one of these scenarios)                         │
│     ├─ User logs in from another device                         │
│     │  └─ terminate_other_sessions() deletes this record        │
│     │                                                            │
│     ├─ User clicks logout                                       │
│     │  └─ Global signOut invalidates all tokens                 │
│     │                                                            │
│     └─ Session expires (expires_at < now())                     │
│        └─ cleanup_expired_sessions() deletes this record        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 7. Complete System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  AuthContext                                                    │
│  ├─ Session ID tracking                                         │
│  ├─ Periodic validation (30s)                                   │
│  └─ Global signOut                                              │
│                                                                 │
│  SessionTerminatedNotifier                                      │
│  └─ Shows modal when session terminated                         │
│                                                                 │
│  SessionTimeoutNotifier (existing)                              │
│  └─ Shows modal after 15min inactivity                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                      EDGE FUNCTIONS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  rate-limited-login                                             │
│  ├─ Authenticate user                                           │
│  ├─ Generate session_id                                         │
│  ├─ Terminate other sessions                                    │
│  └─ Store new session                                           │
│                                                                 │
│  cleanup-expired-sessions (cron)                                │
│  └─ Remove expired session records                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                        DATABASE                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  active_sessions table                                          │
│  └─ Stores all active sessions                                  │
│                                                                 │
│  Functions:                                                     │
│  ├─ terminate_other_sessions()                                  │
│  ├─ is_session_valid()                                          │
│  ├─ cleanup_expired_sessions()                                  │
│  └─ update_session_activity()                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                     SUPABASE AUTH                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ├─ JWT token generation                                        │
│  ├─ Token refresh                                               │
│  ├─ Global/local signOut                                        │
│  └─ Auth state events                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Key Timing Parameters

| Parameter | Default Value | Location | Purpose |
|-----------|---------------|----------|---------|
| Session Validation Interval | 30 seconds | AuthContext.jsx | How often to check if session is still valid |
| Session Expiration | 1 hour | rate-limited-login/index.ts | How long session is valid |
| Inactivity Timeout | 15 minutes | SessionTimeoutNotifier.jsx | Logout after inactivity (unchanged) |
| Cleanup Frequency | Hourly (recommended) | Cron job | Remove expired sessions from database |

## Security Flow Summary

```
┌─────────────────────────────────────────────────────────────────┐
│  SECURITY ENFORCEMENT POINTS                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Login Time                                                  │
│     └─ Terminate all other sessions immediately                 │
│                                                                 │
│  2. Every 30 Seconds (Frontend)                                 │
│     └─ Validate session still exists in database                │
│                                                                 │
│  3. Token Refresh (Every ~50 minutes)                           │
│     └─ Validate session before accepting new token              │
│                                                                 │
│  4. On Auth State Change                                        │
│     └─ Validate session on any auth event                       │
│                                                                 │
│  5. Cron Job (Hourly)                                           │
│     └─ Clean up expired sessions                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

**These diagrams illustrate the complete single-session authentication flow.**
**For setup instructions, see: `SETUP_SINGLE_SESSION.md`**
**For technical details, see: `SINGLE_SESSION_IMPLEMENTATION.md`**

