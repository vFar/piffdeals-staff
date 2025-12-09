# Testing Reminder Email Fix

## What Was Fixed

The reminder function was checking for `issue_date = exactly 3 days ago`, but it should check for `issue_date <= 3 days ago` (3 or more days have passed).

**Before**: Only sent reminders if invoice was created exactly 3 days ago  
**After**: Sends reminders if invoice was created 3+ days ago

## Test Scenario

**Your Example**:
- Today: December 11th, 2025
- Invoice created: December 8th, 2025
- Days passed: 3 days
- Expected: Reminder should be sent ✅

## Step-by-Step Testing

### 1. Prepare Test Invoice

Run this SQL to create/update a test invoice:

```sql
-- Update an existing invoice OR create test data
UPDATE invoices
SET 
  issue_date = '2025-12-08',  -- 3 days ago (if today is Dec 11)
  sent_at = CURRENT_TIMESTAMP,  -- CRITICAL: Must be set (customer was notified)
  last_reminder_email_sent = NULL,  -- No reminder sent yet
  status = 'sent',  -- Must be 'sent' or 'pending'
  customer_email = 'your-test-email@example.com',  -- Your email for testing
  public_token = COALESCE(public_token, gen_random_uuid())  -- Ensure token exists
WHERE invoice_number = 'YOUR_INVOICE_NUMBER';

-- Verify the invoice is ready
SELECT 
  invoice_number,
  issue_date,
  sent_at,
  last_reminder_email_sent,
  status,
  customer_email,
  public_token,
  CASE 
    WHEN sent_at IS NULL THEN '❌ Will NOT send (customer not notified)'
    WHEN last_reminder_email_sent IS NOT NULL THEN '❌ Will NOT send (already sent)'
    WHEN status NOT IN ('sent', 'pending') THEN '❌ Will NOT send (wrong status)'
    WHEN issue_date <= CURRENT_DATE - INTERVAL '3 days' THEN '✅ Will send (3+ days passed)'
    ELSE '⏳ Will NOT send (less than 3 days)'
  END as reminder_status
FROM invoices
WHERE invoice_number = 'YOUR_INVOICE_NUMBER';
```

### 2. Test with Test Mode (Recommended)

Use test mode which checks for invoices 1-5 days ago (more flexible):

**For PowerShell (Windows)**:
```powershell
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtcWh5aWV2cnN5ZWlud3JxcWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MzQyNzUsImV4cCI6MjA3ODUxMDI3NX0.DKd8dSWNOEF0uzOcax5Ie6dtfPVV6HcErpqDX5ExyBo"
    "Content-Type" = "application/json"
}
$response = Invoke-WebRequest -Uri "https://emqhyievrsyeinwrqqhw.supabase.co/functions/v1/send-invoice-reminder?test=true" -Method POST -Headers $headers
$response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

**For Bash/Linux/Mac**:
```bash
curl -X POST "https://emqhyievrsyeinwrqqhw.supabase.co/functions/v1/send-invoice-reminder?test=true" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtcWh5aWV2cnN5ZWlud3JxcWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MzQyNzUsImV4cCI6MjA3ODUxMDI3NX0.DKd8dSWNOEF0uzOcax5Ie6dtfPVV6HcErpqDX5ExyBo" \
  -H "Content-Type: application/json"
```

**Expected Response** (if invoice found):
```json
{
  "success": true,
  "reminders_sent": 1,
  "debug": {
    "test_mode": true,
    "today": "2025-12-11",
    "three_days_ago": "2025-12-08",
    "checked_range": "1-5 days ago"
  }
}
```

### 3. Test Production Mode

Test the actual production logic (checks for 3+ days ago):

**For PowerShell (Windows)**:
```powershell
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtcWh5aWV2cnN5ZWlud3JxcWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MzQyNzUsImV4cCI6MjA3ODUxMDI3NX0.DKd8dSWNOEF0uzOcax5Ie6dtfPVV6HcErpqDX5ExyBo"
    "Content-Type" = "application/json"
}
$response = Invoke-WebRequest -Uri "https://emqhyievrsyeinwrqqhw.supabase.co/functions/v1/send-invoice-reminder" -Method POST -Headers $headers
$response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

**For Bash/Linux/Mac**:
```bash
curl -X POST "https://emqhyievrsyeinwrqqhw.supabase.co/functions/v1/send-invoice-reminder" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtcWh5aWV2cnN5ZWlud3JxcWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MzQyNzUsImV4cCI6MjA3ODUxMDI3NX0.DKd8dSWNOEF0uzOcax5Ie6dtfPVV6HcErpqDX5ExyBo" \
  -H "Content-Type: application/json"
```

**Expected Response** (if invoice found):
```json
{
  "success": true,
  "reminders_sent": 1,
  "debug": {
    "test_mode": false,
    "today": "2025-12-11",
    "three_days_ago": "2025-12-08",
    "checked_condition": "issue_date <= 2025-12-08"
  }
}
```

## Common Issues & Solutions

### Issue: "No invoices found"

**Check these conditions**:

1. ✅ `sent_at IS NOT NULL` - Customer must have been notified
   ```sql
   SELECT sent_at FROM invoices WHERE invoice_number = 'YOUR_INVOICE_NUMBER';
   -- Must NOT be NULL
   ```

2. ✅ `status IN ('sent', 'pending')` - Not draft, paid, cancelled, or overdue
   ```sql
   SELECT status FROM invoices WHERE invoice_number = 'YOUR_INVOICE_NUMBER';
   -- Must be 'sent' or 'pending'
   ```

3. ✅ `issue_date <= 3 days ago` - 3 or more days have passed
   ```sql
   SELECT 
     issue_date,
     CURRENT_DATE - issue_date as days_passed
   FROM invoices 
   WHERE invoice_number = 'YOUR_INVOICE_NUMBER';
   -- days_passed must be >= 3
   ```

4. ✅ `last_reminder_email_sent IS NULL` - No reminder sent yet
   ```sql
   SELECT last_reminder_email_sent FROM invoices WHERE invoice_number = 'YOUR_INVOICE_NUMBER';
   -- Must be NULL
   ```

5. ✅ `customer_email IS NOT NULL` - Email address exists
6. ✅ `public_token IS NOT NULL` - Public token exists

### Quick Diagnostic Query

Run this to see why an invoice might not be picked up:

```sql
SELECT 
  invoice_number,
  issue_date,
  CURRENT_DATE - issue_date::date as days_since_issue,
  sent_at,
  last_reminder_email_sent,
  status,
  customer_email,
  public_token,
  CASE 
    WHEN sent_at IS NULL THEN '❌ Missing: sent_at (customer not notified)'
    WHEN status NOT IN ('sent', 'pending') THEN CONCAT('❌ Wrong status: ', status)
    WHEN issue_date > CURRENT_DATE - INTERVAL '3 days' THEN CONCAT('⏳ Too recent: ', CURRENT_DATE - issue_date::date, ' days ago (need 3+)')
    WHEN last_reminder_email_sent IS NOT NULL THEN '❌ Already sent reminder'
    WHEN customer_email IS NULL THEN '❌ Missing: customer_email'
    WHEN public_token IS NULL THEN '❌ Missing: public_token'
    ELSE '✅ Should be picked up!'
  END as diagnostic
FROM invoices
WHERE invoice_number = 'YOUR_INVOICE_NUMBER';
```

## Example Test Data Setup

```sql
-- Create a test invoice that will trigger reminder
UPDATE invoices
SET 
  issue_date = CURRENT_DATE - INTERVAL '3 days',  -- Exactly 3 days ago
  sent_at = CURRENT_TIMESTAMP - INTERVAL '3 days',  -- Sent 3 days ago
  last_reminder_email_sent = NULL,
  status = 'sent',
  customer_email = 'test@example.com',
  public_token = COALESCE(public_token, gen_random_uuid())
WHERE invoice_number = 'YOUR_INVOICE_NUMBER';

-- Or create a new test invoice
INSERT INTO invoices (
  invoice_number,
  customer_name,
  customer_email,
  issue_date,
  due_date,
  status,
  sent_at,
  user_id,
  total,
  public_token
) VALUES (
  'TEST-REMINDER-001',
  'Test Customer',
  'test@example.com',
  CURRENT_DATE - INTERVAL '3 days',  -- 3 days ago
  CURRENT_DATE + INTERVAL '2 days',  -- Due in 2 days
  'sent',
  CURRENT_TIMESTAMP - INTERVAL '3 days',  -- Sent 3 days ago
  (SELECT id FROM user_profiles LIMIT 1),  -- Use first user
  100.00,
  gen_random_uuid()
);
```

## What Changed in the Code

1. **Production Mode**: Changed from `eq('issue_date', threeDaysAgoStr)` to `lte('issue_date', threeDaysAgoStr)`
   - Now checks for `issue_date <= 3 days ago` instead of `issue_date = exactly 3 days ago`
   - This means if 3, 4, 5, or more days have passed, reminder will be sent

2. **Test Mode**: Expanded range from 2-4 days to 1-5 days ago
   - More flexible for testing
   - Easier to find test invoices

## Expected Behavior

- **December 8th**: Invoice created
- **December 9th** (1 day): No reminder (too soon)
- **December 10th** (2 days): No reminder (too soon)
- **December 11th** (3 days): ✅ **Reminder sent**
- **December 12th** (4 days): ✅ Reminder sent (if not sent yet)
- **December 13th** (5 days): Invoice becomes overdue, but reminder still works if not sent

## After Testing

Once reminder is sent, `last_reminder_email_sent` will be set, preventing duplicate reminders:

```sql
SELECT last_reminder_email_sent 
FROM invoices 
WHERE invoice_number = 'YOUR_INVOICE_NUMBER';
-- Should show timestamp when reminder was sent
```

