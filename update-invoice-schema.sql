-- ============================================
-- UPDATE INVOICE SCHEMA
-- Adds new fields for enhanced invoice management
-- ============================================

-- Add is_public field for controlling public access
ALTER TABLE invoices 
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Add pending_reason field for tracking why invoice is pending
ALTER TABLE invoices 
  ADD COLUMN IF NOT EXISTS pending_reason TEXT;

-- Add investigation_reason field for invoices needing investigation
ALTER TABLE invoices 
  ADD COLUMN IF NOT EXISTS investigation_reason TEXT;

-- Update status constraint to include 'needs_investigation' if needed
-- Note: Keeping existing statuses for now, can add later if needed

-- Update RLS policy for public access to respect is_public field
DROP POLICY IF EXISTS "Public can view invoices by token" ON invoices;

CREATE POLICY "Public can view invoices by token"
  ON invoices FOR SELECT
  TO anon, authenticated
  USING (
    public_token IS NOT NULL
    AND is_public = true
    AND status != 'cancelled'
  );

-- Update delete policy to allow super_admin
DROP POLICY IF EXISTS "Users can delete invoices" ON invoices;

CREATE POLICY "Users can delete invoices"
  ON invoices FOR DELETE
  TO authenticated
  USING (
    status = 'draft'
    AND (
      user_id = auth.uid()
      OR public.is_super_admin(auth.uid())
    )
  );

-- Update update policy to allow super_admin to send invoices
-- (super_admin can update draft to sent)
-- The existing policy already allows admins, but let's make sure super_admin is included
DROP POLICY IF EXISTS "Users can update invoices" ON invoices;

CREATE POLICY "Users can update invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (
    (
      status = 'draft'
      AND (
        user_id = auth.uid()
        OR public.is_admin(auth.uid())
      )
    )
    OR
    (
      -- Allow status updates for sent/pending/overdue (for mark as paid, cancel, etc.)
      status IN ('sent', 'pending', 'overdue')
      AND (
        user_id = auth.uid()
        OR public.is_super_admin(auth.uid())
      )
    )
  );

-- Add comment for documentation
COMMENT ON COLUMN invoices.is_public IS 'Controls whether invoice is accessible via public token';
COMMENT ON COLUMN invoices.pending_reason IS 'Reason why invoice is in pending status';
COMMENT ON COLUMN invoices.investigation_reason IS 'Reason why invoice needs investigation';




