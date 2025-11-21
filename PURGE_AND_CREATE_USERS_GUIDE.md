# Complete User Purge & Test Account Creation Guide

This guide will help you **completely wipe all user accounts** and **create fresh test accounts** with different roles.

---

## 🧹 Part 1: Purge ALL User Accounts

### Option A: Using SQL Script (Recommended)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/emqhyievrsyeinwrqqhw
   - Navigate to: **SQL Editor**

2. **Run the Purge Script**
   - Open the file: `purge-all-users.sql`
   - Copy all the contents
   - Paste into the SQL Editor
   - Click **Run** (or press Ctrl+Enter)
   - Wait for "Success ✓"

3. **Verify Everything is Deleted**
   The script will show you the verification results:
   - `user_profiles_count`: should be **0**
   - `auth_users_count`: should be **0**

### Option B: Manual Delete via Dashboard

1. **Delete User Profiles**
   - Dashboard → **Table Editor** → `user_profiles`
   - Select all rows → **Delete**

2. **Delete Auth Users**
   - Dashboard → **Authentication** → **Users**
   - For each user → **...** menu → **Delete User**
   - (Or select multiple → **Delete**)

---

## ✅ Part 2: Create New Test Accounts

You have **two options** for creating test accounts:

### Option 1: Simple (3 Accounts - One Per Role) 🎯 **RECOMMENDED FOR QUICK TESTING**

**What gets created:**
- ✅ `employee@test.com` - Employee role
- ✅ `admin@test.com` - Admin role  
- ✅ `superadmin@test.com` - Super Admin role

**All passwords:** `test1234`

**How to run:**
```powershell
.\create-test-accounts-simple.ps1
```

### Option 2: Full (15 Accounts - Mixed Roles & Statuses)

**What gets created:**
- 10 employees (8 active, 1 inactive, 1 active)
- 3 admins (2 active, 1 inactive)
- 2 super admins (1 active, 1 suspended)

**All passwords:** `test1234`

**How to run:**
```powershell
.\create-dummy-accounts.ps1
```

---

## 🚀 Complete Workflow (Start to Finish)

### Step 1: Purge Everything
```powershell
# In Supabase SQL Editor, run:
# - purge-all-users.sql
```

### Step 2: Create Test Accounts
```powershell
# In PowerShell, run:
.\create-test-accounts-simple.ps1
```

### Step 3: Test Login
```
Go to your app and login with:
- employee@test.com / test1234
- admin@test.com / test1234  
- superadmin@test.com / test1234
```

---

## 📊 What Each Role Can Do

### 🔹 Employee
- ✅ Create/edit their own invoices (drafts only)
- ✅ View their own invoices
- ✅ View their own profile
- ❌ Cannot create users
- ❌ Cannot view other users' invoices
- ❌ Cannot access User Accounts page

### 🔸 Admin
- ✅ Everything an Employee can do
- ✅ View ALL invoices
- ✅ Create/edit ALL invoices
- ✅ Create new users (employees only)
- ✅ Update employee accounts
- ✅ Access User Accounts page
- ❌ Cannot create/modify admins or super admins
- ❌ Cannot delete users

### 🔴 Super Admin
- ✅ Everything an Admin can do
- ✅ Create users with ANY role (employee, admin, super_admin)
- ✅ Update ANY user account
- ✅ Delete users
- ✅ Full system access

---

## 🧪 Testing Checklist

After creating accounts, test these scenarios:

### As Employee (`employee@test.com`)
- [ ] Login successfully
- [ ] Create a new invoice
- [ ] Edit your draft invoice
- [ ] View your invoices list
- [ ] Try accessing `/user-accounts` (should redirect)
- [ ] View your profile

### As Admin (`admin@test.com`)
- [ ] Login successfully
- [ ] View all invoices (from all users)
- [ ] Create a new user (employee only)
- [ ] Try creating an admin user (should fail)
- [ ] Access User Accounts page
- [ ] Update an employee's status

### As Super Admin (`superadmin@test.com`)
- [ ] Login successfully
- [ ] Create users with all roles
- [ ] Delete a user
- [ ] Update any user's role
- [ ] Access all pages without restrictions

---

## 🛠️ Troubleshooting

### Problem: "Failed: User already exists"
**Solution:** You didn't purge properly. Run `purge-all-users.sql` again.

### Problem: Script shows "FAILED: No authorization header"
**Solution:** Your `ANON_KEY` in the script is wrong. Get it from:
- Dashboard → **Settings** → **API** → Copy "anon public" key

### Problem: "404 Not Found - Edge Function"
**Solution:** The `create-user` Edge Function isn't deployed. Deploy it:
```powershell
.\deploy-edge-function.ps1
```

### Problem: Can't login after creating account
**Solution:** Check:
1. Email is confirmed in Dashboard → Authentication → Users
2. User status is "active" in Dashboard → Table Editor → user_profiles
3. You're using password: `test1234`

---

## 📝 Files Reference

| File | Purpose |
|------|---------|
| `purge-all-users.sql` | **NEW** - Completely wipes all users (profiles + auth) |
| `create-test-accounts-simple.ps1` | **NEW** - Creates 3 test accounts (one per role) |
| `create-dummy-accounts.ps1` | Creates 15 test accounts with variety |
| `purge-database.sql` | Old purge (doesn't delete auth.users) |

---

## 🎯 Quick Commands

```powershell
# 1. Purge everything (run in Supabase SQL Editor)
# Open: purge-all-users.sql → Copy → Paste → Run

# 2. Create 3 simple test accounts
.\create-test-accounts-simple.ps1

# 3. Or create 15 diverse accounts
.\create-dummy-accounts.ps1
```

---

## ⚠️ Important Notes

1. **Purging is permanent** - There's no undo. Make backups if needed.
2. **All test passwords are `test1234`** - Change them in production!
3. **Auth + Profiles** - Both must be created together or users can't login.
4. **RLS is enforced** - Policies control what each role can access.
5. **Edge Function required** - Make sure `create-user` is deployed.

---

## ✅ Success Criteria

You'll know it worked when:
- ✅ SQL purge shows 0 users in both tables
- ✅ PowerShell script shows "3/3 SUCCESS" (or "15/15 SUCCESS")
- ✅ You can login with `employee@test.com`, `admin@test.com`, `superadmin@test.com`
- ✅ Each role has correct permissions in the app

---

**Happy Testing!** 🎉






