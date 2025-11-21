-- ============================================
-- TEST DELETE POLICY
-- Verify that the delete policy is correctly set up
-- ============================================

-- Check if the policy exists
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'invoices' 
    AND policyname = 'Users can delete invoices';

-- Check current policy definition
-- Should show: status = 'draft' AND (user_id = auth.uid() OR public.is_super_admin(auth.uid()))





