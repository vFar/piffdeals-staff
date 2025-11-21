# 🧪 Email Testing & Debugging Guide

This guide shows you how to test email sending and debug errors when using Resend for invoice emails.

---

## ✅ Quick Fix Applied

**Fixed:** Missing `handleSendEmailResend` function in `Invoices.jsx`
- ✅ Function now implemented
- ✅ Proper error handling added
- ✅ Console logging for debugging

---

## 🧪 How to Test Email Sending

### Method 1: Test from Invoices Page (UI)

1. **Open your app** at `http://localhost:5173` (or your dev URL)
2. **Navigate to Invoices** page
3. **Create or select an invoice** with:
   - Status: `draft` or `sent`
   - Customer email: **Use your own email** for testing
   - Public token must exist (generated when status changes to `sent`)
4. **Click "View"** on the invoice
5. **Click "Gatavs nosūtīšanai"** (for draft) or **"Dalīties"** → **"Nosūtīt e-pastu"** (for sent)
6. **Check browser console** (F12) for errors
7. **Check your email inbox** (and spam folder)

### Method 2: Test from ViewInvoice Page

1. **Navigate to invoice view page**
2. **Click "Gatavs nosūtīšanai"** button
3. **Choose "Email" option**
4. **Check console and email inbox**

---

## 🔍 Where to Check for Errors

### 1. Browser Console (Developer Tools)

**Open:** Press `F12` or right-click → Inspect → Console tab

**Look for:**
- ✅ Success messages: `Email sent successfully`
- ❌ Error messages: `Error sending email: ...`
- ❌ Edge function errors: `Failed to send email: ...`

**Common Console Errors:**
```javascript
// Missing configuration
"Email service not configured" 
// → RESEND_API_KEY not set in Supabase secrets

"Unauthorized"
// → Authentication token issue

"Missing required fields"
// → Invoice missing customer_email, public_token, etc.
```

### 2. Supabase Edge Function Logs

**Location:** Supabase Dashboard → Edge Functions → `send-invoice-email` → Logs

**Steps:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Edge Functions** in sidebar
4. Click **`send-invoice-email`**
5. Click **Logs** tab
6. Look for recent function invocations

**What to look for:**
- ✅ `200` status code = Success
- ❌ `400` = Bad request (missing fields)
- ❌ `401` = Unauthorized
- ❌ `500` = Server error (check logs for details)

**Log Messages to Check:**
```
✅ "Email sent successfully" + emailId
❌ "Resend API error: ..."
❌ "RESEND_API_KEY not set"
❌ "Failed to send email: ..."
```

### 3. Resend Dashboard

**Location:** [Resend Dashboard](https://resend.com/emails) → Emails

**Steps:**
1. Login to Resend Dashboard
2. Go to **Emails** section
3. Check recent email sends

**What to check:**
- ✅ **Delivered** = Email sent successfully
- ⚠️ **Bounced** = Invalid email address
- ⚠️ **Complaint** = Marked as spam
- ❌ **Failed** = Sending error (check error message)

**Email Details:**
- Click on email to see:
  - Delivery status
  - Recipient
  - Subject
  - Error message (if failed)

---

## 🐛 Common Errors & Solutions

### Error 1: "Email service not configured"

**Console Message:**
```
Error: Email service not configured
```

**Cause:** `RESEND_API_KEY` not set in Supabase secrets

**Solution:**
1. Go to Supabase Dashboard → Project Settings → Edge Functions → Secrets
2. Add secret: `RESEND_API_KEY` = `re_xxxxx...`
3. Redeploy edge function (or wait a few minutes for secrets to reload)

---

### Error 2: "Unauthorized"

**Console Message:**
```
Error: Unauthorized
Status: 401
```

**Cause:** User not authenticated or token expired

**Solution:**
1. Refresh the page
2. Logout and login again
3. Check if user session is valid
4. Check browser console for auth errors

---

### Error 3: "Missing required fields"

**Console Message:**
```
Error: Missing required fields
```

**Cause:** Invoice missing required data:
- `customer_email`
- `public_token`
- `invoice_number`
- `customer_name`
- `total`

**Solution:**
1. Check invoice data in database
2. Make sure invoice has `public_token` (generated when status changes to `sent`)
3. Verify all invoice fields are filled

---

### Error 4: "Failed to send email" (Resend API Error)

**Console Message:**
```
Error: Failed to send email: [error details]
```

**Common Causes & Solutions:**

#### a) Domain not verified
**Error:** `"domain_not_verified"`
**Solution:**
1. Go to Resend Dashboard → Domains
2. Verify `piffdeals.lv` is **Verified** ✅
3. Check DNS records are correct in Cloudflare

#### b) Invalid FROM email
**Error:** `"invalid_from_address"`
**Solution:**
1. Check `FROM_EMAIL` secret in Supabase
2. Must be `info@piffdeals.lv` (or verified domain email)
3. Cannot use `onboarding@resend.dev` with custom domain

#### c) Rate limit exceeded
**Error:** `"rate_limit_exceeded"`
**Solution:**
- Free tier: 100 emails/day
- Wait 24 hours or upgrade Resend plan

#### d) Invalid recipient email
**Error:** `"invalid_recipient"`
**Solution:**
- Check customer email is valid format
- Verify email address exists

---

### Error 5: "Function not found" or "404"

**Console Message:**
```
Error: Function not found
Status: 404
```

**Cause:** Edge function not deployed

**Solution:**
1. Deploy the function:
   ```powershell
   .\deploy-email-function.ps1
   ```
2. Verify function exists in Supabase Dashboard → Edge Functions
3. Check function name is `send-invoice-email`

---

### Error 6: Email sent but not received

**Symptoms:**
- Console shows success
- Resend Dashboard shows "Delivered"
- Email not in inbox

**Possible Causes:**
1. **Spam folder** - Check spam/junk folder
2. **Email provider filtering** - Gmail/Outlook may delay emails
3. **DNS propagation** - New DNS records may take time
4. **Sender reputation** - New domain may need time

**Solutions:**
1. Check spam folder first
2. Wait a few minutes (delays possible)
3. Verify DNS records with MXToolbox
4. Test with different email providers (Gmail, Outlook, etc.)

---

## 🔧 Debugging Checklist

Use this checklist when testing:

### Pre-Test Setup
- [ ] Edge function `send-invoice-email` is deployed
- [ ] `RESEND_API_KEY` set in Supabase secrets
- [ ] `FROM_EMAIL=info@piffdeals.lv` set in Supabase secrets
- [ ] `COMPANY_NAME` set in Supabase secrets
- [ ] `PUBLIC_SITE_URL` set in Supabase secrets
- [ ] Domain `piffdeals.lv` verified in Resend Dashboard
- [ ] DNS records (SPF, DKIM) are correct in Cloudflare

### Test Invoice Requirements
- [ ] Invoice has `customer_email` (use your own for testing)
- [ ] Invoice has `public_token` (required for link)
- [ ] Invoice has `customer_name`
- [ ] Invoice has `invoice_number`
- [ ] Invoice has `total` amount

### Testing Steps
1. [ ] Open browser console (F12)
2. [ ] Create/select test invoice
3. [ ] Click send email button
4. [ ] Watch console for errors
5. [ ] Check Supabase Edge Function logs
6. [ ] Check Resend Dashboard for email status
7. [ ] Check email inbox (and spam folder)

---

## 🛠️ Manual Testing via API

### Test Edge Function Directly

You can test the edge function directly using `curl` or Postman:

```bash
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/send-invoice-email \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": "invoice-uuid",
    "customerEmail": "your-email@example.com",
    "customerName": "Test Customer",
    "invoiceNumber": "INV-001",
    "publicToken": "token-uuid",
    "total": 100.00
  }'
```

**Get your values:**
- `YOUR_PROJECT` = Your Supabase project ID
- `YOUR_ANON_KEY` = Supabase Dashboard → Settings → API → anon public key
- `invoice-uuid` = Invoice ID from database
- `token-uuid` = Public token from invoice

### Test Resend API Directly

Test if Resend API key works:

```bash
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer re_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "info@piffdeals.lv",
    "to": ["your-email@example.com"],
    "subject": "Test Email",
    "html": "<h1>Test</h1>",
    "text": "Test"
  }'
```

---

## 📊 Debugging Workflow

When emails fail, follow this workflow:

1. **Check Browser Console**
   - ✅ Quickest way to see frontend errors
   - Shows if function call failed

2. **Check Supabase Edge Function Logs**
   - ✅ Shows function execution details
   - Shows Resend API responses
   - Shows error messages

3. **Check Resend Dashboard**
   - ✅ Shows email delivery status
   - Shows bounce/complaint reasons
   - Shows detailed error messages

4. **Check DNS Records** (if domain issues)
   - Use MXToolbox to verify SPF/DKIM
   - Check Cloudflare DNS records

5. **Check Supabase Secrets**
   - Verify all required secrets are set
   - Check secret values are correct

---

## 🔍 Advanced Debugging

### Enable Detailed Logging

The edge function already logs to console. Check Supabase logs for:
- Request payload
- Resend API response
- Error stack traces

### Test with Different Scenarios

1. **Valid email** → Should succeed
2. **Invalid email format** → Should show error
3. **Missing invoice data** → Should show error
4. **Rate limit** → Should show error
5. **Domain not verified** → Should show error

### Monitor Email Deliverability

Check Resend Dashboard → Metrics:
- **Delivery rate** (should be >95%)
- **Bounce rate** (should be <5%)
- **Complaint rate** (should be <0.1%)

---

## 📝 Error Reporting

When reporting errors, include:

1. **Browser Console Error** (screenshot or copy text)
2. **Supabase Edge Function Logs** (copy relevant lines)
3. **Resend Dashboard Status** (screenshot)
4. **Invoice Data** (anonymized):
   - Invoice ID
   - Customer email (anonymized if real)
   - Invoice status
   - Public token exists? Yes/No

---

## ✅ Success Indicators

You'll know it's working when:

1. ✅ Browser console shows: `Email sent successfully`
2. ✅ Supabase logs show: `200` status + emailId
3. ✅ Resend Dashboard shows: **Delivered** status
4. ✅ Email arrives in inbox (or spam folder initially)

---

**Last Updated:** December 2024
**Version:** 1.0



