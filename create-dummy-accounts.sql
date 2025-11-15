-- ============================================
-- CREATE DUMMY ACCOUNTS FOR TESTING
-- ============================================
-- This script creates dummy test accounts with random roles
-- Global password: test1234
-- 
-- IMPORTANT: This creates BOTH auth users AND user profiles
-- Run this via the Edge Function OR manually create auth users first
-- ============================================

-- ============================================
-- OPTION 1: Direct SQL Insert (user_profiles only)
-- ============================================
-- WARNING: These users won't be able to login unless you also create
-- auth.users records via Supabase Dashboard or Edge Function
-- This is useful if you've already created auth users manually
-- ============================================

-- Uncomment and modify these if you've already created auth users:
/*
INSERT INTO user_profiles (id, email, username, role, status)
VALUES 
  ('your-auth-user-id-1', 'employee1@piffdeals.com', 'John Employee', 'employee', 'active'),
  ('your-auth-user-id-2', 'admin1@piffdeals.com', 'Jane Admin', 'admin', 'active'),
  ('your-auth-user-id-3', 'superadmin@piffdeals.com', 'Bob SuperAdmin', 'super_admin', 'active');
*/

-- ============================================
-- OPTION 2: Generate SQL for Edge Function Calls (RECOMMENDED)
-- ============================================
-- This generates the curl commands to call the Edge Function
-- which will create BOTH auth users AND user profiles
-- ============================================

-- Generate random dummy accounts
-- Copy the output and run the curl commands in your terminal
-- Replace YOUR_PROJECT_REF and YOUR_ANON_KEY with your actual values

DO $$
DECLARE
  v_count INTEGER := 15; -- Number of dummy accounts to create
  v_role TEXT;
  v_random FLOAT;
  v_email TEXT;
  v_username TEXT;
  v_status TEXT;
  v_first_names TEXT[] := ARRAY['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Emma', 'David', 'Sarah', 'Mike', 'Lisa', 'Tom', 'Amy', 'Chris', 'Rachel', 'Steve', 'Maria', 'Kevin', 'Laura', 'Ryan', 'Jessica'];
  v_last_names TEXT[] := ARRAY['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White'];
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'CURL COMMANDS TO CREATE DUMMY ACCOUNTS';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Run these commands in your terminal:';
  RAISE NOTICE 'Replace YOUR_PROJECT_REF with your Supabase project reference';
  RAISE NOTICE 'Replace YOUR_ANON_KEY with your Supabase anon/public key';
  RAISE NOTICE '';
  
  FOR i IN 1..v_count LOOP
    -- Generate random role (70% employee, 20% admin, 10% super_admin)
    v_random := random();
    IF v_random < 0.7 THEN
      v_role := 'employee';
    ELSIF v_random < 0.9 THEN
      v_role := 'admin';
    ELSE
      v_role := 'super_admin';
    END IF;
    
    -- Generate random status (80% active, 15% inactive, 5% suspended)
    v_random := random();
    IF v_random < 0.8 THEN
      v_status := 'active';
    ELSIF v_random < 0.95 THEN
      v_status := 'inactive';
    ELSE
      v_status := 'suspended';
    END IF;
    
    -- Generate random username and email
    v_username := v_first_names[1 + floor(random() * array_length(v_first_names, 1))::int] || ' ' || 
                  v_last_names[1 + floor(random() * array_length(v_last_names, 1))::int];
    v_email := lower(replace(v_username, ' ', '.')) || i || '@piffdeals.com';
    
    -- Output curl command
    RAISE NOTICE 'curl -X POST \';
    RAISE NOTICE '  "https://YOUR_PROJECT_REF.supabase.co/functions/v1/create-user" \';
    RAISE NOTICE '  -H "Authorization: Bearer YOUR_ANON_KEY" \';
    RAISE NOTICE '  -H "Content-Type: application/json" \';
    RAISE NOTICE '  -d ''{"email": "%", "password": "test1234", "username": "%", "role": "%", "status": "%"}''', v_email, v_username, v_role, v_status;
    RAISE NOTICE '';
  END LOOP;
  
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total commands generated: %', v_count;
  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- OPTION 3: Bulk Insert Script (for manual auth creation)
-- ============================================
-- If you want to create auth users manually in Supabase Dashboard first,
-- then use this script to bulk insert the profiles
-- ============================================

-- Generate INSERT statements for copy-paste
DO $$
DECLARE
  v_count INTEGER := 15;
  v_role TEXT;
  v_random FLOAT;
  v_email TEXT;
  v_username TEXT;
  v_status TEXT;
  v_first_names TEXT[] := ARRAY['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Emma', 'David', 'Sarah', 'Mike', 'Lisa', 'Tom', 'Amy', 'Chris', 'Rachel', 'Steve', 'Maria', 'Kevin', 'Laura', 'Ryan', 'Jessica'];
  v_last_names TEXT[] := ARRAY['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White'];
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'DUMMY ACCOUNT DATA';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Email                          | Username           | Role        | Status    | Password';
  RAISE NOTICE '-------------------------------|-------------------|-------------|-----------|----------';
  
  FOR i IN 1..v_count LOOP
    -- Generate random role (70% employee, 20% admin, 10% super_admin)
    v_random := random();
    IF v_random < 0.7 THEN
      v_role := 'employee';
    ELSIF v_random < 0.9 THEN
      v_role := 'admin';
    ELSE
      v_role := 'super_admin';
    END IF;
    
    -- Generate random status (80% active, 15% inactive, 5% suspended)
    v_random := random();
    IF v_random < 0.8 THEN
      v_status := 'active';
    ELSIF v_random < 0.95 THEN
      v_status := 'inactive';
    ELSE
      v_status := 'suspended';
    END IF;
    
    -- Generate random username and email
    v_username := v_first_names[1 + floor(random() * array_length(v_first_names, 1))::int] || ' ' || 
                  v_last_names[1 + floor(random() * array_length(v_last_names, 1))::int];
    v_email := lower(replace(v_username, ' ', '.')) || i || '@piffdeals.com';
    
    -- Output table row
    RAISE NOTICE '% | % | % | % | test1234', 
      rpad(v_email, 30), 
      rpad(v_username, 18),
      rpad(v_role, 12),
      rpad(v_status, 10);
  END LOOP;
  
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total accounts: %', v_count;
  RAISE NOTICE 'All passwords: test1234';
  RAISE NOTICE '============================================';
END $$;



