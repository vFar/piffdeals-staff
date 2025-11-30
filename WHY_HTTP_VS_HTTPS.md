# Why HTTP Works But HTTPS Doesn't (Yet)

## Quick Answer

**Vercel automatically provides HTTPS/SSL certificates**, but they take time to be set up after you add a custom domain.

## What's Happening

### Current Situation
- ✅ **HTTP works**: `http://staff.piffdeals.lv` loads images
- ❌ **HTTPS might not work yet**: `https://staff.piffdeals.lv` might fail

### Why This Happens

When you add a custom domain like `staff.piffdeals.lv` to Vercel:

1. **DNS needs to be configured** (points your domain to Vercel)
2. **SSL certificate needs to be created** (takes 5-60 minutes)
3. **Certificate needs to be activated** (automatic, but needs time)

During the setup period:
- ✅ HTTP might work (if DNS is configured)
- ❌ HTTPS won't work (certificate not ready yet)

### The Timeline

```
Time 0: Add domain to Vercel
  ↓
Time 5-60 min: Vercel creates SSL certificate automatically
  ↓
Time 60+ min: HTTPS works! 🔒
```

## What Vercel Gives You (For Free!)

✅ **Automatic SSL certificates** - No manual setup needed
✅ **Auto-renewal** - Certificates renew automatically
✅ **HTTPS by default** - All traffic is encrypted
✅ **HTTP → HTTPS redirect** - Automatically redirects insecure connections

## Why HTTPS is Better

### 1. **Security** 🔒
- Encrypts data between browser and server
- Protects passwords, invoices, and sensitive data
- Prevents "man-in-the-middle" attacks

### 2. **Email Images** 📧
- Email clients (Gmail, Outlook, etc.) trust HTTPS images
- Images load reliably in emails
- Better deliverability

### 3. **Browser Trust** 🌐
- Shows padlock icon (🔒) in address bar
- Users trust your site more
- Modern browsers warn users about HTTP sites

### 4. **SEO** 📈
- Google ranks HTTPS sites higher
- Better search engine visibility

## What You Need to Do

### Step 1: Wait for SSL Certificate (5-60 minutes)

After adding your domain to Vercel:
1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Check the status of `staff.piffdeals.lv`
3. Wait until it shows: ✅ "Valid Configuration" and 🔒 "SSL Certificate Active"

### Step 2: Verify HTTPS Works

Test in your browser:
```
https://staff.piffdeals.lv
```

You should see:
- ✅ Padlock icon (🔒) in address bar
- ✅ "Secure" text next to URL
- ✅ Images load: `https://staff.piffdeals.lv/images/S-3.png`

### Step 3: Update Your Configuration

Once HTTPS is working:

1. **Update Supabase Secret:**
   - Go to Supabase Dashboard → Edge Functions → Secrets
   - Find `PUBLIC_SITE_URL`
   - Change from: `http://staff.piffdeals.lv`
   - Change to: `https://staff.piffdeals.lv` (with HTTPS!)

2. **Code Already Updated:**
   - The email function now prefers HTTPS first
   - Falls back to HTTP if HTTPS fails (during certificate provisioning)
   - Once HTTPS is active, it will use HTTPS automatically

## The Code Now

The updated code:
1. **Prefers HTTPS first** (more secure, better for emails)
2. **Falls back to HTTP** if HTTPS fails (handles certificate provisioning period)
3. **Tries both protocols** automatically to ensure images load

This means:
- ✅ During setup: Uses HTTP (works immediately)
- ✅ After setup: Uses HTTPS (more secure, better for emails)
- ✅ Always works: Automatically finds the working protocol

## Common Questions

### Q: Do I need to buy an SSL certificate?
**A:** No! Vercel provides SSL certificates automatically for free. 🎉

### Q: How long does it take?
**A:** Usually 5-60 minutes after DNS is configured correctly.

### Q: Will it break if I wait?
**A:** No. HTTP works fine temporarily. HTTPS is better, but not urgent.

### Q: Can I speed it up?
**A:** Not really - it's automatic. Just make sure DNS is configured correctly.

### Q: What if HTTPS never works?
**A:** 
1. Check DNS configuration in Vercel Dashboard
2. Verify DNS records at your domain registrar
3. Contact Vercel support (usually resolves in < 24 hours)

### Q: Should I use HTTP or HTTPS for PUBLIC_SITE_URL?
**A:** Once HTTPS works, use HTTPS! It's more secure and better for email images.

## Summary

| Aspect | HTTP | HTTPS |
|--------|------|-------|
| Security | ❌ Not encrypted | ✅ Encrypted |
| Email Images | ⚠️ May be blocked | ✅ Always loads |
| Browser Trust | ⚠️ Warning shown | ✅ Padlock icon |
| Setup Time | ✅ Works immediately | ⏱️ 5-60 minutes |
| Cost | ✅ Free | ✅ Free (Vercel) |

**Bottom Line:** Use HTTPS once it's ready. The code automatically handles both protocols, so images will load either way!

---

**See `VERCEL_SSL_SETUP.md` for detailed setup instructions.**

