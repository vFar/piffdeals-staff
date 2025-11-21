# 📧 Email Testing Guide - How to Test Invoice Emails

This guide explains how to test the invoice email functionality after deploying the edge function.

---

## 📋 Prerequisites

Before testing, make sure you have:

1. ✅ **Resend account set up** (see `RESEND_EMAIL_SETUP.md`)
2. ✅ **Domain verified in Resend** (`piffdeals.lv`)
3. ✅ **Edge function deployed** to Supabase
4. ✅ **Environment variables set** in Supabase Dashboard:
   - `RESEND_API_KEY` - Your Resend API key
   - `FROM_EMAIL` - `info@piffdeals.lv`
   - `COMPANY_NAME` - `Piffdeals`
   - `PUBLIC_SITE_URL` - Your public site URL (e.g., `https://staff.piffdeals.lv`)

---

## 🚀 Step 1: Deploy the Edge Function

### Option A: Using PowerShell (Windows)

```powershell
.\deploy-email-function.ps1
```

### Option B: Using Bash (Linux/Mac)

```bash
./deploy-email-function.sh
```

### Option C: Manual Deployment

```bash
supabase functions deploy send-invoice-email --no-verify-jwt
```

---

## ✅ Step 2: Verify Environment Variables

1. Go to **Supabase Dashboard**
2. Navigate to **Project Settings** → **Edge Functions** → **Secrets**
3. Verify these secrets are set:
   - `RESEND_API_KEY=re_xxxxx...`
   - `FROM_EMAIL=info@piffdeals.lv`
   - `COMPANY_NAME=Piffdeals`
   - `PUBLIC_SITE_URL=https://staff.piffdeals.lv` (or your actual URL)

---

## 🧪 Step 3: Test Methods

### Method 1: Test Through Your App (Recommended)

This is the **best way** to test because it uses the actual user flow.

#### Steps:

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Log in to your staff portal**

3. **Create a test invoice:**
   - Go to "Create Invoice" or "Invoices" page
   - Create a new invoice with your own email address as the customer
   - Make sure the invoice has:
     - Customer email (use YOUR email for testing)
     - Customer name
     - At least one item
     - A public token (generated automatically)

4. **Send the invoice email:**
   - In the Invoices list, find your test invoice
   - Click the "Send Email" button (or similar)
   - OR go to the invoice detail page and click "Send Email"

5. **Check your email:**
   - Check your inbox (and spam folder)
   - Verify the email arrived
   - Check the "From" address is `info@piffdeals.lv`
   - Click the "View Invoice" button to verify the link works

#### What to Check:

- ✅ Email arrives in inbox (not spam)
- ✅ "From" shows as `info@piffdeals.lv`
- ✅ Subject line: "Jauns rēķins [Invoice Number] - Piffdeals"
- ✅ Email renders correctly (colors, fonts, layout)
- ✅ "Skatīt rēķinu" button works
- ✅ Invoice details are correct (invoice number, total amount)
- ✅ Link goes to correct public invoice URL
- ✅ Email is in Latvian

---

### Method 2: Test Using Supabase Dashboard

You can test the edge function directly from Supabase Dashboard.

#### Steps:

1. Go to **Supabase Dashboard**
2. Navigate to **Edge Functions** → **send-invoice-email**
3. Click **Invoke Function** or **Test**
4. Enter test payload:

```json
{
  "invoiceId": "test-invoice-id",
  "customerEmail": "your-email@example.com",
  "customerName": "Test Customer",
  "invoiceNumber": "INV-TEST-001",
  "publicToken": "test-token-123",
  "total": 99.99
}
```

5. Click **Invoke**
6. Check your email

**Note:** For this to work, you need to be authenticated. The edge function checks for a valid user session.

---

### Method 3: Test Using curl (Command Line)

If you have your Supabase project URL and anon key, you can test via curl.

#### Steps:

1. **Get your session token:**
   - Log in to your app in browser
   - Open browser DevTools → Console
   - Run: `await supabase.auth.getSession()`
   - Copy the `access_token` value

2. **Test the function:**

```bash
curl -X POST \
  'https://YOUR_PROJECT_ID.supabase.co/functions/v1/send-invoice-email' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "invoiceId": "test-id",
    "customerEmail": "your-email@example.com",
    "customerName": "Test Customer",
    "invoiceNumber": "INV-TEST-001",
    "publicToken": "test-token-123",
    "total": 99.99
  }'
```

---

### Method 4: Test Using Postman or Similar Tool

1. **Set up request:**
   - Method: `POST`
   - URL: `https://YOUR_PROJECT_ID.supabase.co/functions/v1/send-invoice-email`
   - Headers:
     - `Authorization: Bearer YOUR_ACCESS_TOKEN`
     - `Content-Type: application/json`
   - Body (JSON):
     ```json
     {
       "invoiceId": "test-id",
       "customerEmail": "your-email@example.com",
       "customerName": "Test Customer",
       "invoiceNumber": "INV-TEST-001",
       "publicToken": "test-token-123",
       "total": 99.99
     }
     ```

2. **Send request**
3. **Check response** (should be `{"success": true, ...}`)
4. **Check your email**

---

## 🔍 Step 4: Verify Email Content

When you receive the email, verify:

### Email Header
- ✅ From: `info@piffdeals.lv` (or your configured FROM_EMAIL)
- ✅ To: Your test email address
- ✅ Subject: "Jauns rēķins [Invoice Number] - Piffdeals"

### Email Body
- ✅ **Greeting:** "Sveiki, [Customer Name]!"
- ✅ **Message:** "Jums ir jauns rēķins. Šeit ir saite, lai to apskatītu un apmaksātu."
- ✅ **Invoice Details Card:**
  - Invoice number displayed correctly
  - Total amount displayed correctly (€XX.XX)
- ✅ **Button:** "Skatīt rēķinu" (blue button)
- ✅ **Alternative Link:** Text link if button doesn't work
- ✅ **Footer:** "Tiesības: copyright 2025 Piffdeals. Visas tiesības aizsargātas."

### Design
- ✅ **Colors:** Blue header (#0068FF), light blue background (#EBF3FF)
- ✅ **Font:** Inter font family
- ✅ **Layout:** Responsive, looks good on mobile
- ✅ **Button:** Styled correctly with hover effects

---

## 🧪 Step 5: Test Email Deliverability

Use these tools to check if emails are being delivered properly:

### 1. Mail Tester
- Go to: https://www.mail-tester.com/
- Copy the test email address they provide
- Send an invoice email to that address
- Check your spam score (aim for 10/10)

### 2. MXToolbox
- Go to: https://mxtoolbox.com/SuperTool.aspx
- Enter your domain: `piffdeals.lv`
- Select "SPF Record Lookup" or "DMARC Lookup"
- Verify DNS records are set correctly

### 3. Test Multiple Email Providers
Send test emails to:
- Gmail
- Outlook/Hotmail
- Yahoo
- Your company email
- Verify they all arrive in inbox (not spam)

---

## 🐛 Step 6: Debugging

### Check Function Logs

1. Go to **Supabase Dashboard**
2. Navigate to **Edge Functions** → **send-invoice-email**
3. Click **Logs** tab
4. Look for errors or warnings

### Common Issues

#### Issue: "Email service not configured"
**Solution:** Check that `RESEND_API_KEY` is set in Supabase secrets.

#### Issue: "Unauthorized"
**Solution:** Make sure you're logged in and have a valid session token.

#### Issue: "Domain not verified"
**Solution:** Verify your domain in Resend Dashboard and check DNS records.

#### Issue: Emails go to spam
**Solution:**
- Verify all DNS records (SPF, DKIM, DMARC)
- Wait 24-48 hours for DNS propagation
- Don't send too many test emails at once
- Use a professional FROM address (not noreply@)

#### Issue: Email not received
**Solution:**
- Check spam folder
- Verify recipient email address is correct
- Check Resend Dashboard for delivery status
- Check edge function logs for errors

---

## ✅ Step 7: Verify Public Invoice Link

1. Click the "Skatīt rēķinu" button in the email
2. Verify it opens the public invoice page
3. Check that the invoice displays correctly
4. Verify the invoice details match what you sent

---

## 📝 Testing Checklist

- [ ] Edge function deployed successfully
- [ ] Environment variables set in Supabase
- [ ] Created test invoice in app
- [ ] Sent email from app
- [ ] Email received in inbox
- [ ] Email not in spam folder
- [ ] From address correct (`info@piffdeals.lv`)
- [ ] Subject line correct
- [ ] All content in Latvian
- [ ] Invoice number correct
- [ ] Total amount correct
- [ ] "Skatīt rēķinu" button works
- [ ] Public invoice link works
- [ ] Email renders correctly on mobile
- [ ] Email renders correctly in Gmail
- [ ] Email renders correctly in Outlook
- [ ] Copyright text correct

---

## 🎯 Quick Test Script

For quick testing, use this PowerShell script:

```powershell
# Quick Email Test
$SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co"
$ACCESS_TOKEN = "YOUR_ACCESS_TOKEN"
$TEST_EMAIL = "your-test-email@example.com"

$body = @{
    invoiceId = "test-123"
    customerEmail = $TEST_EMAIL
    customerName = "Test Customer"
    invoiceNumber = "INV-TEST-001"
    publicToken = "test-token-123"
    total = 99.99
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $ACCESS_TOKEN"
    "Content-Type" = "application/json"
}

$response = Invoke-RestMethod -Uri "$SUPABASE_URL/functions/v1/send-invoice-email" -Method Post -Body $body -Headers $headers
Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Green
```

---

## 🆘 Need Help?

If you encounter issues:

1. Check **Supabase Edge Function logs**
2. Check **Resend Dashboard** for delivery status
3. Verify **DNS records** are set correctly
4. Make sure **environment variables** are set
5. Test with **Mail Tester** to check spam score

---

**Last Updated:** January 2025


