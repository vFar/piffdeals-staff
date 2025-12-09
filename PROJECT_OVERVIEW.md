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
- ✅ Access User Accounts page
- ✅ Create **EMPLOYEE** accounts ONLY
- ✅ Edit employee profiles (username, email, status)
- ✅ Change employee roles (only to employee)
- ✅ Suspend/activate employees
- ✅ Delete employee accounts
- ✅ View all charts and analytics
- ✅ Bulk operations on employees (change status, delete multiple)
- ❌ Cannot create admin or super_admin accounts
- ❌ Cannot edit/delete other admins
- ❌ Cannot see or manage super_admin accounts

### 👑 **SUPER_ADMIN**
- ✅ Everything admins can do
- ✅ Create **ALL** account types (employee, admin, super_admin)
- ✅ Edit all user profiles (employees, admins, super_admins)
- ✅ Change any user role
- ✅ Suspend/activate any user
- ✅ Delete any user account
- ✅ Bulk operations on all users
- ✅ Full unrestricted system access

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

### User Management (Admins & Super Admins Only)

**Route Access:**
- `/user-accounts` - Accessible by ADMIN and SUPER_ADMIN only
- Employees are blocked from accessing this page (RoleRoute protection)

**User Creation Permissions:**
- **Admin** can create:
  - ✅ Employee accounts only
  - ❌ Cannot create admin or super_admin accounts
  - Role dropdown shows only "Employee" option for admins
  
- **Super Admin** can create:
  - ✅ Employee accounts
  - ✅ Admin accounts
  - ✅ Super Admin accounts
  - Role dropdown shows all options for super_admins

**User Creation Validation:**
- Email must be unique (checked before submission)
- Password must be minimum 8 characters
- All fields required: name, email, password, role, status
- Email format validation
- Real-time error messages for validation failures

**User Management Features:**
- Search users by name, email, or role (real-time filtering)
- Select single or multiple users with checkboxes
- Bulk actions when users selected:
  - Change role (respects permissions)
  - Change status (active/inactive/suspended)
  - Delete selected users
- Individual user actions (edit, delete, suspend)
- View user details (username, email, role, status, last login)

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

4. **Invoice Statuses & Rules** ⚡ NEW SYSTEM

   **IMPORTANT**: Invoices are unique to their creator. Only the creator can edit or manage their own invoices.

   **Status Flow**: `draft` → `sent` → (`paid`, `pending`, `overdue`, `cancelled`)

   **`draft`** (Melnraksts) - Being created, not ready to send yet
   - ✅ Can be edited by: **ONLY the creator** (employee who created it)
   - ✅ Can be deleted by: **ONLY the creator**
   - ✅ Can be sent: **ONLY the creator** (via "Gatavs rēķins" button - sends email and changes to `sent`)
   - ❌ Cannot be paid (must be sent first)
   - 🗑️ **Auto-deletion**: Draft invoices older than 3 days are automatically deleted by cron job
   - 🎨 **UI Highlight**: Draft invoices are highlighted with yellow background in the table
   - 📧 **Sending**: When clicking "Gatavs rēķins", a popconfirm appears. On confirmation, the system:
     - Creates Stripe payment link (if not exists)
     - Ensures public_token exists
     - Sends email to customer
     - Changes status to `sent`

   **`sent`** (Nosūtīts) - Sent to client, awaiting payment
   - ❌ **LOCKED** - Cannot be edited by anyone (including creator)
   - ✅ Can resend email: **ONLY the creator**
   - ✅ Can mark as paid: **ONLY the creator** (manual verification)
   - ✅ Can be updated to: `paid`, `pending`, `overdue`, `cancelled`
   - ✅ Can be cancelled by: **ONLY the creator**
   - ❌ Cannot be deleted
   - 📧 **Resend Feature**: Creator can send reminder emails to client

   **`pending`** - Payment in process (e.g., bank transfer pending, awaiting manual verification)
   - ❌ **LOCKED** - Cannot be edited by anyone
   - ✅ Can mark as paid: **ONLY the creator** (after verifying bank account)
   - ✅ Can resend email: **ONLY the creator**
   - ✅ Can be updated to: `paid`, `overdue`, `cancelled`
   - ❌ Cannot be deleted
   - 💡 **Use Case**: When client claims payment sent but not yet verified in bank account

   **`paid`** - Payment received and verified
   - ❌ **LOCKED** - Cannot be edited by anyone
   - ❌ Cannot be cancelled (payment completed)
   - ❌ Cannot be deleted (affects sales charts, financial records)
   - ✅ Stock updated in Mozello API automatically when status changes to paid
   - 📊 **Analytics Impact**: Included in sales reports and charts

   **`overdue`** - Past due date, not paid
   - ❌ **LOCKED** - Cannot be edited by anyone
   - ✅ Can mark as paid: **ONLY the creator**
   - ✅ Can resend email: **ONLY the creator**
   - ✅ Can be updated to: `paid`, `cancelled`
   - ❌ Cannot be deleted
   - 🔄 **Auto-update logic**: Invoice becomes overdue when:
     - `due_date` has passed (is in the past)
     - Status is `sent` or `pending` (not `paid` or `cancelled`)
   - **Note**: System can automatically check and update status daily, or creator can manually mark as overdue

   **`cancelled`** - Invoice cancelled
   - ❌ **LOCKED** - Cannot be edited by anyone
   - ✅ Can be cancelled by: **ONLY the creator** at any time
   - ✅ Stays in database (for records/audit)
   - ❌ Cannot be deleted
   - ❌ Cannot be reactivated (permanent cancellation)

5. **Invoice Permission System** 🔒 NEW

   **Creator-Only Access**:
   - Each invoice is "owned" by the user who created it
   - **No admin override**: Even admins and super_admins cannot edit others' invoices
   - **View Access**: All users can view all invoices (for transparency)
   - **Actions Available to Creator**:
     - Edit draft invoices
     - Delete draft invoices
     - Send invoices to clients
     - Resend invoice emails
     - Mark invoices as paid (manual verification)
     - Cancel invoices

   **Why Creator-Only?**:
   - **Accountability**: Each user is responsible for their own invoices
   - **Data Integrity**: Prevents accidental modifications by other users
   - **Audit Trail**: Clear ownership of each invoice
   - **Business Logic**: Sales person handles their own deals end-to-end

6. **Auto-Delete Draft Invoices** 🗑️ NEW

   **Purpose**: Automatically delete abandoned draft invoices older than 3 days

   **How it Works**:
   - **Cron Job**: Runs daily at 2:00 AM UTC
   - **Threshold**: Deletes drafts created more than 3 days ago
   - **Cleanup**: Deletes both invoice and associated invoice_items
   - **Logging**: Returns summary of deleted invoices

   **Benefits**:
   - Keeps database clean
   - Encourages users to complete invoices promptly
   - Prevents accumulation of abandoned drafts
   - Improves system performance

   **Setup**: See [AUTO_DELETE_DRAFTS_SETUP.md](AUTO_DELETE_DRAFTS_SETUP.md) for deployment instructions

7. **Session management**
   - Active sessions prevent access to `/login`
   - Users are automatically redirected if already logged in

8. **Customers**
   - Can be stored in `customers` table if you want to reuse customer data
   - OR just store customer info directly in each invoice (simpler)

9. **Stock Updates**
   - When invoice status changes to `paid`, stock is updated in Mozello API
   - Stock is NOT updated when invoice is created or sent (only when paid)
   - No need to track stock changes in database
   - API handles stock synchronization

10. **Overdue Invoice Logic**
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

## Setup & Deployment

### Environment Variables

**Frontend (.env.local):**
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
VITE_MOZELLO_API_URL=https://api.mozello.com/v1
VITE_MOZELLO_API_KEY=your_mozello_api_key_here
```

**Supabase Edge Function Secrets:**
Set these in Supabase Dashboard → Edge Functions → Manage secrets:
```env
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
MOZELLO_API_KEY=your_mozello_api_key_here
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
RESEND_API_KEY=re_xxxxx...
FROM_EMAIL=noreply@yourdomain.com
COMPANY_NAME=Piffdeals
PUBLIC_SITE_URL=https://staff.piffdeals.lv
FRONTEND_URL=https://staff.piffdeals.lv
```

### Supabase Edge Functions

The project uses 9 Edge Functions that must be deployed:

1. **create-user** - Creates user accounts with authentication
2. **create-stripe-payment-link** - Generates Stripe payment links for invoices
3. **send-invoice-email** - Sends invoice emails via Resend
4. **send-password-reset-email** - Handles password reset emails
5. **stripe-webhook** - Processes Stripe payment webhooks
6. **update-mozello-stock** - Updates product stock in Mozello when invoice is paid
7. **fetch-mozello-products** - Fetches products from Mozello API
8. **mark-overdue-invoices** - Daily cron job to mark overdue invoices
9. **delete-old-drafts** - Daily cron job to delete draft invoices older than 3 days

**Deployment Steps:**
1. Install Supabase CLI: `npm install -g supabase`
2. Login: `supabase login`
3. Link project: `supabase link --project-ref YOUR_PROJECT_REF`
4. Set secrets: `supabase secrets set KEY=value`
5. Deploy functions: `supabase functions deploy FUNCTION_NAME`

### Key Integrations

**Stripe Payment Processing:**
- Payment links automatically generated when invoices are sent
- Webhook updates invoice status when payment is received
- Supports Latvian language and Baltic payment methods
- Test mode and live mode supported

**Mozello E-commerce Integration:**
- Products fetched directly from Mozello API (not stored in database)
- Stock automatically updated when invoices are paid
- Only visible and in-stock products shown in product selector

**Resend Email Service:**
- Sends branded invoice emails to customers
- High deliverability with domain verification
- Free tier: 3,000 emails/month
- Recommended FROM email: `info@piffdeals.lv`

### Deployment

**Frontend (Vercel):**
- Framework: Vite + React
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables must be set in Vercel dashboard
- Custom domain: `staff.piffdeals.lv`

**Database:**
- PostgreSQL via Supabase
- Required tables: `user_profiles`, `invoices`, `invoice_items`
- Optional tables: `customers`, `activity_logs`
- Row Level Security (RLS) enabled for data protection

## Future Development Considerations

- Invoice templates
- Bulk invoice operations
- Email templates for invoices
- Advanced reporting
- Product import/export
- Customer relationship management
- Integration with accounting systems

