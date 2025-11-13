# Database Schema Explained - What You're About to Run

## 📋 Overview

This SQL file will create **3 main tables** for your staff portal:
1. **user_profiles** - Stores all staff user accounts
2. **invoices** - Stores all invoices created by staff
3. **invoice_items** - Stores the products/items within each invoice

Plus some helper functions and security rules.

---

## 🧹 Part 1: Cleanup (Lines 6-22)

**What it does:**
- Deletes any existing tables if they already exist
- Deletes any existing functions
- **Safe to run** - won't error if nothing exists yet

**Why it's there:**
- Lets you run this file multiple times without errors
- Cleans up old versions if you're updating

**⚠️ WARNING:** This will DELETE all existing data in those tables if you run it!

---

## 👥 Part 2: User Profiles Table (Lines 24-111)

### What it creates:
A table to store all your staff members.

### Fields:
- **id** - Links to Supabase auth user (automatic)
- **email** - User's email address (unique, required)
- **username** - Name and last name (for display, not unique)
- **role** - Can be: `employee`, `admin`, or `super_admin` (default: employee)
- **status** - Can be: `active`, `inactive`, or `suspended` (default: active)
- **created_at** - When account was created (automatic)
- **updated_at** - When account was last updated (automatic)
- **last_login** - When user last logged in

### Security Rules (RLS Policies):
- ✅ Users can view their own profile
- ✅ Users can update their own profile
- ✅ Admins can view all profiles
- ✅ Admins can create new user profiles
- ✅ Admins can update employee profiles
- ✅ Super admins can update anyone
- ✅ Super admins can delete users

### Helper Function:
- **handle_updated_at()** - Automatically updates `updated_at` timestamp when record changes

---

## 📄 Part 3: Invoices Table (Lines 130-232)

### What it creates:
A table to store all invoices created by your staff.

### Fields:

**Basic Info:**
- **id** - Unique invoice ID (automatic)
- **invoice_number** - Invoice number like "INV-001" (unique, required)

**Customer Info:**
- **customer_name** - Client's name (required)
- **customer_email** - Client's email
- **customer_address** - Client's address
- **customer_phone** - Client's phone

**Status:**
- **status** - Can be: `draft`, `sent`, `paid`, `pending`, `overdue`, `cancelled` (default: draft)

**Money:**
- **subtotal** - Total before tax/discount
- **tax_rate** - Tax percentage (e.g., 21 for 21%)
- **tax_amount** - Calculated tax
- **discount_amount** - Any discount applied
- **total** - Final amount (subtotal + tax - discount)

**Dates:**
- **issue_date** - When invoice was created (default: today)
- **due_date** - When payment is due
- **paid_date** - When payment was received

**Other:**
- **notes** - Additional notes about invoice
- **payment_terms** - Like "net_30", "net_15", "due_on_receipt"
- **user_id** - Which staff member created it (required)
- **sent_at** - When invoice was sent to client
- **created_at** - When invoice was created (automatic)
- **updated_at** - When invoice was last updated (automatic)

### Security Rules (RLS Policies):
- ✅ Employees can view their own invoices
- ✅ Admins can view ALL invoices
- ✅ Anyone can create invoices (linked to their user_id)
- ✅ **Only draft invoices can be edited** (by creator or admin)
- ✅ **Sent/paid/pending/overdue invoices are LOCKED** (cannot be edited)
- ✅ Employees can delete their own draft invoices
- ✅ Admins can delete any invoice

### Indexes (for fast searching):
- Index on user_id (find invoices by creator)
- Index on status (filter by status)
- Index on issue_date (sort by date)
- Index on invoice_number (find by number)
- Index on due_date (find overdue invoices)

---

## 📦 Part 4: Invoice Items Table (Lines 235-334)

### What it creates:
A table to store each product/item within an invoice.

**Why separate table?**
- One invoice can have multiple products
- Example: Invoice #123 has Product A (qty 2), Product B (qty 5), Product C (qty 1)
- This creates 3 records in invoice_items table

### Fields:
- **id** - Unique item ID (automatic)
- **invoice_id** - Which invoice this item belongs to (required)
- **product_id** - Product ID from Mozello API
- **product_name** - Product name (required)
- **product_sku** - Product SKU code
- **product_description** - Product description
- **quantity** - How many items (must be > 0)
- **unit_price** - Price per item
- **total** - quantity × unit_price
- **created_at** - When item was added (automatic)

### Security Rules (RLS Policies):
- ✅ Users can view items from invoices they can access
- ✅ Users can add items to their own invoices
- ✅ **Only draft invoices can have items updated/deleted**
- ✅ **Sent/paid/pending/overdue invoices are LOCKED** (items cannot be changed)

### Indexes:
- Index on invoice_id (find all items for an invoice)
- Index on product_id (find all invoices with a product)

---

## 🔒 Security Features

### Row Level Security (RLS):
- All tables have RLS enabled
- Users can only see/modify data they're allowed to
- Database-level security (can't be bypassed)

### Key Security Rules:
1. **Employees** can only edit their own draft invoices
2. **Admins** can view/edit all invoices
3. **Sent/paid/pending/overdue invoices** are locked (no edits)
4. **Only admins** can create user accounts
5. **Only super admins** can delete users

---

## 📊 What Gets Created

### Tables:
1. ✅ `user_profiles` - Staff accounts
2. ✅ `invoices` - All invoices
3. ✅ `invoice_items` - Products in each invoice

### Functions:
1. ✅ `handle_updated_at()` - Auto-updates timestamps

### Triggers:
1. ✅ `on_user_profile_updated` - Updates timestamp on profile changes
2. ✅ `on_invoice_updated` - Updates timestamp on invoice changes

### Indexes:
- 5 indexes on invoices table (for fast queries)
- 2 indexes on invoice_items table (for fast queries)

### Security Policies:
- 6 policies on user_profiles
- 4 policies on invoices
- 4 policies on invoice_items

---

## ✅ What This Enables

After running this SQL:

1. **User Management**
   - Store staff accounts with roles and statuses
   - Track who created what
   - Control access based on roles

2. **Invoice Management**
   - Create invoices with customer info
   - Add multiple products to each invoice
   - Track invoice status (draft → sent → paid)
   - Lock sent invoices from editing
   - Track payment dates and deadlines

3. **Security**
   - Employees can only edit their own drafts
   - Admins have full access
   - Database enforces rules automatically

4. **Data Integrity**
   - Unique invoice numbers
   - Required fields enforced
   - Automatic timestamps
   - Foreign key relationships (can't delete user if they have invoices)

---

## 🚀 Ready to Run?

**To use this:**
1. Copy the entire `database-schema.sql` file
2. Go to Supabase Dashboard → SQL Editor
3. Paste and click "Run"
4. Wait for success message ✅

**What happens:**
- All 3 tables created
- All security rules applied
- All indexes created
- Ready to use!

**After running:**
- You'll need to manually create your first super_admin user
- Then you can create other users through the app

---

## 📝 Summary

**You're creating:**
- A user system with 3 roles (employee, admin, super_admin)
- An invoice system that tracks all invoices
- A product items system for invoice line items
- Complete security so users can only do what they're allowed
- Automatic timestamp tracking

**Total:**
- 3 tables
- 1 function
- 2 triggers
- 7 indexes
- 14 security policies

**Result:**
A fully functional database ready for your staff portal! 🎉

