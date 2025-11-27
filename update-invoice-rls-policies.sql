-- ============================================
-- Migration: Update Invoice RLS Policies
-- ============================================
-- This migration updates the Row Level Security policies for invoices
-- to enforce the following access rules:
-- 1. super_admin and admin can CRUD invoices created BY employees
-- 2. super_admin and admin CANNOT CRUD each other's invoices
-- 3. employees can only CRUD their own invoices

-- ============================================
-- STEP 1: Add helper function to check if user is employee
-- ============================================
CREATE OR REPLACE FUNCTION public.is_employee(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_user_role(user_id) = 'employee';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 2: Drop existing invoice policies
-- ============================================
DROP POLICY IF EXISTS "Users can view invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update invoices" ON invoices;
DROP POLICY IF EXISTS "Users can delete invoices" ON invoices;

-- ============================================
-- STEP 3: Create new SELECT policy
-- ============================================
-- Employees can view their own invoices
-- Admins can view invoices created by employees (but not by other admins)
CREATE POLICY "Users can view invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    -- Users can always view their own invoices
    user_id = auth.uid()
    OR
    -- Admins can view invoices created by employees (but not by other admins)
    (
      public.is_admin(auth.uid())
      AND public.is_employee(user_id)
    )
  );

-- ============================================
-- STEP 4: Create new UPDATE policy
-- ============================================
-- Only draft invoices can be updated
-- Employees can update their own draft invoices
-- Admins can update draft invoices created by employees (but not by other admins)
CREATE POLICY "Users can update invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (
    status = 'draft'
    AND (
      -- Creator can always update their own invoices
      user_id = auth.uid()
      OR
      -- Admins can update invoices created by employees (but not by other admins)
      (
        public.is_admin(auth.uid())
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
      -- Admins can update invoices created by employees (but not by other admins)
      (
        public.is_admin(auth.uid())
        AND public.is_employee(user_id)
      )
    )
  );

-- ============================================
-- STEP 5: Create new DELETE policy
-- ============================================
-- Only draft invoices can be deleted
-- Employees can delete their own draft invoices
-- Admins can delete draft invoices created by employees (but not by other admins)
CREATE POLICY "Users can delete invoices"
  ON invoices FOR DELETE
  TO authenticated
  USING (
    status = 'draft'
    AND (
      -- Creator can always delete their own invoices
      user_id = auth.uid()
      OR
      -- Admins can delete invoices created by employees (but not by other admins)
      (
        public.is_admin(auth.uid())
        AND public.is_employee(user_id)
      )
    )
  );

-- ============================================
-- STEP 6: Update invoice_items policies
-- ============================================
DROP POLICY IF EXISTS "Users can view invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Users can update invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Users can delete invoice items" ON invoice_items;

-- View policy
CREATE POLICY "Users can view invoice items"
  ON invoice_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND (
        -- Users can view items from their own invoices
        invoices.user_id = auth.uid()
        OR
        -- Admins can view items from invoices created by employees (but not by other admins)
        (
          public.is_admin(auth.uid())
          AND public.is_employee(invoices.user_id)
        )
      )
    )
  );

-- Update policy
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
        -- Admins can update items in invoices created by employees (but not by other admins)
        (
          public.is_admin(auth.uid())
          AND public.is_employee(invoices.user_id)
        )
      )
    )
  );

-- Delete policy
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
        -- Admins can delete items from invoices created by employees (but not by other admins)
        (
          public.is_admin(auth.uid())
          AND public.is_employee(invoices.user_id)
        )
      )
    )
  );

-- ============================================
-- END OF MIGRATION
-- ============================================

