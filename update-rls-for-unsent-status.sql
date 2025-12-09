-- Update RLS policy to allow 'unsent' status
-- This allows updating invoices from 'draft' to 'unsent' and from 'unsent' to 'sent'

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can update invoices" ON invoices;

-- Recreate the policy with 'unsent' status support
CREATE POLICY "Users can update invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (
    (
      -- Case 1: Draft or unsent invoices - can be updated by creator/admin/super_admin
      (
        status IN ('draft', 'unsent')
        AND (
          -- Creator can always update their own invoices
          user_id = auth.uid()
          OR
          -- Super_admin can update any draft/unsent invoice
          public.is_super_admin(auth.uid())
          OR
          -- Admins (not super_admin) can update invoices created by employees (but not by super_admin or other admins)
          (
            public.is_admin_only(auth.uid())
            AND public.is_employee(user_id)
          )
        )
      )
      OR
      -- Case 2: Non-draft invoices - can only change status (by creator only)
      (
        status IN ('sent', 'pending', 'overdue')
        AND user_id = auth.uid()  -- Only creator can update non-draft invoices
      )
    )
  )
  WITH CHECK (
    (
      -- Case 1: Draft/unsent invoices - can be updated to draft, unsent, or sent (content edit or status change)
      (
        status IN ('draft', 'unsent', 'sent')
        AND (
          -- Creator can always update their own invoices
          user_id = auth.uid()
          OR
          -- Super_admin can update any draft/unsent invoice
          public.is_super_admin(auth.uid())
          OR
          -- Admins (not super_admin) can update invoices created by employees (but not by super_admin or other admins)
          (
            public.is_admin_only(auth.uid())
            AND public.is_employee(user_id)
          )
        )
      )
      OR
      -- Case 2: Non-draft invoices - can change status (by creator only)
      -- Allow status changes from sent/pending/overdue to other valid statuses
      -- Note: Content edits are prevented by application logic, RLS only controls access
      (
        status IN ('paid', 'pending', 'overdue', 'cancelled', 'sent')
        AND user_id = auth.uid()  -- Only creator can update non-draft invoices
      )
    )
  );





