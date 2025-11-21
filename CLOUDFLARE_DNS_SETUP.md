# 📧 Cloudflare DNS Setup for Resend

This guide shows you exactly what DNS records to add/modify in Cloudflare for Resend email sending.

---

## 📋 Current DNS Records

Based on your current Cloudflare setup:

✅ **Already have:**
- `resend._domainkey` (Resend DKIM) - Already set up!
- SPF for Amazon SES on `send` subdomain
- MX records for Google and Amazon SES

---

## 🔧 Required DNS Changes

### 1. Update SPF Record for Root Domain

You need to add an SPF record at the root (`piffdeals.lv`) that includes **both** Resend and Amazon SES.

**Current situation:** You only have SPF on the `send` subdomain.

**Action:** Add a new TXT record at the root:

```
Type: TXT
Name: @ (or piffdeals.lv)
Content: v=spf1 include:amazonses.com include:resend.com ~all
Proxy status: DNS only
TTL: Auto
```

**Why?** This allows both Amazon SES (for your existing emails) and Resend (for invoices) to send emails.

**Important:** If you have an existing SPF record at the root, you should **combine them** instead of creating multiple SPF records (you can only have one SPF record per domain). Check if you have a TXT record with `v=spf1` for the root domain.

---

### 2. Add Second Resend DKIM Record (if needed)

You already have `resend._domainkey`, but Resend usually requires **2 DKIM records**.

**Check in Resend Dashboard:**
1. Go to Resend Dashboard → Domains → `piffdeals.lv`
2. Look at the DNS records section
3. If you see `resend2._domainkey`, add it:

```
Type: TXT
Name: resend2._domainkey
Content: [copy the exact value from Resend Dashboard]
Proxy status: DNS only
TTL: Auto
```

**If Resend only shows one DKIM record** and verification works, you're good!

---

### 3. Add DMARC Record (Recommended)

This helps prevent spam and improves deliverability.

```
Type: TXT
Name: _dmarc
Content: v=DMARC1; p=none; rua=mailto:dmarc@piffdeals.lv
Proxy status: DNS only
TTL: Auto
```

**Note:** 
- Start with `p=none` for testing (doesn't block anything)
- After testing, change to `p=quarantine` for production
- You can change `dmarc@piffdeals.lv` to any email you want to receive DMARC reports

---

## 📝 Step-by-Step: Adding Records in Cloudflare

### Step 1: Add/Update SPF Record

1. Go to Cloudflare Dashboard → Your Domain → **DNS**
2. Look for existing SPF record at root (search for TXT records with `v=spf1`)
3. If none exists, click **Add record**:
   - Type: `TXT`
   - Name: `@` (or leave empty, or `piffdeals.lv`)
   - Content: `v=spf1 include:amazonses.com include:resend.com ~all`
   - Proxy status: **DNS only** (turn proxy OFF - important!)
   - TTL: `Auto`
   - Click **Save**

4. If one exists, click **Edit** and update the Content to include Resend:
   - Old: `v=spf1 include:amazonses.com ~all`
   - New: `v=spf1 include:amazonses.com include:resend.com ~all`

### Step 2: Check Resend DKIM Records

1. Go to **Resend Dashboard** → Domains → `piffdeals.lv`
2. Check what DKIM records Resend requires
3. You already have `resend._domainkey` ✅
4. If Resend shows `resend2._domainkey` is needed:
   - Go to Cloudflare → DNS
   - Click **Add record**
   - Type: `TXT`
   - Name: `resend2._domainkey`
   - Content: [copy from Resend Dashboard]
   - Proxy status: **DNS only**
   - TTL: `Auto`
   - Click **Save**

### Step 3: Add DMARC Record

1. Go to Cloudflare → DNS
2. Click **Add record**
3. Type: `TXT`
4. Name: `_dmarc`
5. Content: `v=DMARC1; p=none; rua=mailto:dmarc@piffdeals.lv`
6. Proxy status: **DNS only** (turn proxy OFF)
7. TTL: `Auto`
8. Click **Save**

---

## ⚠️ Important Notes for Cloudflare

### DNS-Only (Proxy OFF) is Required!

For email-related DNS records (SPF, DKIM, DMARC, MX), you **MUST** set Proxy status to **DNS only** (orange cloud OFF).

**Why?** Email servers need to see the actual DNS records, not Cloudflare's proxy IPs.

**What to proxy:**
- ✅ A records (like your website `piffdeals.lv` → IP)
- ✅ CNAME records (like `www`)

**What NOT to proxy:**
- ❌ SPF records (TXT)
- ❌ DKIM records (TXT)
- ❌ DMARC records (TXT)
- ❌ MX records (already DNS only)

---

## ✅ Verification Steps

### 1. Verify in Resend Dashboard

1. After adding records, wait 5-10 minutes for DNS propagation
2. Go to Resend Dashboard → Domains → `piffdeals.lv`
3. Click **Verify** or **Re-verify**
4. Status should show **Verified** ✅

### 2. Check DNS Records Online

Use these tools to verify your records are correct:

- **MXToolbox SPF Checker**: https://mxtoolbox.com/spf.aspx
  - Enter: `piffdeals.lv`
  - Should show SPF includes both `amazonses.com` and `resend.com`

- **MXToolbox DKIM Checker**: https://mxtoolbox.com/dkim.aspx
  - Enter: `piffdeals.lv` and selector `resend`
  - Should show your DKIM record

- **DMARC Analyzer**: https://dmarcian.com/dmarc-xml/
  - Enter: `piffdeals.lv`
  - Should show your DMARC policy

---

## 📊 Summary: Cloudflare DNS Records

After setup, you should have:

| Type | Name | Content | Proxy | Purpose |
|------|------|---------|-------|---------|
| TXT | `@` | `v=spf1 include:amazonses.com include:resend.com ~all` | DNS only | SPF (allows sending) |
| TXT | `resend._domainkey` | `p=MIGfMA...` | DNS only | Resend DKIM #1 |
| TXT | `resend2._domainkey` | `p=...` (if needed) | DNS only | Resend DKIM #2 |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@piffdeals.lv` | DNS only | DMARC policy |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | DNS only | Amazon SES SPF |
| MX | `@` | `smtp.google.com` (priority 1) | DNS only | Google Mail |
| MX | `send` | `feedback-smtp.eu-west-1.amazonses.com` (priority 10) | DNS only | Amazon SES |

---

## 🚨 Common Issues

### Issue: "Domain not verified" in Resend

**Solution:**
1. Check all DNS records are **DNS only** (not proxied)
2. Wait up to 24 hours for DNS propagation
3. Verify records with MXToolbox tools
4. Make sure you copied DKIM values exactly from Resend

### Issue: Multiple SPF records detected

**Problem:** You can only have ONE SPF record per domain.

**Solution:**
1. Combine all includes into one SPF record
2. Delete any duplicate SPF records
3. Use: `v=spf1 include:amazonses.com include:resend.com ~all`

### Issue: Emails still going to spam

**Solution:**
1. Verify domain is marked as "Verified" in Resend
2. Check SPF/DKIM/DMARC records with MXToolbox
3. Start with low email volume to build reputation
4. Use proper FROM address (`info@piffdeals.lv`)

---

## 🎯 Quick Checklist

- [ ] Added/updated SPF record at root (`@`) with Resend included
- [ ] Verified `resend._domainkey` DKIM record exists
- [ ] Added `resend2._domainkey` if required by Resend
- [ ] Added DMARC record (`_dmarc`)
- [ ] All email records set to **DNS only** (proxy OFF)
- [ ] Verified domain in Resend Dashboard
- [ ] Tested sending an email
- [ ] Checked email arrives in inbox (not spam)

---

**Last Updated:** December 2024
**Cloudflare Setup Guide for Resend**



