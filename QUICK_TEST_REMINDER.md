# Quick Guide: Test Reminder Email

## Step 1: Set Up Test Invoice in Supabase SQL Editor

Run this SQL (replace `YOUR_INVOICE_NUMBER` and `your-email@example.com`):

```sql
-- Update an invoice to trigger reminder
UPDATE invoices
SET 
  issue_date = CURRENT_DATE - INTERVAL '3 days',  -- 3 days ago
  sent_at = CURRENT_TIMESTAMP - INTERVAL '3 days',  -- CRITICAL: Must be set!
  last_reminder_email_sent = NULL,  -- Reset to allow sending
  status = 'sent',
  customer_email = 'your-email@example.com',  -- YOUR EMAIL HERE
  public_token = COALESCE(public_token, gen_random_uuid())
WHERE invoice_number = 'YOUR_INVOICE_NUMBER';

-- Verify it's ready
SELECT 
  invoice_number,
  issue_date,
  CURRENT_DATE - issue_date::date as days_passed,
  sent_at,
  status,
  customer_email,
  CASE 
    WHEN sent_at IS NULL THEN '❌ Missing sent_at'
    WHEN status NOT IN ('sent', 'pending') THEN '❌ Wrong status'
    WHEN CURRENT_DATE - issue_date::date < 3 THEN '⏳ Less than 3 days'
    ELSE '✅ Ready!'
  END as status_check
FROM invoices
WHERE invoice_number = 'YOUR_INVOICE_NUMBER';
```

## Step 2: Run PowerShell Script

**Option A: Run the script file**
```powershell
.\test-reminder-powershell.ps1
```

**Option B: Copy-paste this command**
```powershell
$headers = @{"Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtcWh5aWV2cnN5ZWlud3JxcWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MzQyNzUsImV4cCI6MjA3ODUxMDI3NX0.DKd8dSWNOEF0uzOcax5Ie6dtfPVV6HcErpqDX5ExyBo"; "Content-Type" = "application/json"}; $response = Invoke-WebRequest -Uri "https://emqhyievrsyeinwrqqhw.supabase.co/functions/v1/send-invoice-reminder?test=true" -Method POST -Headers $headers; $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

## Step 3: Check Your Email

If successful, you should see:
```json
{
  "success": true,
  "reminders_sent": 1,
  "message": "Successfully sent 1 reminder email(s)"
}
```

Check your inbox (and spam folder) for the reminder email!

## Troubleshooting

If `reminders_sent: 0`, check:
1. ✅ `sent_at` is NOT NULL
2. ✅ `status` is 'sent' or 'pending'
3. ✅ `issue_date` is 1-5 days ago (test mode) or 3+ days ago (production)
4. ✅ `last_reminder_email_sent` is NULL
5. ✅ `customer_email` is your email address





