# Due Date Fix and Reminder Email Feature

## Summary

This document describes the fixes and new functionality added for invoice due dates and reminder emails.

## Changes Made

### 1. Fixed Overdue Invoice Detection

**File**: `supabase/functions/mark-overdue-invoices/index.ts`

**Problem**: The function was in TESTING MODE and checked if `due_date` was more than 10 seconds in the past, which prevented proper overdue detection.

**Solution**: 
- Removed TESTING MODE logic
- Changed to properly check if `due_date < CURRENT_DATE` (today)
- Now correctly marks invoices as "kavēts" (overdue) when the due date has passed

**How it works**:
- Queries invoices with status `sent` or `pending`
- Filters where `due_date < today` (using SQL `.lt('due_date', todayStr)`)
- Updates status to `overdue` for matching invoices

### 2. Added Reminder Email Tracking Column

**File**: `add-reminder-email-tracking.sql`

**Purpose**: Track when reminder emails have been sent to prevent duplicate emails.

**Changes**:
- Added `last_reminder_email_sent` column to `invoices` table
- Added index for efficient queries
- Column stores timestamp when reminder email was sent

**To apply**:
```sql
-- Run this SQL in your Supabase SQL editor
\i add-reminder-email-tracking.sql
```

### 3. Created Reminder Email Function

**File**: `supabase/functions/send-invoice-reminder/index.ts`

**Purpose**: Automatically send reminder emails to customers 36 hours before invoice due date.

**Features**:
- Finds invoices that are 36 hours (or less) away from `due_date`
- Only sends to invoices with status `sent` or `pending`
- Only sends if reminder hasn't been sent yet (`last_reminder_email_sent` is null)
- Sends professional reminder email in Latvian
- Updates `last_reminder_email_sent` timestamp after sending

**Email Content**:
- Friendly reminder message
- Warning box highlighting the approaching due date
- Invoice details (number, total, due date)
- Direct link to view and pay invoice
- Professional Piffdeals branding

**How it works**:
1. Calculates current time + 36 hours
2. Finds invoices where `due_date` is between now and 36 hours from now
3. Filters out invoices that already received reminder emails
4. Sends reminder email to each customer
5. Updates `last_reminder_email_sent` timestamp

## Deployment Instructions

### Step 1: Apply Database Migration

Run the SQL migration to add the reminder email tracking column:

```sql
-- In Supabase SQL Editor
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS last_reminder_email_sent TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_invoices_last_reminder_email_sent 
ON invoices(last_reminder_email_sent);
```

### Step 2: Deploy Edge Functions

Deploy the updated and new edge functions:

```bash
# Deploy the fixed mark-overdue-invoices function
supabase functions deploy mark-overdue-invoices

# Deploy the new send-invoice-reminder function
supabase functions deploy send-invoice-reminder
```

### Step 3: Set Up Cron Jobs

Set up cron jobs to run these functions automatically:

#### For Overdue Detection (Daily)
- **Function**: `mark-overdue-invoices`
- **Schedule**: Daily at 2:00 AM UTC (or your preferred time)
- **Purpose**: Mark invoices as overdue when due_date has passed

#### For Reminder Emails (Daily)
- **Function**: `send-invoice-reminder`
- **Schedule**: Daily (e.g., `0 9 * * *` - daily at 9 AM UTC)
- **Purpose**: Send reminder emails for invoices due TOMORROW
- **Note**: Since `due_date` is a DATE column (not TIMESTAMP), we send reminders when `due_date = CURRENT_DATE + 1` (tomorrow). This gives approximately 24-48 hours notice, which includes the 36-hour window.

**Example cron setup in Supabase Dashboard**:

**Note**: pg_cron requires SQL - you cannot select functions directly. You need to use SQL with `net.http_post` or `pg_net.http_post`.

**Get your Anon Key**:
1. Go to Project Settings → API
2. Copy your "anon" or "public" key

**Create Cron Jobs**:
1. Go to Database → Cron Jobs
2. Click "New Cron Job"

**For `mark-overdue-invoices` (Daily at 2 AM)**:
- **Name**: `mark_overdue_invoices_daily`
- **Schedule**: `0 2 * * *` (daily at 2 AM UTC)
- **SQL Command**:
```sql
SELECT net.http_post(
  url := 'https://emqhyievrsyeinwrqqhw.supabase.co/functions/v1/mark-overdue-invoices',
  headers := jsonb_build_object(
    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtcWh5aWV2cnN5ZWlud3JxcWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MzQyNzUsImV4cCI6MjA3ODUxMDI3NX0.DKd8dSWNOEF0uzOcax5Ie6dtfPVV6HcErpqDX5ExyBo',
    'Content-Type', 'application/json'
  )
);
```

**For `send-invoice-reminder` (Daily)**:
- **Name**: `send_invoice_reminder_daily`
- **Schedule**: `0 9 * * *` (daily at 9 AM UTC - adjust to your preferred time)
- **SQL Command**:
```sql
SELECT net.http_post(
  url := 'https://emqhyievrsyeinwrqqhw.supabase.co/functions/v1/send-invoice-reminder',
  headers := jsonb_build_object(
    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtcWh5aWV2cnN5ZWlud3JxcWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MzQyNzUsImV4cCI6MjA3ODUxMDI3NX0.DKd8dSWNOEF0uzOcax5Ie6dtfPVV6HcErpqDX5ExyBo',
    'Content-Type', 'application/json'
  )
);
```

**Important**: Replace `YOUR_ANON_KEY_HERE` with your actual anon key from Project Settings → API.

### Step 4: Test the Functions

#### Test Overdue Detection:
1. Create or find an invoice with status `sent` or `pending`
2. Set `due_date` to yesterday's date
3. Manually call the `mark-overdue-invoices` function
4. Verify the invoice status changes to `overdue`

#### Test Reminder Emails:

**Option 1: Test Mode (Recommended for Testing)**
1. Create or find an invoice with:
   - Status: `sent` or `pending`
   - `due_date`: Set to **today** or **tomorrow** (for testing)
   - `customer_email`: Valid email address
   - `public_token`: Must exist
   - `last_reminder_email_sent`: NULL (or set to NULL to test again)
2. Call the function with test mode:
   ```bash
   curl -X POST "https://emqhyievrsyeinwrqqhw.supabase.co/functions/v1/send-invoice-reminder?test=true" \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json"
   ```
3. Verify:
   - Email is sent to customer
   - `last_reminder_email_sent` is updated
   - No duplicate emails are sent if function is called again (unless you reset `last_reminder_email_sent` to NULL)

**Option 2: Production Mode (Normal Operation)**
1. Create or find an invoice with:
   - Status: `sent` or `pending`
   - `due_date`: Set to **tomorrow** (exactly)
   - `customer_email`: Valid email address
   - `public_token`: Must exist
   - `last_reminder_email_sent`: NULL
2. Call the function normally (without `?test=true`)
3. Verify email is sent

**Note**: Test mode checks for invoices due **today OR tomorrow**. Production mode only checks for invoices due **tomorrow**.

## Testing

### Manual Testing

#### Test Overdue Detection:
```bash
# Using curl
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/mark-overdue-invoices \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

#### Test Reminder Emails:
```bash
# Test mode (checks invoices due today OR tomorrow)
curl -X POST "https://emqhyievrsyeinwrqqhw.supabase.co/functions/v1/send-invoice-reminder?test=true" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"

# Production mode (only checks invoices due tomorrow)
curl -X POST https://emqhyievrsyeinwrqqhw.supabase.co/functions/v1/send-invoice-reminder \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### Expected Results

**Overdue Detection**:
- Returns JSON with `marked_overdue` count
- Invoices with `due_date < today` are marked as `overdue`
- Status changes from `sent`/`pending` to `overdue`

**Reminder Emails**:
- Returns JSON with `reminders_sent` count
- Emails are sent to customers
- `last_reminder_email_sent` is updated
- No duplicate emails are sent

## Notes

- The reminder email function checks if `due_date` is within 36 hours from now
- It will send reminders for any invoice where `due_date` is between now and 36 hours from now
- Since the function runs hourly, it will catch invoices at the right time
- Each invoice will only receive one reminder email (tracked by `last_reminder_email_sent`)
- The reminder email includes a warning about the approaching due date and emphasizes the need for payment to process shipment

## Environment Variables Required

Both functions require these environment variables (set in Supabase Edge Function secrets):
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin access
- `RESEND_API_KEY` - Resend API key for sending emails
- `FROM_EMAIL` - Email address to send from
- `COMPANY_NAME` - Company name (defaults to "Piffdeals")
- `PUBLIC_SITE_URL` - Public URL of your site (defaults to "https://staff.piffdeals.lv")

