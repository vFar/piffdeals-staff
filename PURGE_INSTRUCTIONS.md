# How to Purge Database Safely

## ⚠️ WARNING
**This will DELETE ALL DATA permanently!** Make sure you have backups if you need the data.

## 🧹 Method 1: Use the Purge Script (Recommended)

### Step 1: Run Purge Script
1. Go to Supabase Dashboard → SQL Editor
2. Open `purge-database.sql`
3. Copy the entire file
4. Paste in SQL Editor
5. Click **Run**
6. Wait for success ✅

### Step 2: Verify Everything is Deleted
After running, check the verification queries at the bottom:
- Should return **0 rows** for tables
- Should return **0 rows** for functions

### Step 3: Run Your Schema
Now run `database-schema.sql` to create fresh tables.

---

## 🧹 Method 2: Manual Purge (If Script Doesn't Work)

### Option A: Delete Data Only (Keep Table Structure)
```sql
-- Disable RLS
ALTER TABLE invoice_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Delete all data
DELETE FROM invoice_items;
DELETE FROM invoices;
DELETE FROM user_profiles;

-- Re-enable RLS
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
```

### Option B: Delete Everything (Tables + Data)
```sql
-- Drop everything
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
```

---

## 🧹 Method 3: Use Schema's Built-in Cleanup

The `database-schema.sql` file already has cleanup at the top:
- Lines 11-21 drop existing tables
- **Just run `database-schema.sql` directly** - it will clean up first!

**This is the easiest method** - no need to run purge separately!

---

## ✅ Recommended Approach

**Just run `database-schema.sql` directly:**
1. It has cleanup built-in (lines 11-21)
2. It will drop existing tables if they exist
3. Then create everything fresh
4. One file, one run, done!

**Only use `purge-database.sql` if:**
- You want to verify everything is deleted first
- You're having issues with the schema cleanup
- You want more control over the process

---

## 🔍 What Gets Deleted

### Deleted:
- ✅ All invoice_items records
- ✅ All invoices records
- ✅ All user_profiles records
- ✅ All tables (structure)
- ✅ All functions
- ✅ All triggers
- ✅ All security policies

### NOT Deleted:
- ❌ `auth.users` (Supabase Auth users - delete via Dashboard)
- ❌ Other Supabase system tables
- ❌ Your Supabase project settings

---

## 🚨 Important Notes

1. **Backup First** (if you have important data):
   - Export data via Supabase Dashboard → Table Editor
   - Or use SQL: `COPY table_name TO '/path/to/file.csv'`

2. **Auth Users**:
   - `auth.users` is NOT deleted by this script
   - Delete auth users via: Dashboard → Authentication → Users
   - Or they'll be deleted when you delete user_profiles (CASCADE)

3. **After Purging**:
   - Run `database-schema.sql` to recreate everything
   - Create your first super_admin user manually
   - Start using the system!

---

## 🎯 Quick Start (Easiest)

**Just run `database-schema.sql` - it handles cleanup automatically!**

1. Copy `database-schema.sql`
2. Paste in Supabase SQL Editor
3. Click Run
4. Done! ✅

The cleanup is built-in, so you don't need a separate purge step.

