-- Quick fix: Add is_admin_only function and update RLS policies
-- Run this in your Supabase SQL editor

-- Step 1: Add function to check if user is admin (not super_admin)
CREATE OR REPLACE FUNCTION public.is_admin_only(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_user_role(user_id) = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Update RLS policy for invoice UPDATE
-- Allows:
-- 1. Draft invoices: Can be edited (content or status) by creator/admin/super_admin
-- 2. Non-draft invoices: Can only change status (by creator only), cannot edit content
-- Super_admin can update any draft invoice
-- Admins (not super_admin) can update invoices created by employees (but not by super_admin or other admins)
DROP POLICY IF EXISTS "Users can update invoices" ON invoices;
CREATE POLICY "Users can update invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (
    (
      -- Case 1: Draft invoices - can be updated by creator/admin/super_admin
      (
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
      -- Case 1: Draft invoices - can be updated to draft (content edit) or sent (status change)
      (
        status IN ('draft', 'sent')
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

-- Step 3: Update RLS policy for invoice DELETE
-- Super_admin can delete any draft invoice
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

-- Step 4: Update RLS policy for invoice_items INSERT
-- Super_admin can create items for any draft invoice
-- Admins (not super_admin) can create items for draft invoices created by employees (but not by super_admin or other admins)
DROP POLICY IF EXISTS "Users can create invoice items" ON invoice_items;
CREATE POLICY "Users can create invoice items"
  ON invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.status = 'draft'
      AND (
        -- Creator can always create items for their own invoices
        invoices.user_id = auth.uid()
        OR
        -- Super_admin can create items for any draft invoice
        public.is_super_admin(auth.uid())
        OR
        -- Admins (not super_admin) can create items for invoices created by employees (but not by super_admin or other admins)
        (
          public.is_admin_only(auth.uid())
          AND public.is_employee(invoices.user_id)
        )
      )
    )
  );

-- Step 5: Update RLS policy for invoice_items UPDATE
-- Super_admin can update items in any draft invoice
-- Admins (not super_admin) can update items in draft invoices created by employees (but not by super_admin or other admins)
DROP POLICY IF EXISTS "Users can update invoice items" ON invoice_items;
CREATE POLICY "Users can update invoice items"
  ON invoice_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.status = 'draft'
      AND (
        -- Creator can always update items in their own invoices
        invoices.user_id = auth.uid()
        OR
        -- Super_admin can update items in any draft invoice
        public.is_super_admin(auth.uid())
        OR
        -- Admins (not super_admin) can update items in invoices created by employees (but not by super_admin or other admins)
        (
          public.is_admin_only(auth.uid())
          AND public.is_employee(invoices.user_id)
        )
      )
    )
  );

-- Step 6: Update RLS policy for invoice_items DELETE
-- Super_admin can delete items from any draft invoice
-- Admins (not super_admin) can delete items from draft invoices created by employees (but not by super_admin or other admins)
DROP POLICY IF EXISTS "Users can delete invoice items" ON invoice_items;
CREATE POLICY "Users can delete invoice items"
  ON invoice_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.status = 'draft'
      AND (
        -- Creator can always delete items from their own invoices
        invoices.user_id = auth.uid()
        OR
        -- Super_admin can delete items from any draft invoice
        public.is_super_admin(auth.uid())
        OR
        -- Admins (not super_admin) can delete items from invoices created by employees (but not by super_admin or other admins)
        (
          public.is_admin_only(auth.uid())
          AND public.is_employee(invoices.user_id)
        )
      )
    )
  );

