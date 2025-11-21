# Deploy Security Fixes - Step by Step Guide

## 🚀 Deployment Steps

### Step 1: Database Migration (Required)

**What it does:**
- Adds `last_invoice_email_sent` column for rate limiting
- Updates RLS policy to remove admin override for invoice editing
- Creates index for performance

**How to run:**
1. Open Supabase Dashboard: https://app.supabase.com
2. Go to your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the entire contents of `add-invoice-email-cooldown.sql`
6. Paste into the SQL Editor
7. Click **Run** (or press Ctrl+Enter / Cmd+Enter)
8. Verify success message ✅

**Or using Supabase CLI:**
```bash
# Make sure you're linked to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run the migration
supabase db push add-invoice-email-cooldown.sql
```

---

### Step 2: Deploy Edge Functions (Required)

**What it does:**
- Deploys `send-invoice-email` with ownership verification and rate limiting
- Deploys `create-user` with server-side role validation

**Prerequisites:**
```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF
```

**Deploy functions:**
```bash
# Deploy invoice email function
supabase functions deploy send-invoice-email

# Deploy user creation function  
supabase functions deploy create-user
```

**Verify deployment:**
- Check Supabase Dashboard → Edge Functions
- Both functions should show updated timestamps

---

### Step 3: Verify Security Fixes (Recommended)

Test that all security fixes work:

#### Test 1: Invoice Email Ownership ✅
1. Log in as a regular employee
2. Try to send email for invoice created by another user
3. **Expected:** Should fail with "Forbidden: You can only send emails for your own invoices"

#### Test 2: Invoice Email Rate Limiting ✅
1. Send an invoice email
2. Immediately try to send another email for the same invoice
3. **Expected:** Should fail with "Cooldown active" message

#### Test 3: User Creation Role Validation ✅
1. Log in as an admin (not super_admin)
2. Try to create another admin account
3. **Expected:** Should fail with "Forbidden: Administrators can only create employee accounts"

#### Test 4: Invoice Editing ✅
1. Log in as an admin
2. Try to edit a draft invoice created by another user
3. **Expected:** Should fail (RLS policy blocks it)

---

## ⚠️ Important Notes

### Database Migration
- **Safe to run multiple times:** Uses `IF NOT EXISTS` clauses
- **No data loss:** Only adds columns and updates policies
- **Backwards compatible:** Existing code continues to work

### Edge Function Deployment
- **Zero downtime:** Functions are deployed instantly
- **Automatic rollback available:** Can revert if issues occur
- **Environment variables:** Make sure `RESEND_API_KEY`, `FROM_EMAIL`, etc. are set in Supabase Dashboard → Edge Functions → Secrets

---

## 🔍 Verification Checklist

After deployment, verify:

- [ ] Database migration ran successfully (check `invoices` table has `last_invoice_email_sent` column)
- [ ] `send-invoice-email` function deployed successfully
- [ ] `create-user` function deployed successfully
- [ ] Invoice email sending works for own invoices
- [ ] Invoice email sending fails for others' invoices (403)
- [ ] Invoice email rate limiting works (429 after second attempt)
- [ ] User creation role validation works (admin can't create admin)
- [ ] Invoice editing restricted to creator only

---

## 🐛 Troubleshooting

### Migration fails:
- Check you have admin access to Supabase project
- Verify SQL syntax is correct
- Check for existing column conflicts

### Edge function deployment fails:
- Verify Supabase CLI is up to date: `npm install -g supabase@latest`
- Check you're logged in: `supabase projects list`
- Verify project link: `supabase link --project-ref YOUR_PROJECT_REF`

### Functions don't work after deployment:
- Check function logs in Supabase Dashboard → Edge Functions → Logs
- Verify environment variables are set (RESEND_API_KEY, etc.)
- Check function URLs are correct

---

## 📝 Summary

**Files Modified:**
1. ✅ `supabase/functions/send-invoice-email/index.ts` - Security fixes applied
2. ✅ `supabase/functions/create-user/index.ts` - Security fixes applied
3. ✅ `database-schema.sql` - RLS policy updated
4. ✅ `add-invoice-email-cooldown.sql` - New migration file

**Deployment Required:**
1. ✅ Run SQL migration in Supabase Dashboard
2. ✅ Deploy both edge functions using Supabase CLI

**Time Required:** ~5-10 minutes

**Risk Level:** Low (backwards compatible, safe migrations)

---

## 🎯 Next Steps

1. Run database migration
2. Deploy edge functions
3. Test security fixes
4. Monitor function logs for any errors
5. Document deployment in your deployment log

---

## 📞 Support

If you encounter issues:
1. Check Supabase Dashboard → Edge Functions → Logs for error messages
2. Verify all environment variables are set correctly
3. Check that database migration completed successfully
4. Review `SECURITY_AUDIT_REPORT.md` for context

