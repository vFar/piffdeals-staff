-- ============================================
-- SAFE DATABASE PURGE
-- Use this to completely clear all tables and data
-- ⚠️ WARNING: This will DELETE ALL DATA permanently!
-- ============================================

-- Step 1: Delete all data from tables (in reverse dependency order)
-- Only if tables exist - wrapped in DO block to avoid errors

DO $$ 
BEGIN
    -- Delete invoice items first (depends on invoices)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoice_items') THEN
        ALTER TABLE invoice_items DISABLE ROW LEVEL SECURITY;
        DELETE FROM invoice_items;
    END IF;

    -- Delete invoices (depends on user_profiles)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
        ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
        DELETE FROM invoices;
    END IF;

    -- Delete user profiles (but keep auth.users - handled by Supabase)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
        ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
        DELETE FROM user_profiles;
    END IF;
END $$;

-- Step 3: Drop tables completely (removes structure too)
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Step 4: Drop functions
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Step 5: Drop triggers
DROP TRIGGER IF EXISTS on_invoice_updated ON invoices;
DROP TRIGGER IF EXISTS on_user_profile_updated ON user_profiles;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 6: Drop policies (they'll be automatically dropped when tables are dropped)
-- No need to drop policies separately - CASCADE handles it

-- ============================================
-- VERIFICATION: Check what's left
-- ============================================
-- Run these queries to verify everything is deleted:

-- Check if tables exist (should return 0 rows)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_profiles', 'invoices', 'invoice_items');

-- Check if functions exist (should return 0 rows)
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('handle_updated_at', 'handle_new_user');

-- ============================================
-- NOTE: This does NOT delete auth.users
-- auth.users is managed by Supabase Auth
-- If you want to delete auth users, do it via Supabase Dashboard:
-- Authentication → Users → Delete User
-- ============================================

