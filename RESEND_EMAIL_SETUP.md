# 📧 Resend Email Setup Guide

This guide will help you set up Resend for sending invoice emails with high deliverability and spam prevention.

---

## 🎯 Recommended Email Address: `info@piffdeals.lv`

**For invoices and business communications, use `info@piffdeals.lv`**

### Why `info@piffdeals.lv`?

✅ **Professional & Standard** - Most common business email address
✅ **General Purpose** - Suitable for invoices, orders, notifications
✅ **Less Technical** - Not IT/support-oriented like `support@`
✅ **Better Reputation** - Widely recognized and trusted format
✅ **International Standard** - Used globally for business communications

### When to Use `support@piffdeals.lv`?

❌ **Only if** you want to separate:
- Customer support tickets
- Technical assistance
- Help desk inquiries

For invoices and general business emails, stick with **`info@piffdeals.lv`**.

---

## 🚀 Quick Setup Steps

### Step 1: Sign Up for Resend

1. Go to **[resend.com](https://resend.com)**
2. Sign up for a free account (3,000 emails/month free)
3. Verify your email address

### Step 2: Add Your Domain

1. In Resend Dashboard, go to **Domains** section
2. Click **Add Domain**
3. Enter: `piffdeals.lv`
4. Resend will provide DNS records to add

### Step 3: Configure DNS Records

Add these DNS records to your DNS provider (Cloudflare, where you manage `piffdeals.lv` DNS via nic.lv NS records).

**📋 See [CLOUDFLARE_DNS_SETUP.md](CLOUDFLARE_DNS_SETUP.md) for detailed Cloudflare-specific instructions!**

#### 1. SPF Record (Text Record) - Root Domain

**Important:** You may already have SPF records. If you do, **combine them** into one record (you can only have one SPF per domain).

```
Type: TXT
Name: @ (or piffdeals.lv, or leave empty)
Content: v=spf1 include:amazonses.com include:resend.com ~all
Proxy: DNS only (turn proxy OFF)
TTL: Auto
```

**Note:** Include `amazonses.com` if you use Amazon SES, or remove it if you only use Resend.

#### 2. DKIM Records (Text Records)

Resend will provide DKIM records. You already have `resend._domainkey` ✅. Check Resend Dashboard if you need `resend2._domainkey`:

```
Type: TXT
Name: resend._domainkey
Content: [already exists - verify it matches Resend Dashboard]
Proxy: DNS only (turn proxy OFF)
TTL: Auto

Type: TXT
Name: resend2._domainkey (if needed)
Content: [provided by Resend Dashboard]
Proxy: DNS only (turn proxy OFF)
TTL: Auto
```

#### 3. DMARC Record (Text Record) - Recommended

```
Type: TXT
Name: _dmarc
Content: v=DMARC1; p=none; rua=mailto:dmarc@piffdeals.lv
Proxy: DNS only (turn proxy OFF)
TTL: Auto
```

**Note:** Start with `p=none` for testing, then change to `p=quarantine` for production.

**⚠️ Important for Cloudflare:** All email-related DNS records (SPF, DKIM, DMARC, MX) must be set to **DNS only** (proxy OFF - orange cloud OFF).

### Step 4: Verify Domain

1. After adding DNS records, go back to Resend Dashboard
2. Click **Verify** on your domain
3. Wait for DNS propagation (can take a few minutes to 24 hours)
4. Status should show **Verified** ✅

### Step 5: Get API Key

1. In Resend Dashboard, go to **API Keys** section
2. Click **Create API Key**
3. Give it a name: `Invoice Sending`
4. Copy the API key (starts with `re_`)
5. ⚠️ **Save it now - you won't see it again!**

### Step 6: Set Supabase Secrets

In your **Supabase Dashboard**:

1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Add these secrets:

```
RESEND_API_KEY=re_your_api_key_here
FROM_EMAIL=info@piffdeals.lv
COMPANY_NAME=Piffdeals
PUBLIC_SITE_URL=https://staff.piffdeals.lv
```

**Important:**
- Replace `re_your_api_key_here` with your actual Resend API key
- Use `info@piffdeals.lv` as the FROM_EMAIL
- Set `PUBLIC_SITE_URL` to your actual production URL

---

## ✅ Spam Prevention Best Practices

Resend handles most spam prevention automatically, but here's what ensures high deliverability:

### 1. **Domain Verification** ✅
- Verify your domain in Resend
- Add all required DNS records (SPF, DKIM, DMARC)
- Wait for verification to complete

### 2. **Proper From Address** ✅
- Use a verified domain email (`info@piffdeals.lv`)
- Never use `noreply@` or generic addresses
- Use the same domain as your website

### 3. **Email Content** ✅
- Clear, professional subject lines
- Proper HTML + plain text versions (already included)
- No spam trigger words
- Legitimate business purpose

### 4. **Volume** ✅
- Don't send mass emails initially
- Start with small volumes
- Build reputation gradually
- Use Resend's rate limiting

### 5. **Bounce Handling** ✅
- Resend handles bounces automatically
- Remove invalid email addresses
- Monitor bounce rates in Resend Dashboard

---

## 🧪 Testing

### Test Email First

1. Deploy the edge function:
   ```powershell
   .\deploy-email-function.ps1
   ```

2. Create a test invoice in your app

3. Try sending to your own email address

4. Check:
   - ✅ Email arrives in inbox (not spam)
   - ✅ "From" shows as `info@piffdeals.lv`
   - ✅ Email renders correctly
   - ✅ Links work

### Test Deliverability

Use these tools to check your email reputation:

1. **[MXToolbox](https://mxtoolbox.com/SuperTool.aspx)** - Check SPF/DKIM/DMARC
2. **[Mail Tester](https://www.mail-tester.com/)** - Send test email and get spam score
3. **Gmail/Outlook** - Test if emails go to inbox vs spam

---

## 📊 Monitoring

### Resend Dashboard

Monitor in Resend Dashboard:
- **Email deliverability rate**
- **Bounce rate**
- **Complaint rate**
- **Failed sends**

### Common Issues

| Issue | Solution |
|-------|----------|
| Emails go to spam | Verify domain, check DNS records |
| Emails not sending | Check API key, verify domain |
| High bounce rate | Clean email list, verify addresses |
| Authentication failed | Re-verify SPF/DKIM records |

---

## 🔄 Alternative Email Addresses

If you want to change the FROM address later:

### Option 1: Keep `info@piffdeals.lv` (Recommended)
- Best for invoices
- Professional and standard

### Option 2: Use `invoices@piffdeals.lv`
- More specific to invoices
- Still professional

### Option 3: Use `noreply@piffdeals.lv` (Not Recommended)
- Lower deliverability
- Looks less professional
- Can't receive replies

**Best Practice:** Stick with `info@piffdeals.lv` for all business emails.

---

## 🆘 Troubleshooting

### "Domain not verified"
- Check DNS records are correct
- Wait for DNS propagation (up to 24 hours)
- Verify records with DNS checker tool

### "Email sending failed"
- Check API key is correct
- Verify FROM_EMAIL matches verified domain
- Check Resend Dashboard for error details

### "Emails in spam folder"
- Verify all DNS records (SPF, DKIM, DMARC)
- Check email content for spam triggers
- Build sender reputation gradually

### "Rate limit exceeded"
- Resend free tier: 100 emails/day
- Upgrade plan for higher limits
- Implement rate limiting in your app

---

## 📝 Environment Variables Summary

### Supabase Edge Function Secrets:
```
RESEND_API_KEY=re_xxxxx...
FROM_EMAIL=info@piffdeals.lv
COMPANY_NAME=Piffdeals
PUBLIC_SITE_URL=https://staff.piffdeals.lv
```

### Frontend (.env.local):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

## ✅ Checklist

- [ ] Signed up for Resend account
- [ ] Added domain `piffdeals.lv` in Resend
- [ ] Added SPF DNS record
- [ ] Added DKIM DNS records (2 records)
- [ ] Added DMARC DNS record (optional)
- [ ] Verified domain in Resend Dashboard
- [ ] Created API key in Resend
- [ ] Set `RESEND_API_KEY` in Supabase secrets
- [ ] Set `FROM_EMAIL=info@piffdeals.lv` in Supabase secrets
- [ ] Set `COMPANY_NAME` in Supabase secrets
- [ ] Set `PUBLIC_SITE_URL` in Supabase secrets
- [ ] Deployed `send-invoice-email` edge function
- [ ] Tested sending an email
- [ ] Verified email arrives in inbox (not spam)
- [ ] Checked DNS records with MXToolbox
- [ ] Tested with Mail Tester

---

## 📚 Additional Resources

- [Resend Documentation](https://resend.com/docs)
- [Resend Domain Verification](https://resend.com/docs/dashboard/domains/introduction)
- [Email Deliverability Guide](https://resend.com/docs/best-practices/email-deliverability)

---

**Last Updated:** December 2024
**Recommended Email:** `info@piffdeals.lv`

