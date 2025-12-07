# Testing Overdue Invoices (10 Second Threshold)

## Overview
The overdue invoice function has been modified for testing to use a **10-second threshold** instead of checking if the date has passed.

## How It Works
- An invoice becomes overdue if its `due_date` (at midnight UTC) is more than **10 seconds** in the past
- Only invoices with status `sent` or `pending` can become overdue
- The function must be **manually called** or run via cron job

## Setting Due Date in Supabase for Testing

### Option 1: Set Due Date to Yesterday (Recommended)
1. Go to Supabase Dashboard → Table Editor → `invoices` table
2. Find your invoice (make sure status is `sent` or `pending`)
3. Edit the `due_date` column
4. Set it to **yesterday's date** (e.g., if today is 2024-01-15, set it to 2024-01-14)
5. Format: `YYYY-MM-DD` (e.g., `2024-01-14`)

### Option 2: Set Due Date to Today
1. Set `due_date` to **today's date** (e.g., `2024-01-15`)
2. The invoice will become overdue **10 seconds after midnight UTC** of that date
3. This means you need to wait until after midnight UTC for it to work

### Option 3: Set Due Date 15 Seconds in the Past (For Immediate Testing)
Since `due_date` is a DATE column (not TIMESTAMP), you can't set it to a specific second. However:
1. Set `due_date` to **today's date** or **yesterday's date**
2. The function checks if the due_date (at midnight) is more than 10 seconds ago
3. If you set it to yesterday, it will be overdue immediately when you call the function

## Important Notes

### Why Your Invoice Didn't Become Overdue
If you edited the `due_date` but the invoice didn't become overdue, check:

1. **Status must be `sent` or `pending`**
   - Draft invoices won't become overdue
   - Paid or cancelled invoices won't become overdue
   - Change status to `sent` or `pending` first

2. **Function must be called**
   - The function doesn't run automatically when you edit the date
   - You need to manually invoke the edge function
   - Or wait for the cron job (if configured)

3. **Due date must be in the past**
   - Set `due_date` to today or yesterday
   - The function checks if due_date (at midnight UTC) is more than 10 seconds ago

## How to Call the Function Manually

### Method 1: Supabase Dashboard
1. Go to Supabase Dashboard → Edge Functions
2. Find `mark-overdue-invoices`
3. Click "Invoke" or "Test"
4. Check the response for how many invoices were marked overdue

### Method 2: Using curl (from terminal)
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/mark-overdue-invoices \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### Method 3: From Frontend (if you add a test button)
You can add a test button in your admin panel to call this function.

## Testing Steps

1. **Create or find an invoice**
   - Status: `sent` or `pending`
   - Has a `due_date` set

2. **Set the due_date**
   - Go to Supabase → Table Editor → `invoices`
   - Edit the invoice row
   - Set `due_date` to yesterday's date (e.g., `2024-01-14`)
   - Save

3. **Call the function**
   - Go to Supabase Dashboard → Edge Functions → `mark-overdue-invoices`
   - Click "Invoke"
   - Check the response

4. **Verify**
   - Go back to the `invoices` table
   - Check that the invoice status changed to `overdue`

## Example SQL Query for Testing

You can also test directly in Supabase SQL Editor:

```sql
-- Set an invoice's due_date to yesterday (for immediate testing)
UPDATE invoices 
SET due_date = CURRENT_DATE - INTERVAL '1 day'
WHERE invoice_number = 'INV-001'  -- Replace with your invoice number
AND status IN ('sent', 'pending');

-- Then call the edge function to mark it as overdue
```

## Reverting to Production Mode

When done testing, change the threshold back to checking if date has passed:

In `supabase/functions/mark-overdue-invoices/index.ts`:
- Change the threshold from `10 * 1000` (10 seconds) back to checking if `due_date < CURRENT_DATE`
- Or restore the original logic that compares dates


