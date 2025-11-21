-- ============================================
-- COMPLETE USER PURGE - Deletes ALL Users
-- ⚠️ WARNING: This will DELETE ALL USER ACCOUNTS permanently!
-- This includes BOTH user_profiles AND auth.users
-- ============================================

-- Step 1: Disable RLS temporarily
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Delete all user profiles
DELETE FROM user_profiles;

-- Step 3: Delete all auth users (THIS IS THE KEY DIFFERENCE)
-- This deletes from Supabase's auth.users table
DELETE FROM auth.users;

-- Step 4: Re-enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICATION: Check everything is deleted
-- ============================================

-- Check user_profiles (should return 0)
SELECT COUNT(*) as user_profiles_count FROM user_profiles;

-- Check auth.users (should return 0)
SELECT COUNT(*) as auth_users_count FROM auth.users;

-- ============================================
-- Result: Both tables should be empty
-- ============================================






