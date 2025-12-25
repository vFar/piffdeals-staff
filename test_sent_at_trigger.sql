-- ========================================
-- TEST CASE 421: sent_at Trigger Testing
-- ========================================
-- This script comprehensively tests for triggers on the sent_at column

-- ========================================
-- PART 1: CHECK IF TRIGGER EXISTS
-- ========================================

-- 1.1: List ALL triggers on invoices table
SELECT 
  '=== ALL TRIGGERS ON INVOICES TABLE ===' AS section;

SELECT 
  t.tgname AS trigger_name,
  CASE t.tgenabled
    WHEN 'O' THEN 'Enabled'
    WHEN 'D' THEN 'Disabled'
    WHEN 'R' THEN 'Replica'
    WHEN 'A' THEN 'Always'
    ELSE 'Unknown'
  END AS status,
  CASE 
    WHEN t.tgtype & 1 = 1 THEN 'ROW'
    ELSE 'STATEMENT'
  END AS level,
  CASE 
    WHEN t.tgtype & 2 = 2 THEN 'BEFORE'
    WHEN t.tgtype & 64 = 64 THEN 'INSTEAD OF'
    ELSE 'AFTER'
  END AS timing,
  CASE 
    WHEN t.tgtype & 4 = 4 THEN 'INSERT '
    ELSE ''
  END ||
  CASE 
    WHEN t.tgtype & 8 = 8 THEN 'DELETE '
    ELSE ''
  END ||
  CASE 
    WHEN t.tgtype & 16 = 16 THEN 'UPDATE '
    ELSE ''
  END AS events,
  p.proname AS function_name,
  pg_get_triggerdef(t.oid) AS full_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'invoices'
  AND NOT t.tgisinternal -- Exclude internal triggers
ORDER BY t.tgname;

-- 1.2: Check specifically for UPDATE triggers
SELECT 
  '=== UPDATE TRIGGERS ONLY ===' AS section;

SELECT 
  t.tgname AS trigger_name,
  p.proname AS function_name,
  pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'invoices'
  AND t.tgtype & 16 = 16 -- UPDATE trigger
  AND NOT t.tgisinternal;

-- 1.3: Check for column-specific triggers on sent_at
SELECT 
  '=== COLUMN-SPECIFIC TRIGGERS (sent_at) ===' AS section;

SELECT 
  t.tgname AS trigger_name,
  pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'invoices'
  AND pg_get_triggerdef(t.oid) ILIKE '%sent_at%'
  AND NOT t.tgisinternal;

-- ========================================
-- PART 2: CHECK TRIGGER FUNCTIONS
-- ========================================

-- 2.1: Find all functions that reference sent_at
SELECT 
  '=== FUNCTIONS REFERENCING sent_at ===' AS section;

SELECT 
  p.proname AS function_name,
  n.nspname AS schema_name,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND pg_get_functiondef(p.oid) ILIKE '%sent_at%'
ORDER BY p.proname;

-- 2.2: Find functions with 'trigger' in the name
SELECT 
  '=== TRIGGER FUNCTIONS ===' AS section;

SELECT 
  p.proname AS function_name,
  p.prorettype::regtype AS return_type,
  CASE 
    WHEN p.prorettype = 'trigger'::regtype THEN 'Yes'
    ELSE 'No'
  END AS is_trigger_function,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
    p.proname ILIKE '%trigger%'
    OR p.proname ILIKE '%invoice%'
    OR p.prorettype = 'trigger'::regtype
  )
ORDER BY p.proname;

-- ========================================
-- PART 3: CHECK INVOICES TABLE STRUCTURE
-- ========================================

-- 3.1: Verify sent_at column exists and check its properties
SELECT 
  '=== sent_at COLUMN DETAILS ===' AS section;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'invoices'
  AND column_name = 'sent_at';

-- 3.2: Check for indexes on sent_at
SELECT 
  '=== INDEXES ON sent_at ===' AS section;

SELECT 
  i.relname AS index_name,
  a.attname AS column_name,
  ix.indisunique AS is_unique,
  ix.indisprimary AS is_primary,
  pg_get_indexdef(i.oid) AS index_definition
FROM pg_class t
JOIN pg_index ix ON t.oid = ix.indrelid
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
WHERE t.relname = 'invoices'
  AND a.attname = 'sent_at';

-- ========================================
-- PART 4: CHECK RELATED TABLES
-- ========================================

-- 4.1: Check if activity_logs table exists and tracks sent_at changes
SELECT 
  '=== ACTIVITY LOGS TABLE CHECK ===' AS section;

SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'activity_logs'
  AND column_name IN ('action', 'table_name', 'record_id', 'changes', 'created_at')
ORDER BY ordinal_position;

-- 4.2: Check recent activity logs for sent_at changes
SELECT 
  '=== RECENT sent_at ACTIVITY LOGS ===' AS section;

SELECT 
  id,
  action,
  table_name,
  record_id,
  changes,
  created_at
FROM activity_logs
WHERE table_name = 'invoices'
  AND (
    changes::text ILIKE '%sent_at%'
    OR action ILIKE '%sent%'
  )
ORDER BY created_at DESC
LIMIT 10;

-- ========================================
-- PART 5: LIVE TESTING
-- ========================================

-- 5.1: Find a test invoice (draft status preferred)
SELECT 
  '=== TEST INVOICE CANDIDATES ===' AS section;

SELECT 
  id,
  invoice_number,
  status,
  sent_at,
  created_at
FROM invoices
WHERE status IN ('draft', 'sent')
ORDER BY created_at DESC
LIMIT 5;

-- ========================================
-- PART 6: CREATE TEST TRIGGER (TEMPORARY)
-- ========================================

-- 6.1: Create a test function to detect sent_at changes
CREATE OR REPLACE FUNCTION test_sent_at_change_detector()
RETURNS TRIGGER AS $$
BEGIN
  -- Log to PostgreSQL server log
  RAISE NOTICE 'TRIGGER FIRED: sent_at changed on invoice %', NEW.invoice_number;
  RAISE NOTICE '  Old sent_at: %', OLD.sent_at;
  RAISE NOTICE '  New sent_at: %', NEW.sent_at;
  RAISE NOTICE '  Old status: %', OLD.status;
  RAISE NOTICE '  New status: %', NEW.status;
  
  -- Insert into a test log table (if it exists)
  -- Uncomment if you want to create a persistent log
  /*
  INSERT INTO test_trigger_log (
    trigger_name,
    invoice_id,
    invoice_number,
    old_sent_at,
    new_sent_at,
    old_status,
    new_status,
    triggered_at
  ) VALUES (
    'test_sent_at_change_detector',
    NEW.id,
    NEW.invoice_number,
    OLD.sent_at,
    NEW.sent_at,
    OLD.status,
    NEW.status,
    NOW()
  );
  */
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6.2: Attach the test trigger to invoices table
DROP TRIGGER IF EXISTS test_sent_at_update_trigger ON invoices;

CREATE TRIGGER test_sent_at_update_trigger
AFTER UPDATE OF sent_at ON invoices
FOR EACH ROW
WHEN (OLD.sent_at IS DISTINCT FROM NEW.sent_at)
EXECUTE FUNCTION test_sent_at_change_detector();

SELECT '=== TEST TRIGGER CREATED ===' AS section;
SELECT 'Test trigger "test_sent_at_update_trigger" has been created.' AS message;
SELECT 'It will fire when sent_at changes and log to PostgreSQL server logs.' AS info;

-- ========================================
-- PART 7: PERFORM TEST UPDATE
-- ========================================

-- 7.1: Instructions for manual testing
SELECT 
  '=== MANUAL TEST INSTRUCTIONS ===' AS section;

SELECT 'Step 1: Find a test invoice from the results above' AS step;
SELECT 'Step 2: Run the UPDATE command below with a real invoice_number' AS step;
SELECT 'Step 3: Check PostgreSQL logs for NOTICE messages' AS step;
SELECT 'Step 4: Check if any other triggers fired' AS step;

-- 7.2: Test UPDATE command (REPLACE 'TEST-001' with actual invoice number)
-- UNCOMMENT AND MODIFY THIS WHEN READY TO TEST:
/*
UPDATE invoices 
SET sent_at = NOW()
WHERE invoice_number = 'TEST-001' -- REPLACE WITH REAL INVOICE NUMBER
RETURNING 
  id,
  invoice_number,
  status,
  sent_at,
  'Update successful - check logs for trigger output' AS message;
*/

-- ========================================
-- PART 8: CHECK IF TEST TRIGGER FIRED
-- ========================================

-- 8.1: Verify test trigger exists
SELECT 
  '=== VERIFY TEST TRIGGER EXISTS ===' AS section;

SELECT 
  t.tgname AS trigger_name,
  p.proname AS function_name,
  CASE t.tgenabled
    WHEN 'O' THEN 'Enabled'
    ELSE 'Disabled'
  END AS status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'invoices'
  AND t.tgname = 'test_sent_at_update_trigger';

-- ========================================
-- PART 9: CLEANUP (RUN AFTER TESTING)
-- ========================================

-- 9.1: Remove test trigger and function
-- UNCOMMENT WHEN DONE TESTING:
/*
DROP TRIGGER IF EXISTS test_sent_at_update_trigger ON invoices;
DROP FUNCTION IF EXISTS test_sent_at_change_detector();

SELECT '=== TEST TRIGGER CLEANED UP ===' AS section;
SELECT 'Test trigger and function have been removed.' AS message;
*/

-- ========================================
-- PART 10: SUMMARY REPORT
-- ========================================

SELECT 
  '=== SUMMARY REPORT ===' AS section;

SELECT 
  'Total triggers on invoices table' AS metric,
  COUNT(*)::text AS value
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'invoices'
  AND NOT t.tgisinternal;

SELECT 
  'Triggers that fire on UPDATE' AS metric,
  COUNT(*)::text AS value
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'invoices'
  AND t.tgtype & 16 = 16
  AND NOT t.tgisinternal;

SELECT 
  'Triggers mentioning sent_at' AS metric,
  COUNT(*)::text AS value
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'invoices'
  AND pg_get_triggerdef(t.oid) ILIKE '%sent_at%'
  AND NOT t.tgisinternal;

SELECT 
  'Functions referencing sent_at' AS metric,
  COUNT(*)::text AS value
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND pg_get_functiondef(p.oid) ILIKE '%sent_at%';

-- ========================================
-- END OF TEST SCRIPT
-- ========================================

SELECT 
  '=== TEST SCRIPT COMPLETE ===' AS section;
SELECT 'Review the results above to determine if sent_at triggers exist.' AS message;
SELECT 'If no production triggers found, the test trigger will help verify behavior.' AS note;




