-- ============================================
-- Fix Invoice Email Issues - SQL Migration
-- ============================================
-- This script fixes the issues preventing invoice emails from being sent
-- Run this in your Supabase SQL Editor

-- Step 1: Add missing column for email rate limiting
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS last_invoice_email_sent TIMESTAMP WITH TIME ZONE;

-- Step 2: Create index for the new column
CREATE INDEX IF NOT EXISTS idx_invoices_last_email_sent 
ON invoices(last_invoice_email_sent);

-- Step 3: Update RLS policy to allow updating invoice status from 'draft' to 'sent'
-- This is the critical fix - the old policy only allowed updates when status stayed 'draft'
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
      (
        status IN ('paid', 'pending', 'overdue', 'cancelled', 'sent')
        AND user_id = auth.uid()  -- Only creator can update non-draft invoices
      )
    )
  );

-- ============================================
-- Verification
-- ============================================
-- After running this script, verify:
-- 1. Column exists: SELECT column_name FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'last_invoice_email_sent';
-- 2. Policy exists: SELECT * FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'Users can update invoices';
-- 3. Index exists: SELECT indexname FROM pg_indexes WHERE tablename = 'invoices' AND indexname = 'idx_invoices_last_email_sent';






