# Creating Dummy Test Accounts

This guide explains how to create dummy test accounts for the Piffdeals Staff Portal.

## 📋 What Gets Created

**15 dummy accounts** with the following distribution:

### Employees (10 accounts)
- 8 active employees
- 1 inactive employee  
- 1 active employee

### Admins (3 accounts)
- 2 active admins
- 1 inactive admin

### Super Admins (2 accounts)
- 1 active super admin
- 1 suspended super admin

**Global Password:** `test1234` (for all accounts)

---

## ✅ Important: Two-Step User Creation

When you create accounts using these scripts, they will be added to **BOTH**:

1. ✅ **`auth.users`** - Supabase authentication system (allows login)
2. ✅ **`user_profiles`** - Your custom user profiles table (stores role, status, etc.)

This happens automatically through your Edge Function.

---

## 🚀 How to Use

### Prerequisites

Before running the scripts, you need:

1. **Supabase Edge Function deployed** - The `create-user` Edge Function must be deployed and working
2. **Project credentials** - Get these from Supabase Dashboard → Settings → API:
   - Project Reference (e.g., `abcdefghijklmnop`)
   - Anon/Public Key (starts with `eyJ...`)

### For Windows Users (PowerShell)

1. **Edit the script:**
   ```powershell
   notepad create-dummy-accounts.ps1
   ```

2. **Update configuration:**
   ```powershell
   $PROJECT_REF = "your-actual-project-ref"
   $ANON_KEY = "your-actual-anon-key"
   ```

3. **Run the script:**
   ```powershell
   .\create-dummy-accounts.ps1
   ```

### For Mac/Linux Users (Bash)

1. **Make the script executable:**
   ```bash
   chmod +x create-dummy-accounts.sh
   ```

2. **Edit the script:**
   ```bash
   nano create-dummy-accounts.sh
   # or
   vim create-dummy-accounts.sh
   ```

3. **Update configuration:**
   ```bash
   PROJECT_REF="your-actual-project-ref"
   ANON_KEY="your-actual-anon-key"
   ```

4. **Run the script:**
   ```bash
   ./create-dummy-accounts.sh
   ```

---

## 📊 Sample Output

```
============================================
Creating 15 dummy accounts...
Password for all: test1234
============================================

Creating: john.employee1@piffdeals.com (employee)... SUCCESS
Creating: jane.employee2@piffdeals.com (employee)... SUCCESS
Creating: bob.employee3@piffdeals.com (employee)... SUCCESS
...

============================================
SUMMARY
============================================
Total accounts: 15
Successful: 15
Failed: 0

All accounts use password: test1234
============================================
```

---

## 🔍 Verify Accounts Were Created

### Check in Supabase Dashboard

1. Go to **Authentication → Users** - Should see 15 new users
2. Go to **Table Editor → user_profiles** - Should see 15 new profiles with roles

### Check via SQL

```sql
-- Count users by role
SELECT role, COUNT(*) 
FROM user_profiles 
GROUP BY role;

-- Should return:
-- employee: 10
-- admin: 3
-- super_admin: 2

-- List all dummy accounts
SELECT email, username, role, status 
FROM user_profiles 
ORDER BY role, email;
```

---

## 🔐 Test Login

After creation, you can login with any of these accounts:

**Example Accounts:**
- Employee: `john.employee1@piffdeals.com` / `test1234`
- Admin: `tom.admin1@piffdeals.com` / `test1234`
- Super Admin: `rachel.superadmin1@piffdeals.com` / `test1234`

---

## 🛠️ Troubleshooting

### "ERROR: Please update PROJECT_REF and ANON_KEY"
- You forgot to update the configuration in the script
- Open the script and update the values at the top

### "Failed: No authorization header"
- Your ANON_KEY is incorrect
- Get it from Supabase Dashboard → Settings → API → Project API keys → `anon` `public`

### "Failed: User already exists"
- An account with that email already exists
- Either delete existing users or modify the email addresses in the script

### "Failed: Missing required fields"
- The Edge Function is not receiving all required data
- Ensure your Edge Function is properly deployed

### Edge Function Not Found (404)
- The `create-user` Edge Function is not deployed
- Deploy it first using `deploy-edge-function.ps1` or `deploy-edge-function.sh`

---

## 🗑️ Clean Up Dummy Accounts

To delete all dummy accounts later:

```sql
-- Delete all dummy accounts (be careful!)
DELETE FROM user_profiles 
WHERE email LIKE '%@piffdeals.com' 
AND email LIKE '%.employee%' 
OR email LIKE '%.admin%' 
OR email LIKE '%.superadmin%';

-- Note: This will also delete the auth.users records
-- due to ON DELETE CASCADE
```

Or manually delete them in Supabase Dashboard:
1. **Table Editor → user_profiles** - Delete profile rows
2. **Authentication → Users** - Delete auth users

---

## 📝 Customizing Accounts

Want different accounts? Edit the arrays in the scripts:

**PowerShell (`create-dummy-accounts.ps1`):**
```powershell
$dummyAccounts = @(
    @{ email = "your.email@domain.com"; username = "Your Name"; role = "employee"; status = "active" },
    # Add more...
)
```

**Bash (`create-dummy-accounts.sh`):**
```bash
declare -a accounts=(
    "your.email@domain.com|Your Name|employee|active"
    # Add more...
)
```

---

## ❓ Common Questions

### Q: Will these accounts receive email confirmations?
**A:** No, the Edge Function creates users with `email_confirm: true`, so emails are auto-confirmed.

### Q: Can I change the password later?
**A:** Yes, users can change their password through the app, or you can reset it via Supabase Dashboard.

### Q: Can I use this in production?
**A:** This is for **testing/development only**. In production, create real accounts with proper data.

### Q: What if I want more/fewer accounts?
**A:** Edit the script and add/remove entries from the accounts array.

---

## 🎯 Next Steps

After creating dummy accounts:
1. ✅ Test login with different roles
2. ✅ Test permissions (employees can't create users, admins can, etc.)
3. ✅ Test invoice creation as different users
4. ✅ Test the user management page (UserAccounts.jsx)
5. ✅ Delete dummy accounts when done testing

