-- ============================================
-- Fix: Allow admins and super_admins to update their own roles
-- ============================================
-- This fixes the bug where admins/super_admins couldn't change their own roles
-- The existing "Admins can update profiles" policy only allowed updating employee profiles
-- Now it also allows admins to update their own profile regardless of role

-- Drop the existing policy
DROP POLICY IF EXISTS "Admins can update profiles" ON user_profiles;

-- Recreate the policy with the fix
-- Admins can update:
--   1. Employee profiles (role = 'employee')
--   2. Their own profile (auth.uid() = id) - regardless of role
-- Super admins can update any profile
CREATE POLICY "Admins can update profiles"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    (
      public.get_user_role(auth.uid()) = 'admin'
      AND (
        role = 'employee'
        OR auth.uid() = id  -- Allow admins to update their own profile
      )
    )
    OR
    public.is_super_admin(auth.uid())
  );





