-- Step 1: Set up a test invoice for reminder email testing
-- Replace 'YOUR_INVOICE_NUMBER' with an actual invoice number from your database

-- First, find an invoice to use for testing
SELECT 
  invoice_number,
  issue_date,
  sent_at,
  status,
  customer_email
FROM invoices
WHERE status IN ('sent', 'pending')
LIMIT 5;

-- Step 2: Update the invoice to meet reminder conditions
-- Replace 'YOUR_INVOICE_NUMBER' with the invoice number you want to test
UPDATE invoices
SET 
  issue_date = CURRENT_DATE - INTERVAL '3 days',  -- 3 days ago (will trigger reminder)
  sent_at = CURRENT_TIMESTAMP - INTERVAL '3 days',  -- CRITICAL: Must be set (customer was notified)
  last_reminder_email_sent = NULL,  -- Reset to allow reminder to be sent
  status = 'sent',  -- Must be 'sent' or 'pending'
  customer_email = 'your-email@example.com',  -- YOUR EMAIL ADDRESS HERE
  public_token = COALESCE(public_token, gen_random_uuid())  -- Ensure token exists
WHERE invoice_number = 'YOUR_INVOICE_NUMBER';

-- Step 3: Verify the invoice is ready for reminder
SELECT 
  invoice_number,
  issue_date,
  CURRENT_DATE - issue_date::date as days_since_issue,
  sent_at,
  last_reminder_email_sent,
  status,
  customer_email,
  public_token IS NOT NULL as has_token,
  CASE 
    WHEN sent_at IS NULL THEN '❌ Missing: sent_at (customer not notified)'
    WHEN status NOT IN ('sent', 'pending') THEN CONCAT('❌ Wrong status: ', status)
    WHEN CURRENT_DATE - issue_date::date < 3 THEN CONCAT('⏳ Too recent: ', CURRENT_DATE - issue_date::date, ' days ago (need 3+)')
    WHEN last_reminder_email_sent IS NOT NULL THEN '❌ Already sent reminder'
    WHEN customer_email IS NULL THEN '❌ Missing: customer_email'
    WHEN public_token IS NULL THEN '❌ Missing: public_token'
    ELSE '✅ Ready to send reminder!'
  END as diagnostic
FROM invoices
WHERE invoice_number = 'YOUR_INVOICE_NUMBER';





