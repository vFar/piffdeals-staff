-- Fix: Allow super_admin to delete any draft invoice
-- This updates the RLS policy to include super_admin in the delete permissions

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can delete invoices" ON invoices;

-- Recreate the policy with super_admin support
CREATE POLICY "Users can delete invoices"
  ON invoices FOR DELETE
  TO authenticated
  USING (
    status = 'draft'
    AND (
      -- Creator can always delete their own invoices
      user_id = auth.uid()
      OR
      -- Super_admin can delete any draft invoice
      public.is_super_admin(auth.uid())
      OR
      -- Admins (not super_admin) can delete invoices created by employees (but not by super_admin or other admins)
      (
        public.is_admin_only(auth.uid())
        AND public.is_employee(user_id)
      )
    )
  );


