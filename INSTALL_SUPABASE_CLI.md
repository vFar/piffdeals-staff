# Installing Supabase CLI on Windows

## Quick Install (Recommended)

### Option 1: Using npm (Easiest)

If you have Node.js installed:

```powershell
npm install -g supabase
```

**Verify installation:**
```powershell
supabase --version
```

---

### Option 2: Using Scoop (Windows Package Manager)

**Step 1: Install Scoop (if not installed)**
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex
```

**Step 2: Add Supabase bucket**
```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
```

**Step 3: Install Supabase CLI**
```powershell
scoop install supabase
```

**Verify installation:**
```powershell
supabase --version
```

---

## After Installation: Deploy Email Function

Once Supabase CLI is installed, you can deploy the email function:

### Quick Deploy (Simple)
```powershell
# 1. Login to Supabase
supabase login

# 2. Link your project (get project ref from Supabase Dashboard > Settings > General)
supabase link --project-ref YOUR_PROJECT_REF

# 3. Deploy the function
supabase functions deploy send-invoice-email --no-verify-jwt
```

### Or Use the Script
```powershell
.\deploy-email-function.ps1
```

---

## Alternative: Deploy via Supabase Dashboard

If you can't install CLI, you can deploy manually:

1. **Go to Supabase Dashboard**
2. **Navigate to:** Edge Functions → Create New Function
3. **Name:** `send-invoice-email`
4. **Copy the code from:** `supabase/functions/send-invoice-email/index.ts`
5. **Paste it into the editor**
6. **Click Deploy**

**Set Environment Variables:**
- Go to **Project Settings** → **Edge Functions** → **Secrets**
- Add:
  - `RESEND_API_KEY` = `re_xxxxx...`
  - `FROM_EMAIL` = `info@piffdeals.lv`
  - `COMPANY_NAME` = `Piffdeals`
  - `PUBLIC_SITE_URL` = `https://staff.piffdeals.lv`

---

## Troubleshooting

### "npm is not recognized"
**Install Node.js first:**
- Download from: https://nodejs.org/
- Install and restart PowerShell

### "scoop is not recognized"
Use Option 1 (npm) instead, or install Scoop first (instructions above).

### Still having issues?
Use the **Supabase Dashboard method** above (no CLI needed).



