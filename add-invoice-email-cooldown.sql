-- ============================================
-- Add Invoice Email Cooldown Column
-- ============================================
-- This adds a timestamp column to track when invoice emails were last sent
-- Used for rate limiting to prevent email spam

-- Add column to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS last_invoice_email_sent TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_invoices_last_email_sent 
ON invoices(last_invoice_email_sent);

-- ============================================
-- Fix Invoice Update Policy - Remove Admin Override
-- ============================================
-- According to documentation, only creator can edit invoices (no admin override)
-- This updates the RLS policy to enforce creator-only editing

-- Drop existing policy
DROP POLICY IF EXISTS "Users can update invoices" ON invoices;

-- Create new policy that only allows creator to update draft invoices
CREATE POLICY "Users can update invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (
    status = 'draft'
    AND user_id = auth.uid()  -- Only creator, no admin override
  )
  WITH CHECK (
    status = 'draft'
    AND user_id = auth.uid()  -- Only creator, no admin override
  );

-- ============================================
-- Notes
-- ============================================
-- The policy change ensures that:
-- 1. Only the creator (user_id) can edit their own invoices
-- 2. Admins can view all invoices but cannot edit them (per business rules)
-- 3. This matches the documentation which states "No admin override"
--
-- If you need admin override back, you can restore the old policy:
-- CREATE POLICY "Users can update invoices"
--   ON invoices FOR UPDATE
--   TO authenticated
--   USING (
--     status = 'draft'
--     AND (
--       user_id = auth.uid()
--       OR
--       public.is_admin(auth.uid())
--     )
--   );

