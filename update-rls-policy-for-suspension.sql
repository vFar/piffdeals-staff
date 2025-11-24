-- Update RLS policy to allow suspension permissions:
-- - Employees can be suspended by admin and super_admin
-- - Admins can be suspended by super_admin only
-- - Super_admins CANNOT be suspended by anyone
-- - Employees have NO access to update anything (they don't even see this page)

-- Drop the old policies if they exist
DROP POLICY IF EXISTS "Admins can update profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update profiles based on role" ON user_profiles;

-- Create new policy that allows:
-- 1. Users to update their own profile (regardless of role)
-- 2. Admins to update employee profiles only
-- 3. Super_admins to update employees and admins (but NOT other super_admins)
CREATE POLICY "Users can update profiles based on role"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    -- Users can always update their own profile
    auth.uid() = id
    OR
    -- Admins can update employee profiles only
    (
      public.get_user_role(auth.uid()) = 'admin'
      AND role = 'employee'
    )
    OR
    -- Super_admins can update employees and admins (but NOT other super_admins)
    (
      public.is_super_admin(auth.uid())
      AND role != 'super_admin'
    )
  )
  WITH CHECK (
    -- For WITH CHECK, we check the NEW role value (after update)
    -- Users can always update their own profile
    auth.uid() = id
    OR
    -- Admins can update employee profiles only
    (
      public.get_user_role(auth.uid()) = 'admin'
      AND role = 'employee'
    )
    OR
    -- Super_admins can update employees and admins (but NOT other super_admins)
    (
      public.is_super_admin(auth.uid())
      AND role != 'super_admin'
    )
  );

