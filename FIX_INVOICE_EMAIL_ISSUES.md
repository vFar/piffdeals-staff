# Fix Invoice Email Issues

## Problems Identified

1. **404 Error**: `send-invoice-email` function not deployed
2. **403 Error**: RLS policy blocking invoice status update from 'draft' to 'sent'
3. **403 Error**: Invoice fetch failing (likely due to RLS or function not being deployed)

## Fixes Applied

### 1. ✅ Fixed RLS Policy for Invoice Updates

**File**: `database-schema.sql`

The RLS policy was updated to allow updating invoice status from 'draft' to 'sent'. The old policy only allowed updates when the new status was 'draft', which prevented the transition to 'sent'.

**What changed**:
- Updated `WITH CHECK` clause to allow `status IN ('draft', 'sent')` for draft invoices
- This allows creators to send their draft invoices

**Action Required**: Run the SQL migration file `fix-invoice-email-sql.sql` in your Supabase SQL editor:

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `fix-invoice-email-sql.sql`
3. Click Run

This will:
- Add the missing `last_invoice_email_sent` column
- Create the necessary index
- Update the RLS policy to allow draft → sent status changes

Alternatively, you can use the `fix-admin-invoice-permissions.sql` file, but `fix-invoice-email-sql.sql` includes all fixes in one script.

### 2. ⚠️ Deploy send-invoice-email Function

**Issue**: The function returns 404, meaning it's not deployed.

**Action Required**: Deploy the function using Supabase CLI:

```bash
# Make sure you're logged in to Supabase
supabase login

# Link to your project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy send-invoice-email
```

**Function Location**: `supabase/functions/send-invoice-email/index.ts`

**Required Environment Variables** (set in Supabase Dashboard → Edge Functions → Secrets):
- `RESEND_API_KEY` - Your Resend API key for sending emails
- `FROM_EMAIL` - Email address to send from (e.g., `noreply@piffdeals.lv`)
- `COMPANY_NAME` - Company name (defaults to "Piffdeals")
- `PUBLIC_SITE_URL` - Your public site URL (e.g., `https://staff.piffdeals.lv`)
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for admin operations)

### 3. ⚠️ Verify Invoice Access

The 403 error when fetching invoices might be resolved once:
1. The RLS policy is updated (allows status changes)
2. The function is deployed (allows email sending)

If 403 errors persist after deploying the function, check:
- User has permission to view the invoice (creator or admin viewing employee invoices)
- Invoice has a `public_token` if trying to access via public link

## Testing Steps

1. **Apply RLS Policy Fix**:
   ```sql
   -- Run the policy update from database-schema.sql or fix-admin-invoice-permissions.sql
   ```

2. **Deploy Function**:
   ```bash
   supabase functions deploy send-invoice-email
   ```

3. **Set Environment Variables** in Supabase Dashboard

4. **Test Invoice Email**:
   - Create a draft invoice
   - Try to send it via email
   - Verify email is sent and invoice status changes to 'sent'

## Additional Notes

- **Tailwind CDN Warning**: The warning about using Tailwind CDN in production is just a best practice notice. It doesn't affect functionality. To fix it properly, you'd need to install Tailwind as a PostCSS plugin, but this is a low-priority improvement.
- The function includes rate limiting (5-minute cooldown between emails per invoice)
- The function verifies invoice ownership before sending emails
- The `last_invoice_email_sent` column tracks when emails were sent for rate limiting

## Quick Fix Summary

1. **Run SQL migration**: Execute `fix-invoice-email-sql.sql` in Supabase SQL Editor
2. **Deploy function**: Run `supabase functions deploy send-invoice-email`
3. **Set environment variables**: Configure Resend API key and other secrets in Supabase Dashboard
4. **Test**: Try sending an invoice email

The main issue was the RLS policy blocking status updates from 'draft' to 'sent'. This is now fixed.

