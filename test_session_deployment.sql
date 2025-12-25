-- Test if single-session implementation is working
-- Run this in Supabase SQL Editor

-- 1. Check if active_sessions table exists
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'active_sessions'
ORDER BY ordinal_position;

-- 2. Check if functions exist
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'terminate_other_sessions',
    'is_session_valid',
    'cleanup_expired_sessions',
    'update_session_activity'
  );

-- 3. Check if there are any active sessions currently
SELECT 
  user_id,
  session_id,
  created_at,
  expires_at,
  ip_address,
  last_activity
FROM active_sessions
ORDER BY created_at DESC;

-- 4. Count sessions per user (should be 1 or 0 for each user)
SELECT 
  user_id,
  COUNT(*) as session_count
FROM active_sessions
GROUP BY user_id
HAVING COUNT(*) > 1;  -- This should return 0 rows if working correctly



