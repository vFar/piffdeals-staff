# Deploy Email Function via Supabase Dashboard (No CLI Needed)

This guide shows you how to deploy the email function directly through the Supabase Dashboard - no CLI installation required!

---

## ✅ Step 1: Open Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click **Edge Functions** in the left sidebar

---

## 📝 Step 2: Create New Function

1. Click **"Create a new function"** or **"New Function"** button
2. **Function Name:** Enter `send-invoice-email`
3. Click **"Create Function"** or **"Deploy"**

---

## 📋 Step 3: Copy the Function Code

1. **Open the file:** `supabase/functions/send-invoice-email/index.ts`
2. **Copy ALL the code** (Ctrl+A, then Ctrl+C)
3. **Paste it** into the Supabase Dashboard code editor (replace any template code)

---

## 🔧 Step 4: Set Environment Variables (Secrets)

1. Go to **Project Settings** → **Edge Functions** → **Secrets** (or **Environment Variables**)
2. Click **"Add New Secret"** for each one:

### Required Secrets:

1. **RESEND_API_KEY**
   - Value: Your Resend API key (starts with `re_`)
   - Get it from: https://resend.com/api-keys

2. **FROM_EMAIL**
   - Value: `info@piffdeals.lv`
   - Or your configured email address

3. **COMPANY_NAME**
   - Value: `Piffdeals`

4. **PUBLIC_SITE_URL**
   - Value: `https://staff.piffdeals.lv`
   - Or your actual production URL

---

## 🚀 Step 5: Deploy the Function

1. In the code editor, click **"Deploy"** or **"Save"** button
2. Wait for deployment to complete (should take 10-30 seconds)
3. You should see a success message

---

## ✅ Step 6: Verify Deployment

1. Go back to **Edge Functions** list
2. You should see `send-invoice-email` in the list
3. Click on it to view details and logs

---

## 🧪 Step 7: Test the Function

### Option A: Test Through Your App

1. **Start your app:** `npm run dev`
2. **Log in** to your staff portal
3. **Create a test invoice** with your email address
4. **Send the email** from the invoices page
5. **Check your inbox** (and spam folder)

### Option B: Test via Dashboard

1. Go to **Edge Functions** → **send-invoice-email**
2. Click **"Invoke Function"** or **"Test"**
3. Enter test payload:

```json
{
  "invoiceId": "test-123",
  "customerEmail": "your-email@example.com",
  "customerName": "Test Customer",
  "invoiceNumber": "INV-TEST-001",
  "publicToken": "test-token-123",
  "total": 99.99
}
```

4. Click **"Invoke"**
5. Check your email

**Note:** For this to work, you need to be authenticated. Better to test through your app.

---

## 🔍 Step 8: Check Function Logs

If something doesn't work:

1. Go to **Edge Functions** → **send-invoice-email**
2. Click **"Logs"** tab
3. Look for errors or messages
4. Check if environment variables are set correctly

---

## ⚠️ Common Issues

### "Email service not configured"
**Solution:** Make sure `RESEND_API_KEY` is set in Secrets.

### "Unauthorized"
**Solution:** Make sure you're logged in when testing through the app.

### "Domain not verified"
**Solution:** Verify your domain in Resend Dashboard first (see `RESEND_EMAIL_SETUP.md`).

### Function not found
**Solution:** Make sure you deployed it correctly. Check Edge Functions list.

---

## ✅ Testing Checklist

After deployment:

- [ ] Function appears in Edge Functions list
- [ ] All 4 secrets are set (RESEND_API_KEY, FROM_EMAIL, COMPANY_NAME, PUBLIC_SITE_URL)
- [ ] Can send test email from app
- [ ] Email arrives in inbox
- [ ] Email renders correctly
- [ ] "Skatīt rēķinu" button works
- [ ] Link goes to correct public invoice URL

---

## 📚 Next Steps

Once deployed and tested:

1. **Monitor logs** in Supabase Dashboard
2. **Check Resend Dashboard** for delivery status
3. **Test with multiple email providers** (Gmail, Outlook, etc.)
4. **Verify email doesn't go to spam**

---

**That's it!** Your email function is now deployed and ready to use.

No CLI installation needed! 🎉



