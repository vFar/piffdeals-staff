# Quick Reference: Purge & Create Test Users

## 🚀 **2-Step Process**

### Step 1: Purge All Users
```
Open: Supabase Dashboard → SQL Editor
Run: purge-all-users.sql
```

### Step 2: Create Test Accounts
```powershell
# Windows (PowerShell)
.\create-test-accounts-simple.ps1

# Mac/Linux (Bash)
chmod +x create-test-accounts-simple.sh
./create-test-accounts-simple.sh
```

---

## 🔐 Test Accounts Created

| Email | Password | Role | Access Level |
|-------|----------|------|--------------|
| `employee@test.com` | `test1234` | Employee | Limited - own invoices only |
| `admin@test.com` | `test1234` | Admin | Can manage employees + all invoices |
| `superadmin@test.com` | `test1234` | Super Admin | Full system access |

---

## ✅ Verify It Worked

1. **Check SQL output:** Should show `0` users in both tables
2. **Check PowerShell output:** Should show "3/3 SUCCESS"
3. **Login test:** Try `employee@test.com` / `test1234`

---

## 📁 Files You Need

| File | What It Does |
|------|--------------|
| `purge-all-users.sql` | Deletes ALL users (both tables) |
| `create-test-accounts-simple.ps1` | Creates 3 test accounts (Windows) |
| `create-test-accounts-simple.sh` | Creates 3 test accounts (Mac/Linux) |

---

## 🛠️ If Something Goes Wrong

**"User already exists"**
→ Run `purge-all-users.sql` again

**"404 Edge Function not found"**
→ Deploy function: `.\deploy-edge-function.ps1`

**Can't login**
→ Check password is exactly: `test1234`

---

## 🎯 Full Guide

See: `PURGE_AND_CREATE_USERS_GUIDE.md` for complete details.






