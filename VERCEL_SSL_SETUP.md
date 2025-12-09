# Vercel SSL/HTTPS Setup Guide

## Why HTTPS is Important

🔒 **Security**: HTTPS encrypts data between your site and users, protecting sensitive information
✅ **Trust**: Browsers show a secure padlock icon, building user confidence
📧 **Email Images**: Email clients trust and display images from HTTPS sources better
🚀 **SEO**: Search engines favor HTTPS sites in rankings

## Understanding HTTP vs HTTPS on Vercel

### Vercel Automatically Provides HTTPS

**Good news**: Vercel provides **automatic HTTPS/SSL certificates** for all deployments! 🎉

- ✅ **Default Vercel domains** (e.g., `your-project.vercel.app`) have HTTPS by default
- ✅ **Custom domains** get SSL certificates automatically after proper DNS configuration

### Why HTTP Might Work But HTTPS Doesn't

If your custom domain `staff.piffdeals.lv` works with HTTP but not HTTPS, here's why:

#### Scenario 1: SSL Certificate Not Yet Provisioned
- When you first add a custom domain to Vercel, it takes **5-60 minutes** for the SSL certificate to be issued
- During this time, HTTPS won't work, but HTTP might (if configured)
- **Solution**: Wait for Vercel to automatically provision the SSL certificate

#### Scenario 2: DNS Not Fully Configured
- DNS records might be pointing to the right place for HTTP but not HTTPS
- Some DNS providers need time to propagate HTTPS records
- **Solution**: Verify DNS configuration (see below)

#### Scenario 3: Mixed Content Issues
- If your domain has partial SSL setup, browsers may block content
- **Solution**: Ensure all resources use HTTPS consistently

## Setting Up HTTPS for Your Custom Domain

### Step 1: Add Custom Domain in Vercel Dashboard

1. Go to your Vercel project dashboard
2. Click **Settings** → **Domains**
3. Click **Add Domain**
4. Enter your domain: `staff.piffdeals.lv`
5. Click **Add**

### Step 2: Configure DNS Records

Vercel will show you the DNS records to add. You need to add them in your domain registrar (where you bought `piffdeals.lv`).

**Required DNS Records:**

```
Type: A
Name: staff
Value: 76.76.21.21
```

OR (preferred for better performance):

```
Type: CNAME
Name: staff
Value: cname.vercel-dns.com
```

**Important Notes:**
- Add the DNS record at your domain registrar (GoDaddy, Namecheap, etc.)
- DNS propagation can take **15 minutes to 48 hours** (usually 1-2 hours)
- Vercel will show the status: "Valid Configuration" when DNS is correct

### Step 3: Wait for SSL Certificate

1. After DNS is configured correctly, Vercel automatically provisions an SSL certificate
2. This usually takes **5-60 minutes**
3. You can check status in Vercel Dashboard → Domains → Your Domain
4. Status will change from "Pending" → "Valid Configuration" → "SSL Certificate Active"

### Step 4: Verify HTTPS is Working

1. Visit: `https://staff.piffdeals.lv`
2. You should see a padlock icon (🔒) in your browser
3. The URL should show "Secure" in the address bar
4. Test an image: `https://staff.piffdeals.lv/images/S-3.png`

### Step 5: Update Environment Variable

Once HTTPS is working, update your Supabase Edge Function secret:

1. Go to Supabase Dashboard → Edge Functions → Secrets
2. Find or add: `PUBLIC_SITE_URL`
3. Set value to: `https://staff.piffdeals.lv` (with HTTPS!)
4. Save

## Troubleshooting

### Issue: "SSL Certificate Pending" for a Long Time

**Possible Causes:**
- DNS records not configured correctly
- DNS propagation still in progress
- Domain registrar blocking certificate provisioning

**Solutions:**
1. Verify DNS records match exactly what Vercel shows
2. Use a DNS checker tool: https://dnschecker.org/
3. Contact Vercel support if pending > 24 hours

### Issue: HTTPS Works in Browser But Not in Edge Function

**Possible Causes:**
- Edge Function trying to fetch before SSL is fully active
- Certificate chain issues
- Firewall/network blocking HTTPS requests

**Solutions:**
1. The code now tries HTTPS first, then falls back to HTTP automatically
2. Check Edge Function logs to see which protocol succeeds
3. Wait a few more minutes if certificate was just provisioned

### Issue: "Mixed Content" Warning

**Problem:** Site loads over HTTPS, but some resources use HTTP

**Solution:**
- Ensure all image URLs use HTTPS
- The email function automatically uses the protocol from `PUBLIC_SITE_URL`
- Check browser console for specific HTTP resources

### Issue: Certificate Shows as Invalid

**Possible Causes:**
- Self-signed certificate (shouldn't happen with Vercel)
- Certificate expired (Vercel auto-renews)
- Certificate doesn't match domain

**Solution:**
- Vercel handles all of this automatically
- If issue persists, remove and re-add the domain in Vercel

## Checking SSL Certificate Status

### Method 1: Vercel Dashboard
- Go to Project Settings → Domains
- Look at your domain status
- Should show: ✅ "Valid Configuration" and 🔒 "SSL Certificate Active"

### Method 2: Browser
- Visit `https://staff.piffdeals.lv`
- Click the padlock icon in address bar
- Click "Connection is secure" → "Certificate is valid"

### Method 3: Command Line
```bash
# Check SSL certificate details
openssl s_client -connect staff.piffdeals.lv:443 -servername staff.piffdeals.lv

# Quick test (should return 200)
curl -I https://staff.piffdeals.lv
```

## Forcing HTTPS (Recommended)

Once SSL is working, you should force all traffic to use HTTPS:

### Option 1: Vercel Automatic Redirect
Vercel automatically redirects HTTP → HTTPS for all deployments. No action needed!

### Option 2: Manual Redirect in vercel.json
If you want explicit control, you can add to `vercel.json`:

```json
{
  "redirects": [
    {
      "source": "/:path*",
      "has": [
        {
          "type": "header",
          "key": "x-forwarded-proto",
          "value": "http"
        }
      ],
      "destination": "https://staff.piffdeals.lv/:path*",
      "permanent": true
    }
  ]
}
```

## Summary: Quick Checklist

- [ ] Domain added in Vercel Dashboard
- [ ] DNS records configured at domain registrar
- [ ] DNS propagation complete (check with dnschecker.org)
- [ ] SSL certificate provisioned (check Vercel Dashboard)
- [ ] HTTPS working in browser (padlock icon visible)
- [ ] Images load via HTTPS: `https://staff.piffdeals.lv/images/S-3.png`
- [ ] `PUBLIC_SITE_URL` updated to `https://staff.piffdeals.lv` in Supabase secrets
- [ ] Test email sending - images should load via HTTPS

## Need Help?

- **Vercel Support**: https://vercel.com/support
- **Vercel SSL Documentation**: https://vercel.com/docs/security/ssl
- **Check DNS**: https://dnschecker.org/
- **Test SSL**: https://www.ssllabs.com/ssltest/

---

**Remember**: Vercel handles SSL certificates automatically. Once DNS is configured correctly, just wait 5-60 minutes for the certificate to be provisioned!










