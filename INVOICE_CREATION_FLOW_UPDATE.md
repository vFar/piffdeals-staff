# Invoice Creation and Sending Flow Update

## Summary

The invoice creation and sending flow has been completely redesigned. Invoices are created as drafts, and users manually send them using a "Ready to Send" button that shows a modal with sharing options (email or copy link). Statuses are automatic and cannot be manually changed.

## Changes Made

### 1. CreateInvoice.jsx - Simplified Invoice Creation

**Before:**
- Two buttons: "Saglabāt melnrakstu" (Save as draft) and "Nosūtīt rēķinu" (Send invoice)
- Invoices could be saved as 'draft' or 'sent' status
- Draft invoices could be edited later

**After:**
- Single button: "Izveidot rēķinu" (Create invoice) for new invoices
- Single button: "Saglabāt izmaiņas" (Save changes) for editing
- All invoices are created with 'draft' status
- Simpler, more straightforward workflow

**Technical Changes:**
- Removed `sendInvoice` parameter from `handleSave()` function
- Always sets status to 'draft' when creating/updating invoices
- Updated success messages
- Removed unused `SendOutlined` icon import
- Updated button text and layout

### 2. Database Schema - Updated Delete Policy

**Before:**
- Users could delete their own 'draft' invoices
- Admins could delete any invoice

**After:**
- Users can delete their own 'draft' OR 'sent' invoices
- Super admins can delete any invoice
- Regular admins can no longer delete other users' invoices

**File:** `database-schema.sql` (line 271-279)

```sql
-- Policy: Users can delete their own draft or sent invoices, super_admins can delete any
CREATE POLICY "Users can delete invoices"
  ON invoices FOR DELETE
  TO authenticated
  USING (
    (user_id = auth.uid() AND status IN ('draft', 'sent'))
    OR
    public.is_super_admin(auth.uid())
  );
```

### 3. Invoices.jsx - Updated Delete Button Visibility

**Before:**
- Delete option only shown for 'draft' invoices created by current user

**After:**
- Delete option shown for 'draft' OR 'sent' invoices created by current user
- Delete option also shown for all invoices if user is super_admin

**Technical Changes:**
- Updated condition from `record.status === 'draft' && isCreator` 
- To: `(record.status === 'draft' || record.status === 'sent') && (isCreator || isSuperAdmin)`

### 4. ViewInvoice.jsx - New "Ready to Send" Feature 🚀

**New Features:**
- **"Gatavs nosūtīšanai" Button**: Shows for draft invoices when not editing
  - Primary green button
  - Generates public token (UUID)
  - Changes invoice status to 'sent'
  - Opens share modal automatically

- **Enhanced Share Modal**: Two clear options for sending
  - **Send via Email**: Calls `send-invoice-email` edge function
    - Shows customer email address
    - Professional email template with invoice details
    - Includes clickable link to view invoice
  - **Copy Link**: Copies public URL to clipboard
    - Clear description for manual sharing
    - Works with WhatsApp, SMS, etc.

- **Simplified Editing**: When editing draft invoices
  - Only one button: "Saglabāt izmaiņas" (Save changes)
  - Always saves as 'draft' status
  - No option to send while editing

**Technical Changes:**
- Added `handleReadyToSend()` function
- Added `preparingToSend` state
- Updated modal UI with better UX
- Removed "send" option from edit mode

### 5. Migration File

Created `update-invoice-delete-policy.sql` to update existing databases with the new delete policy.

## Usage

### For Existing Databases

Run the migration SQL file to update the RLS policy:

```bash
# Using Supabase CLI
supabase db reset  # This will apply the updated schema

# OR manually run the migration
psql -f update-invoice-delete-policy.sql
```

### For New Installations

The updated `database-schema.sql` includes the new policy, so no additional steps needed.

## User Experience

### Creating an Invoice

1. User fills out invoice form
2. Clicks **"Izveidot rēķinu"** (Create invoice)
3. Invoice is created with **'draft'** status (shown as "Melnraksts" in UI)
4. User is redirected to invoices list
5. Success message: "Rēķins izveidots!" (Invoice created!)
6. Invoice appears with yellow highlight in the list (draft status)

### Sending an Invoice (New Flow) 🎯

1. User clicks "View" on a draft invoice
2. Invoice opens in view mode
3. User sees **"Gatavs nosūtīšanai"** (Ready to send) button (green, primary button)
4. User clicks the button:
   - Public token is generated (UUID)
   - Invoice status automatically changes to **'sent'**
   - Modal appears with two options:
     
     **Option A: Send via Email** 📧
     - Shows customer's email address
     - Sends automated email with invoice link
     - Email includes invoice number, total amount, and link to view
     
     **Option B: Copy Link** 🔗
     - Copies public invoice URL to clipboard
     - User can share via WhatsApp, SMS, or other channels
     - Link format: `https://yourdomain.com/i/{public_token}`

5. Invoice is now in 'sent' status (automatically)
6. User can still resend or share the invoice later using the "Dalīties" (Share) button

### Deleting an Invoice

1. User can delete their own invoices with 'draft' or 'sent' status
2. Super admins can delete any invoice
3. Once invoice status changes to 'paid', 'pending', 'overdue', or 'cancelled', it cannot be deleted by anyone (for audit trail)

### Editing an Invoice

- **Draft invoices**: Can be edited by creator
- **Sent invoices**: Cannot be edited (locked for data integrity)
- **Other statuses**: Cannot be edited (locked)

## Status Flow (Automatic)

```
📝 Create Invoice
    ↓
  [draft] ← All invoices start here
    ↓
    ├── ✅ Can be edited by creator
    ├── ✅ Can be deleted by creator or super_admin
    ├── ⏰ Auto-deleted after 3 days (cron job)
    ├── 🎨 Yellow highlight in table
    └── 👁️ Shows "Gatavs nosūtīšanai" button when viewing
         ↓
    (User clicks "Gatavs nosūtīšanai")
         ↓
  [sent] ← Status changes automatically
    ↓
    ├── 🔗 Public token generated (UUID)
    ├── 📧 Modal shows: Send email OR Copy link
    ├── ✅ Can be deleted by creator or super_admin  
    ├── ❌ Cannot be edited (locked)
    ├── 🔄 Can resend/share using "Dalīties" button
    └── Automatic transitions:
         ├── → [paid] (via Stripe webhook or manual mark)
         ├── → [pending] (payment processing)
         ├── → [overdue] (past due date)
         └── → [cancelled] (manual cancellation)
              ↓
  [paid/pending/overdue/cancelled]
    ↓
    🔒 Cannot be deleted (permanent for audit)
    ❌ Cannot be edited (locked)
```

## Benefits

1. **Clear workflow**: Three-step process: Create → Review → Send
2. **Review before send**: All invoices start as drafts, allowing review and editing
3. **Flexible sharing**: Choose between email or manual sharing (WhatsApp, SMS, etc.)
4. **Visual clarity**: Draft invoices have yellow highlight for easy identification
5. **Automatic statuses**: No manual status changes needed - fully automated
6. **Safety**: Can delete draft/sent invoices if mistakes are made
7. **Professional emails**: Automated, branded email template for clients
8. **Public links**: Secure UUID-based links for invoice viewing
9. **Data integrity**: Paid/pending/overdue/cancelled invoices remain locked and permanent

## Important Notes

### Invoice Statuses Are Automatic 🤖
- **No manual status changes**: Users cannot manually change invoice status
- **Automatic transitions**:
  - `draft` → `sent`: When user clicks "Gatavs nosūtīšanai"
  - `sent` → `paid`: Via Stripe webhook or manual "Mark as paid"
  - `sent` → `pending`: Manual action when waiting for payment verification
  - `sent`/`pending` → `overdue`: Automatic when due date passes
  - Any status → `cancelled`: Manual cancellation by creator

### Draft Invoices
- Created with 'draft' status automatically
- Appear with yellow highlight in table
- Can be edited by creator
- Can be deleted by creator or super_admin
- Auto-deleted after 3 days by cron job
- Show "Gatavs nosūtīšanai" button when viewing

### Sent Invoices
- Status changed automatically when "Gatavs nosūtīšanai" is clicked
- Public token (UUID) generated at this moment
- Cannot be edited (locked)
- Can still be deleted by creator or super_admin
- Can be reshared using "Dalīties" button
- Email can be resent if needed

### Paid/Pending/Overdue/Cancelled Invoices
- Cannot be deleted (permanent for audit trail)
- Cannot be edited (locked for data integrity)
- Remain in system for reporting and analytics

### Email Sending
- Uses Supabase Edge Function `send-invoice-email`
- Requires RESEND_API_KEY environment variable
- Professional HTML email template
- Includes invoice number, amount, and public link
- Sent to customer_email from invoice

### Public Links
- Format: `https://yourdomain.com/i/{public_token}`
- UUID-based for security
- Can be viewed by anyone with the link (no login required)
- Used for public invoice viewing and payment

