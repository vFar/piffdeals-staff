-- ============================================
-- UPDATE INVOICE DELETE POLICY
-- Only draft invoices can be deleted
-- ============================================

-- Drop existing delete policy
DROP POLICY IF EXISTS "Users can delete invoices" ON invoices;

-- Create new policy: Only draft invoices can be deleted (by creator or super_admin)
CREATE POLICY "Users can delete invoices"
  ON invoices FOR DELETE
  TO authenticated
  USING (
    status = 'draft'
    AND (
      user_id = auth.uid()
      OR
      public.is_super_admin(auth.uid())
    )
  );
