# Auto-Delete Old Draft Invoices - Setup Guide

## Overview

This Edge Function automatically deletes draft invoices that are older than 3 days. This helps keep the database clean and reminds users to complete or send their draft invoices.

## Why Auto-Delete Drafts?

- **Database Hygiene**: Prevents accumulation of abandoned draft invoices
- **User Discipline**: Encourages users to complete invoices promptly
- **Performance**: Reduces unnecessary database records
- **Business Logic**: Draft invoices older than 3 days are likely abandoned or forgotten

## How It Works

1. **Cron Job**: Runs daily at 2:00 AM UTC (configurable)
2. **Check Date**: Finds all invoices with status `draft` older than 3 days
3. **Delete Items**: First deletes associated `invoice_items` (foreign key constraint)
4. **Delete Invoices**: Then deletes the draft invoices themselves
5. **Log Results**: Returns summary of deleted invoices

## Deployment

### Step 1: Deploy the Edge Function

**Windows (PowerShell):**
```powershell
.\deploy-delete-drafts.ps1
```

**Linux/Mac (Bash):**
```bash
chmod +x deploy-delete-drafts.sh
./deploy-delete-drafts.sh
```

### Step 2: Enable pg_cron Extension

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Database** → **Extensions**
4. Search for `pg_cron` and enable it
5. Also enable `pg_net` if not already enabled (required for HTTP calls)

### Step 3: Schedule the Cron Job

Go to **SQL Editor** in Supabase Dashboard and run:

```sql
-- Schedule the function to run daily at 2:00 AM UTC
SELECT cron.schedule(
  'delete-old-draft-invoices',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/delete-old-drafts',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY')
  );
  $$
);
```

**Important**: Replace:
- `YOUR_PROJECT_REF` with your actual Supabase project reference
- `YOUR_SERVICE_ROLE_KEY` with your actual service role key (found in Project Settings → API)

### Step 4: Verify the Cron Job

Check if the cron job was created successfully:

```sql
SELECT * FROM cron.job;
```

You should see an entry with name `delete-old-draft-invoices`.

## Cron Schedule Syntax

The schedule `'0 2 * * *'` means:
- `0` = minute (0th minute)
- `2` = hour (2 AM)
- `*` = day of month (every day)
- `*` = month (every month)
- `*` = day of week (every day of week)

### Common Schedules

| Schedule | Description |
|----------|-------------|
| `0 2 * * *` | Daily at 2:00 AM UTC |
| `0 */6 * * *` | Every 6 hours |
| `0 0 * * 0` | Weekly on Sunday at midnight |
| `0 0 1 * *` | Monthly on the 1st at midnight |
| `*/30 * * * *` | Every 30 minutes |

## Testing

### Manual Test (Local)

```bash
supabase functions invoke delete-old-drafts
```

### Manual Test (Production)

```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/delete-old-drafts' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY'
```

### Expected Response

**When drafts are found:**
```json
{
  "success": true,
  "message": "Deleted 3 old draft invoice(s)",
  "deleted_count": 3,
  "deleted_invoices": [
    {
      "invoice_number": "#12345678",
      "customer_name": "John Doe",
      "created_at": "2024-01-01T10:00:00.000Z"
    }
  ]
}
```

**When no drafts found:**
```json
{
  "success": true,
  "message": "No old draft invoices to delete",
  "deleted_count": 0
}
```

## Monitoring

### Check Cron Job Logs

View the execution history:

```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'delete-old-draft-invoices')
ORDER BY runid DESC 
LIMIT 10;
```

### Check Last Run Status

```sql
SELECT 
  jobname,
  schedule,
  active,
  (SELECT status FROM cron.job_run_details 
   WHERE jobid = j.jobid 
   ORDER BY runid DESC 
   LIMIT 1) as last_run_status,
  (SELECT end_time FROM cron.job_run_details 
   WHERE jobid = j.jobid 
   ORDER BY runid DESC 
   LIMIT 1) as last_run_time
FROM cron.job j
WHERE jobname = 'delete-old-draft-invoices';
```

## Managing the Cron Job

### Disable/Pause the Cron Job

```sql
UPDATE cron.job 
SET active = false 
WHERE jobname = 'delete-old-draft-invoices';
```

### Re-enable the Cron Job

```sql
UPDATE cron.job 
SET active = true 
WHERE jobname = 'delete-old-draft-invoices';
```

### Change the Schedule

```sql
UPDATE cron.job 
SET schedule = '0 3 * * *'  -- Change to 3 AM instead of 2 AM
WHERE jobname = 'delete-old-draft-invoices';
```

### Delete the Cron Job

```sql
SELECT cron.unschedule('delete-old-draft-invoices');
```

## Troubleshooting

### Function Not Running

1. Check if pg_cron is enabled:
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

2. Check if pg_net is enabled:
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_net';
```

3. Check cron job status:
```sql
SELECT * FROM cron.job WHERE jobname = 'delete-old-draft-invoices';
```

### Check Error Logs

```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'delete-old-draft-invoices')
AND status = 'failed'
ORDER BY runid DESC;
```

### Function Deployed but Cron Not Working

- Verify the Edge Function URL is correct
- Verify the service role key is correct
- Check if the function has proper permissions
- Test the function manually first

## Security Considerations

- **Service Role Key**: Never expose this key in client-side code
- **No Auth Required**: The function uses `--no-verify-jwt` flag since it's called by cron
- **Audit Trail**: Consider logging deletions to a separate table if needed

## Customization

### Change Deletion Threshold

Edit `supabase/functions/delete-old-drafts/index.ts`:

```typescript
// Change from 3 days to 7 days
threeDaysAgo.setDate(threeDaysAgo.getDate() - 7);
```

Then redeploy:
```bash
./deploy-delete-drafts.sh  # or .ps1 for Windows
```

### Add Notification on Deletion

You could extend the function to send email notifications to users when their drafts are deleted.

## Best Practices

1. **Test First**: Always test the function manually before scheduling
2. **Monitor Regularly**: Check logs weekly to ensure it's working
3. **Backup**: Ensure database backups are enabled before deploying
4. **Communication**: Inform users about the 3-day draft policy
5. **Adjust as Needed**: If 3 days is too short, increase the threshold

## Related Documentation

- [Edge Function Setup](EDGE_FUNCTION_SETUP.md)
- [Project Overview](PROJECT_OVERVIEW.md)
- [Invoice Status Logic](PROJECT_OVERVIEW.md#invoice-statuses--rules)






