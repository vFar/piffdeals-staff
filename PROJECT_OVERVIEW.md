# Piffdeals Staff Portal - Project Overview

## What is this?

**staff.piffdeals.lv** is the internal staff management system for **piffdeals.lv** ecommerce shop.

### Context
- **piffdeals.lv** = Main ecommerce website (built on Mozello platform)
- **staff.piffdeals.lv** = This project - Staff portal for managing invoices and operations

## Purpose

Staff members use this portal to:
- Create invoices for clients who purchase **outside** the main ecommerce website
- Manage products from the piffdeals.lv catalog
- Send invoices to clients via email or PDF link
- View analytics and charts
- Manage user accounts (admins only)

## User Roles & Permissions

### 👤 **EMPLOYEE**
- ✅ Create invoices
- ✅ View all invoices
- ✅ Edit/Delete own invoices
- ✅ Download invoices (PDF)
- ✅ Send invoices via email
- ✅ Generate PDF links for invoices
- ✅ View products table
- ✅ View charts/analytics
- ✅ View own profile
- ✅ Change own password
- ❌ Cannot manage users
- ❌ Cannot access user accounts page

### 🛡️ **ADMIN**
- ✅ Everything employees can do
- ✅ View all invoices (not just own)
- ✅ Edit/Delete any invoice
- ✅ CRUD operations on user accounts
- ✅ Create employee accounts
- ✅ Manage employee profiles
- ✅ Suspend/activate employees
- ✅ View all charts and analytics
- ❌ Cannot create other admins
- ❌ Cannot manage other admins

### 👑 **SUPER_ADMIN**
- ✅ Everything admins can do
- ✅ Create admin accounts
- ✅ Manage admin accounts
- ✅ Delete user accounts
- ✅ Full system access

## Key Features

### Invoice Management
- Create invoices with products from piffdeals.lv catalog
- Invoice statuses: `draft`, `sent`, `paid`, `pending`, `overdue`, `cancelled`
- List products in invoice (stored as invoice_items)
- Send invoice to client via email
- Generate PDF link for invoice
- Download invoice as PDF
- Full CRUD operations (all authenticated users)
- Track invoice payment status and deadlines

### Product Management
- View products from piffdeals.lv (loaded directly from Mozello API)
- Products are fetched from API when needed
- **Stock count can be updated** - when invoice is created/paid, update stock in Mozello API
- Products are NOT stored in database, fetched on-demand from API

### Analytics & Charts
- View sales charts
- Revenue tracking
- Invoice statistics
- Product performance

### User Management (Admins Only)
- Create employee accounts
- Edit user profiles
- Change user roles
- Suspend/activate users
- View user activity

## Authentication & Routes

### Route Protection
- **`/login`** - Public route, but redirects to `/dashboard` if user is already logged in
- **All other routes** - Require authentication
- If not authenticated → redirect to `/login`
- If authenticated → cannot access `/login` (redirects to `/dashboard`)

### Password Management
- Any logged-in user can change their own password
- Password change available in user profile/settings

## Technical Stack

- **Frontend**: React + Vite
- **UI Library**: Ant Design
- **Backend**: Supabase (PostgreSQL + Auth)
- **Routing**: React Router
- **State Management**: React Context (AuthContext)

## Database Tables

### Required Tables
- `user_profiles` - User accounts with roles and statuses
- `invoices` - Invoice records with statuses (draft, sent, paid, pending, overdue, cancelled)
- `invoice_items` - Products/items within each invoice (see explanation below)

### Optional Tables
- `customers` - Client database (if you want to reuse customer data, otherwise store in invoice)
- `activity_logs` - User activity audit trail (optional)

### Not Needed
- `products` - Products come from Mozello API, not stored in database
- `stock_adjustments` - Stock updates happen directly via API, no need to track separately

## Table Explanations

### `invoices`
Main invoice record containing:
- Invoice number (unique)
- Customer info (name, email, address)
- Status: `draft`, `sent`, `paid`, `pending`, `overdue`, `cancelled`
- Totals (subtotal, tax, discount, total)
- Dates (issue_date, due_date, paid_date)
- Payment terms
- Links to user who created it
- **Purpose**: Track all invoices with their statuses and payment info

### `invoice_items` - Why This Table Exists

**The Problem:**
One invoice can contain multiple products. For example:
- Invoice #123 might have: Product A (quantity 2), Product B (quantity 5), Product C (quantity 1)

**Why Not Store in Invoices Table?**
You could store products as JSON array in invoices table, but that's bad because:
- ❌ Can't query individual products easily
- ❌ Can't calculate totals per product
- ❌ Can't filter invoices by product
- ❌ Hard to generate reports

**With invoice_items Table:**
- ✅ One invoice → Many invoice_items (proper relational structure)
- ✅ Each invoice_item = One product/line in the invoice
- ✅ Easy to query: "Show all invoices containing Product X"
- ✅ Easy to calculate: "Total quantity of Product Y sold"
- ✅ Clean structure for PDF generation

**Structure:**
```
invoices table:
- id: uuid
- invoice_number: "INV-001"
- customer_name: "John Doe"
- status: "paid"
- total: 150.00
- ...

invoice_items table:
- id: uuid
- invoice_id: (links to invoices.id)
- product_name: "Product A" (from API)
- product_id: "api-product-123" (from Mozello API)
- quantity: 2
- unit_price: 25.00
- total: 50.00

- id: uuid
- invoice_id: (same invoice)
- product_name: "Product B"
- product_id: "api-product-456"
- quantity: 5
- unit_price: 20.00
- total: 100.00
```

**Yes, it creates many records**, but that's normal and efficient:
- Invoice with 10 products = 1 invoice + 10 invoice_items
- Database handles this easily (indexed by invoice_id)
- Much better than storing as JSON or comma-separated values

**Alternative (Simpler but Less Flexible):**
If you want fewer tables, you could store invoice items as JSON in invoices table:
```json
{
  "items": [
    {"product_name": "Product A", "quantity": 2, "price": 25},
    {"product_name": "Product B", "quantity": 5, "price": 20}
  ]
}
```
But this makes queries and reports harder.

## Important Notes

1. **Invoices are for clients who DON'T purchase through the main website**
   - Main website (piffdeals.lv) handles its own orders
   - Staff portal handles manual/offline orders

2. **Products come from Mozello API - NO database storage**
   - Products are fetched directly from Mozello API when needed
   - Products are NOT stored in database
   - **Stock updates happen via API** - when invoice is created/paid, update stock in Mozello
   - Staff selects products from API to add to invoices
   - Product info (name, price, etc.) is stored in invoice_items when invoice is created

3. **Invoice Structure**
   - `invoices` table = One record per invoice (header: customer, totals, status, dates)
   - `invoice_items` table = Multiple records per invoice (each product/line item)
   - Example: Invoice #123 has 3 invoice_items (3 different products)
   - This structure allows proper queries and reports

4. **Invoice Statuses & Rules**

   **`draft`** - Being created, not sent yet
   - ✅ Can be edited by: Admin (any) OR Employee who created it
   - ✅ Can be deleted by: Admin (any) OR Employee who created it
   - ✅ Can be sent (changes to `sent`)
   - ❌ Cannot be paid (must be sent first)

   **`sent`** - Sent to client, awaiting payment
   - ❌ **LOCKED** - Cannot be edited by anyone (including admins)
   - ✅ Can be updated to: `paid`, `pending`, `overdue`, `cancelled`
   - ✅ Can be cancelled by: Anyone (admin or employee)
   - ❌ Cannot be deleted

   **`paid`** - Payment received
   - ❌ **LOCKED** - Cannot be edited by anyone
   - ✅ Can be cancelled (if payment was refunded/error)
   - ❌ Cannot be deleted
   - ✅ Stock should be updated in Mozello API when status changes to paid

   **`pending`** - Payment in process (e.g., bank transfer pending)
   - ❌ **LOCKED** - Cannot be edited by anyone
   - ✅ Can be updated to: `paid`, `overdue`, `cancelled`
   - ❌ Cannot be deleted

   **`overdue`** - Past due date, not paid
   - ❌ **LOCKED** - Cannot be edited by anyone
   - ✅ Can be updated to: `paid`, `cancelled`
   - ❌ Cannot be deleted
   - 🔄 **Auto-update logic**: Invoice becomes overdue when:
     - `due_date` has passed (is in the past)
     - Status is `sent` or `pending` (not `paid` or `cancelled`)
   - **Note**: System can automatically check and update status daily, or admin can manually mark as overdue

   **`cancelled`** - Invoice cancelled
   - ❌ **LOCKED** - Cannot be edited by anyone
   - ✅ Can be cancelled by: Anyone (admin or employee) at any time
   - ✅ Stays in database (for records/audit)
   - ❌ Cannot be deleted
   - ✅ Can be updated back to `draft` (if cancelled by mistake before sending)

5. **Invoice Editing Rules**
   - **Draft invoices**: Can be edited by creator (employee) or any admin
   - **Sent/Paid/Pending/Overdue invoices**: LOCKED - cannot be edited by anyone
   - **Cancelled invoices**: LOCKED - cannot be edited, but can be uncancelled back to draft if needed
   - **Deletion**: Only draft invoices can be deleted by employees, admins can delete any

6. **Session management**
   - Active sessions prevent access to `/login`
   - Users are automatically redirected if already logged in

7. **Customers**
   - Can be stored in `customers` table if you want to reuse customer data
   - OR just store customer info directly in each invoice (simpler)

8. **Stock Updates**
   - When invoice status changes to `paid`, stock is updated in Mozello API
   - Stock is NOT updated when invoice is created or sent (only when paid)
   - No need to track stock changes in database
   - API handles stock synchronization

9. **Overdue Invoice Logic**
   - **When does invoice become overdue?**
     - When `due_date` is in the past (today's date > due_date)
     - AND status is `sent` or `pending` (not `paid` or `cancelled`)
   - **Payment terms determine due date:**
     - `net_30` = due_date = issue_date + 30 days
     - `net_15` = due_date = issue_date + 15 days
     - `due_on_receipt` = due_date = issue_date (immediate)
   - **How to handle overdue:**
     - **Implementation**: Automatic daily check via cron job (pg_cron in Supabase)
       - Runs daily (e.g., at midnight or early morning)
       - Checks all invoices with status `sent` or `pending`
       - Updates status to `overdue` if `due_date` is in the past
       - SQL query: `UPDATE invoices SET status = 'overdue' WHERE status IN ('sent', 'pending') AND due_date < CURRENT_DATE`
     - **Alternative**: Manual update by admin when they notice (fallback)
   - **Overdue timeframe**: Not a fixed period (like 1 week), but based on `due_date` field
     - If due_date was 5 days ago → overdue for 5 days
     - If due_date was 1 month ago → overdue for 1 month

## Implementation Notes

### Overdue Invoice Cron Job
- **Technology**: Use Supabase's pg_cron extension or Edge Functions with scheduled triggers
- **Frequency**: Daily (recommended: 00:00 UTC or early morning)
- **Function**: Check all `sent`/`pending` invoices and mark as `overdue` if due_date passed
- **SQL Example**:
  ```sql
  UPDATE invoices 
  SET status = 'overdue', updated_at = NOW()
  WHERE status IN ('sent', 'pending') 
    AND due_date < CURRENT_DATE
    AND due_date IS NOT NULL;
  ```

## Future Development Considerations

- Invoice templates
- Bulk invoice operations
- Email templates for invoices
- Advanced reporting
- Product import/export
- Customer relationship management
- Integration with accounting systems

