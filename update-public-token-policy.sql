-- ============================================
-- Update Public Token RLS Policy
-- Allow viewing draft invoices with public_token for preview
-- ============================================

-- Drop the existing policy
DROP POLICY IF EXISTS "Public can view invoices by token" ON invoices;
DROP POLICY IF EXISTS "Public can view invoice items by token" ON invoice_items;

-- Recreate policy to allow viewing all invoices with public_token (except cancelled)
CREATE POLICY "Public can view invoices by token"
  ON invoices FOR SELECT
  TO anon, authenticated
  USING (
    public_token IS NOT NULL
    AND status != 'cancelled'
  );

-- Recreate policy for invoice items
CREATE POLICY "Public can view invoice items by token"
  ON invoice_items FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.public_token IS NOT NULL
      AND invoices.status != 'cancelled'
    )
  );

-- ============================================
-- NOTES:
-- ============================================
-- This update allows:
-- 1. Draft invoices with public_token to be viewed publicly (for preview)
-- 2. All invoice statuses except 'cancelled' to be viewable via public_token
--
-- This change supports the new flow where:
-- - public_token is generated automatically when invoice is created
-- - Users can preview invoices immediately after creation
-- - Draft invoices can be previewed before sending
-- ============================================





