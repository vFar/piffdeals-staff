# Testing Guide: Invoice Reminder Emails

This guide will help you test the reminder email functionality step by step.

## Prerequisites

Before testing, make sure you have:
- ✅ Run the SQL migration (`add-reminder-email-tracking.sql`)
- ✅ Deployed both edge functions (`mark-overdue-invoices` and `send-invoice-reminder`)
- ✅ An invoice with a valid customer email address
- ✅ Access to the customer's email inbox (or use your own email for testing)

---

## Test 1: Overdue Invoice Detection

**Purpose**: Verify that invoices are correctly marked as "kavēts" (overdue) when `due_date` has passed.

### Steps:

1. **Create or find an invoice**:
   - Status: `sent` or `pending`
   - Set `due_date` to **yesterday's date** (or any past date)
   - Make sure invoice has `customer_email` and `public_token`

2. **Manually call the function**:
   ```bash
   curl -X POST https://emqhyievrsyeinwrqqhw.supabase.co/functions/v1/mark-overdue-invoices \
     -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtcWh5aWV2cnN5ZWlud3JxcWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MzQyNzUsImV4cCI6MjA3ODUxMDI3NX0.DKd8dSWNOEF0uzOcax5Ie6dtfPVV6HcErpqDX5ExyBo" \
     -H "Content-Type: application/json"
   ```

3. **Expected Result**:
   ```json
   {
     "success": true,
     "marked_overdue": 1,
     "invoices": [{"id": "...", "invoice_number": "..."}],
     "message": "Successfully marked 1 invoice(s) as overdue"
   }
   ```

4. **Verify in UI**:
   - Go to Invoices page
   - Check that the invoice status changed to "Kavēts" (red badge)
   - The status should be updated immediately

---

## Test 2: Reminder Email (Production Mode)

**Purpose**: Verify that reminder emails are sent 3 days after `issue_date` for invoices that were sent to customers.

### Steps:

1. **Create or find an invoice**:
   - Status: `sent` or `pending`
   - Set `issue_date` to **exactly 3 days ago** (e.g., if today is December 15, set to December 12)
   - **IMPORTANT**: Invoice must have `sent_at` NOT NULL (customer was notified)
   - Make sure invoice has:
     - `customer_email`: Valid email address
     - `public_token`: Must exist
     - `last_reminder_email_sent`: NULL (no reminder sent yet)

2. **Manually call the function**:
   ```bash
   curl -X POST https://emqhyievrsyeinwrqqhw.supabase.co/functions/v1/send-invoice-reminder \
     -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtcWh5aWV2cnN5ZWlud3JxcWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MzQyNzUsImV4cCI6MjA3ODUxMDI3NX0.DKd8dSWNOEF0uzOcax5Ie6dtfPVV6HcErpqDX5ExyBo" \
     -H "Content-Type: application/json"
   ```

3. **Expected Result**:
   ```json
   {
     "success": true,
     "reminders_sent": 1,
     "errors": 0,
     "results": [{
       "invoice_id": "...",
       "invoice_number": "...",
       "customer_email": "...",
       "email_id": "..."
     }],
     "message": "Successfully sent 1 reminder email(s)"
   }
   ```

4. **Verify**:
   - Check customer's email inbox for the reminder email
   - Email subject: "Atgādinājums: Rēķins [INVOICE_NUMBER] - Apmaksas atgādinājums"
   - Email should mention "pirms 3 dienām" (3 days ago)
   - Check database: `last_reminder_email_sent` should be updated with current timestamp

---

## Test 3: Reminder Email (Test Mode)

**Purpose**: Test reminder emails with more flexible date range (2-4 days ago).

### Steps:

1. **Create or find an invoice**:
   - Status: `sent` or `pending`
   - Set `issue_date` to **2-4 days ago** (any date in this range works)
   - **IMPORTANT**: Invoice must have `sent_at` NOT NULL
   - Make sure invoice has:
     - `customer_email`: Valid email address
     - `public_token`: Must exist
     - `last_reminder_email_sent`: NULL

2. **Manually call the function with test mode**:
   ```bash
   curl -X POST "https://emqhyievrsyeinwrqqhw.supabase.co/functions/v1/send-invoice-reminder?test=true" \
     -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtcWh5aWV2cnN5ZWlud3JxcWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MzQyNzUsImV4cCI6MjA3ODUxMDI3NX0.DKd8dSWNOEF0uzOcax5Ie6dtfPVV6HcErpqDX5ExyBo" \
     -H "Content-Type: application/json"
   ```

3. **Expected Result**: Same as Test 2, but with `debug` information:
   ```json
   {
     "success": true,
     "reminders_sent": 1,
     "debug": {
       "test_mode": true,
       "today": "2024-12-15",
       "three_days_ago": "2024-12-12",
       "checked_range": "2-4 days ago"
     }
   }
   ```

---

## Test 4: Customer Not Notified (Should NOT Send Reminder)

**Purpose**: Verify that reminders are NOT sent if customer wasn't notified (`sent_at` is NULL).

### Steps:

1. **Create or find an invoice**:
   - Status: `sent` or `pending`
   - Set `issue_date` to **3 days ago**
   - **IMPORTANT**: Set `sent_at` to **NULL** (customer was NOT notified)
   - Make sure invoice has `customer_email` and `public_token`

2. **Call the function**:
   ```bash
   curl -X POST https://emqhyievrsyeinwrqqhw.supabase.co/functions/v1/send-invoice-reminder \
     -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtcWh5aWV2cnN5ZWlud3JxcWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MzQyNzUsImV4cCI6MjA3ODUxMDI3NX0.DKd8dSWNOEF0uzOcax5Ie6dtfPVV6HcErpqDX5ExyBo" \
     -H "Content-Type: application/json"
   ```

3. **Expected Result**:
   ```json
   {
     "success": true,
     "reminders_sent": 0,
     "message": "No invoices found with issue_date = 2024-12-12 that were sent to customers"
   }
   ```

4. **Verify**:
   - No email should be sent
   - `last_reminder_email_sent` should remain NULL

---

## Test 5: Manual "Mark as Notified" Feature

**Purpose**: Test the manual "Mark as Notified" action in the UI.

### Steps:

1. **Find an invoice**:
   - Status: `sent`, `pending`, or `overdue`
   - `sent_at` should be **NULL** (not marked as notified)
   - Invoice should be created by you (or you must be admin/super_admin)

2. **In the Invoices page**:
   - Look for the "Klients informēts" column
   - You should see a red X icon (❌) indicating customer is NOT notified
   - Click the three dots menu (⋮) on the invoice row
   - You should see "Atzīmēt kā nosūtīts klientam" option

3. **Click the option**:
   - A confirmation modal should appear
   - Click "Atzīmēt" to confirm

4. **Verify**:
   - The red X should change to a green checkmark (✅)
   - `sent_at` should be updated in the database
   - The invoice should now be eligible for reminder emails
   - Check Activity Logs: You should see "Rēķins atzīmēts kā nosūtīts klientam"

---

## Test 6: Duplicate Reminder Prevention

**Purpose**: Verify that reminder emails are only sent once per invoice.

### Steps:

1. **Use an invoice from Test 2** (already received a reminder):
   - `last_reminder_email_sent` should NOT be NULL
   - `issue_date` is still 3 days ago
   - `sent_at` is NOT NULL

2. **Call the function again**:
   ```bash
   curl -X POST https://emqhyievrsyeinwrqqhw.supabase.co/functions/v1/send-invoice-reminder \
     -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtcWh5aWV2cnN5ZWlud3JxcWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MzQyNzUsImV4cCI6MjA3ODUxMDI3NX0.DKd8dSWNOEF0uzOcax5Ie6dtfPVV6HcErpqDX5ExyBo" \
     -H "Content-Type: application/json"
   ```

3. **Expected Result**:
   ```json
   {
     "success": true,
     "reminders_sent": 0,
     "message": "No invoices found with issue_date = 2024-12-12 that were sent to customers"
   }
   ```

4. **Verify**:
   - No email should be sent (duplicate prevention works)
   - `last_reminder_email_sent` timestamp should remain unchanged

---

## Test 7: UI Disclaimers

**Purpose**: Verify that disclaimers appear correctly in the UI.

### Steps:

1. **In CreateInvoice page**:
   - Go to `/invoices/create`
   - Look for the customer email field
   - You should see an **info alert** below the email field:
     - "Svarīgi: Automātiskie atgādinājuma e-pasti"
     - Explains that reminders only work if invoice is sent to customer

2. **In ViewInvoice page**:
   - Open any invoice where `sent_at` is NULL
   - You should see a **warning alert**:
     - "Klients nav informēts"
     - Explains that automatic reminders won't work

3. **In Invoices list**:
   - Check the "Klients informēts" column
   - Green checkmark (✅) = customer notified
   - Red X (❌) = customer NOT notified

---

## Quick SQL Queries for Testing

### Check invoice status:
```sql
SELECT 
  invoice_number,
  status,
  issue_date,
  due_date,
  sent_at,
  last_reminder_email_sent,
  customer_email
FROM invoices
WHERE invoice_number = 'YOUR_INVOICE_NUMBER';
```

### Set invoice for testing (3 days ago, customer notified):
```sql
UPDATE invoices
SET 
  issue_date = CURRENT_DATE - INTERVAL '3 days',
  sent_at = CURRENT_TIMESTAMP,
  last_reminder_email_sent = NULL,
  status = 'sent'
WHERE invoice_number = 'YOUR_INVOICE_NUMBER';
```

### Reset reminder to test again:
```sql
UPDATE invoices
SET last_reminder_email_sent = NULL
WHERE invoice_number = 'YOUR_INVOICE_NUMBER';
```

### Check if invoice will be picked up by reminder function:
```sql
SELECT 
  invoice_number,
  issue_date,
  sent_at,
  last_reminder_email_sent,
  status,
  CASE 
    WHEN sent_at IS NULL THEN '❌ Will NOT send (customer not notified)'
    WHEN last_reminder_email_sent IS NOT NULL THEN '❌ Will NOT send (already sent)'
    WHEN issue_date = CURRENT_DATE - INTERVAL '3 days' THEN '✅ Will send (matches criteria)'
    ELSE '⏳ Will NOT send (wrong date)'
  END as reminder_status
FROM invoices
WHERE status IN ('sent', 'pending')
  AND customer_email IS NOT NULL
  AND public_token IS NOT NULL;
```

---

## Troubleshooting

### Issue: Function returns "No invoices found"

**Possible causes**:
1. `sent_at` is NULL → Invoice wasn't sent to customer
2. `issue_date` is not exactly 3 days ago (in production mode)
3. `last_reminder_email_sent` is already set (reminder already sent)
4. Invoice status is not `sent` or `pending`

**Solution**: Check the invoice with the SQL query above and verify all conditions.

### Issue: Email not received

**Possible causes**:
1. Email went to spam folder
2. Email service (Resend) not configured properly
3. Invalid email address
4. Email service rate limits

**Solution**: 
- Check spam folder
- Verify `RESEND_API_KEY` is set in Edge Function secrets
- Check Resend dashboard for email delivery status

### Issue: "Customer Notified" column shows wrong status

**Solution**: 
- Green checkmark = `sent_at IS NOT NULL`
- Red X = `sent_at IS NULL`
- Refresh the page to see updated status

---

## Success Criteria

✅ **All tests pass if**:
1. Overdue invoices are correctly marked as "kavēts"
2. Reminder emails are sent 3 days after `issue_date` for notified customers
3. Reminders are NOT sent if customer wasn't notified
4. Reminders are only sent once per invoice
5. Manual "Mark as Notified" works and updates `sent_at`
6. UI disclaimers appear correctly
7. Activity logs show "Rēķins atzīmēts kā nosūtīts klientam" action

---

## Next Steps After Testing

Once all tests pass:
1. ✅ Set up cron jobs (if not already done)
2. ✅ Monitor the first few days of automated reminders
3. ✅ Check customer feedback on reminder emails
4. ✅ Adjust reminder timing if needed (currently 3 days after `issue_date`)





