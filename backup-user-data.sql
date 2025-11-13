-- ============================================
-- BACKUP USER DATA BEFORE RUNNING SCHEMA
-- Run this FIRST to save your existing user data
-- ============================================

-- This will show you the current user data
-- Copy this data so you can recreate the user after running the schema
SELECT 
  id,
  email,
  username,
  role,
  status,
  created_at,
  updated_at,
  last_login
FROM user_profiles;

-- After running the schema, you'll need to recreate the user:
-- 1. The user must exist in Supabase Auth first
-- 2. Then insert into user_profiles with the same id, email, username, role, status


