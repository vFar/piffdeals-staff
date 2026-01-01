-- Production Verification Script
-- Run this in Supabase SQL Editor to verify indexes and RLS

-- ============================================
-- 1. CHECK EXISTING INDEXES
-- ============================================

-- Check indexes on invoices table
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'invoices'
ORDER BY indexname;

-- Check indexes on invoice_items table
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'invoice_items'
ORDER BY indexname;

-- Check indexes on user_profiles table
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'user_profiles'
ORDER BY indexname;

-- ============================================
-- 2. CREATE MISSING INDEXES (if needed)
-- ============================================

-- Invoices table indexes (run only if missing)
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date) WHERE due_date IS NOT NULL;

-- Invoice items table indexes
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- User profiles table indexes (if not already created)
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);

-- ============================================
-- 3. CHECK RLS STATUS
-- ============================================

-- Check if RLS is enabled on critical tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('invoices', 'invoice_items', 'user_profiles', 'activity_logs', 'customer_blacklist', 'company_settings', 'active_sessions')
ORDER BY tablename;

-- ============================================
-- 4. CHECK RLS POLICIES
-- ============================================

-- Check policies on invoices table
SELECT 
    tablename,
    policyname,
    cmd as "Command",
    roles,
    CASE 
        WHEN qual IS NOT NULL THEN 'Has USING clause'
        ELSE 'No USING clause'
    END as "Using Clause",
    CASE 
        WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
        ELSE 'No WITH CHECK clause'
    END as "With Check Clause"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'invoices'
ORDER BY policyname;

-- Check policies on invoice_items table
SELECT 
    tablename,
    policyname,
    cmd as "Command",
    roles,
    CASE 
        WHEN qual IS NOT NULL THEN 'Has USING clause'
        ELSE 'No USING clause'
    END as "Using Clause",
    CASE 
        WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
        ELSE 'No WITH CHECK clause'
    END as "With Check Clause"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'invoice_items'
ORDER BY policyname;

-- Check policies on user_profiles table
SELECT 
    tablename,
    policyname,
    cmd as "Command",
    roles,
    CASE 
        WHEN qual IS NOT NULL THEN 'Has USING clause'
        ELSE 'No USING clause'
    END as "Using Clause",
    CASE 
        WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
        ELSE 'No WITH CHECK clause'
    END as "With Check Clause"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_profiles'
ORDER BY policyname;

-- ============================================
-- 5. VERIFY ALL TABLES EXIST
-- ============================================

SELECT 
    tablename,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'public' AND tablename = t.tablename
        ) THEN 'EXISTS'
        ELSE 'MISSING'
    END as "Status"
FROM (VALUES 
    ('invoices'),
    ('invoice_items'),
    ('user_profiles'),
    ('activity_logs'),
    ('customer_blacklist'),
    ('company_settings'),
    ('active_sessions')
) AS t(tablename);

-- ============================================
-- 6. QUICK INDEX COUNT SUMMARY
-- ============================================

SELECT 
    tablename,
    COUNT(*) as "Index Count"
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('invoices', 'invoice_items', 'user_profiles')
GROUP BY tablename
ORDER BY tablename;

