-- Migration: Allow administrators to edit/delete invoices created by employees
-- But disallow edit/delete for invoices created by super_admin
-- Date: 2024

-- Add function to check if user is admin (not super_admin)
CREATE OR REPLACE FUNCTION public.is_admin_only(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_user_role(user_id) = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policy for invoice UPDATE
-- Super_admin can update any draft invoice
-- Admins (not super_admin) can update invoices created by employees (but not by super_admin or other admins)
DROP POLICY IF EXISTS "Users can update invoices" ON invoices;
CREATE POLICY "Users can update invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (
    status = 'draft'
    AND (
      -- Creator can always update their own invoices
      user_id = auth.uid()
      OR
      -- Super_admin can update any draft invoice
      public.is_super_admin(auth.uid())
      OR
      -- Admins (not super_admin) can update invoices created by employees (but not by super_admin or other admins)
      (
        public.is_admin_only(auth.uid())
        AND public.is_employee(user_id)
      )
    )
  )
  WITH CHECK (
    status = 'draft'
    AND (
      -- Creator can always update their own invoices
      user_id = auth.uid()
      OR
      -- Super_admin can update any draft invoice
      public.is_super_admin(auth.uid())
      OR
      -- Admins (not super_admin) can update invoices created by employees (but not by super_admin or other admins)
      (
        public.is_admin_only(auth.uid())
        AND public.is_employee(user_id)
      )
    )
  );

-- Update RLS policy for invoice DELETE
-- Admins (not super_admin) can delete invoices created by employees (but not by super_admin or other admins)
DROP POLICY IF EXISTS "Users can delete invoices" ON invoices;
CREATE POLICY "Users can delete invoices"
  ON invoices FOR DELETE
  TO authenticated
  USING (
    status = 'draft'
    AND (
      -- Creator can always delete their own invoices
      user_id = auth.uid()
      OR
      -- Admins (not super_admin) can delete invoices created by employees (but not by super_admin or other admins)
      (
        public.is_admin_only(auth.uid())
        AND public.is_employee(user_id)
      )
    )
  );

