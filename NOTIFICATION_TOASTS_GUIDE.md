# Notification Toasts Guide

## Overview

Your application uses **Ant Design's notification system** to display toast notifications. These appear as small popup messages in the **top-right corner** of the screen and also get stored in the notification dropdown (bell icon).

---

## Toast Types & Visual Appearance

### 1. **SUCCESS** (Green) ✅
- **Color**: Green (`#22c55e`)
- **Icon**: CheckCircleOutlined
- **Auto-dismiss**: Yes (4.5 seconds)
- **When it appears**:
  - When an invoice is marked as paid
  - When a payment is received via Stripe or bank transfer

### 2. **ERROR** (Red) ❌
- **Color**: Red (`#ef4444`)
- **Icon**: CloseCircleOutlined
- **Auto-dismiss**: **NO** (stays until manually closed)
- **When it appears**:
  - When email sending fails (e.g., can't send invoice email to customer)
  - When stock update fails (e.g., can't update inventory in Mozello after invoice payment)

### 3. **WARNING** (Yellow/Orange) ⚠️
- **Color**: Orange/Yellow (`#f59e0b`)
- **Icon**: ExclamationCircleOutlined
- **Auto-dismiss**: Yes (4.5 seconds)
- **When it appears**:
  - **Daily digest at 9 AM**:
    - Overdue invoices (yours or system-wide if you're admin)
    - Pending invoices waiting 3+ days for payment
    - Draft invoices that will be deleted in 2 days (1+ day old)

### 4. **INFO** (Blue) ℹ️
- **Color**: Blue (`#3b82f6`)
- **Icon**: InfoCircleOutlined
- **Auto-dismiss**: Yes (4.5 seconds)
- **When it appears**:
  - Currently not used in your app, but available for future use

---

## When Toasts Appear

### Real-Time Notifications (Instant)

#### 1. **Invoice Paid** (SUCCESS)
- **Trigger**: When invoice status changes from any status → `paid`
- **Who sees it**:
  - The user who created the invoice
  - Admins and Super Admins (for all invoices)
- **How it works**: 
  - Real-time database subscription listens for invoice updates
  - When `status` changes to `paid`, toast appears immediately
- **Example**: "Rēķins INV-001 ir apmaksāts! (Stripe) Summa: €150.00"

#### 2. **Email Send Failed** (ERROR)
- **Trigger**: When trying to send invoice email and it fails
- **Who sees it**: Only the user who created the invoice
- **Location**: `src/pages/Invoices.jsx` - `sendInvoiceEmail` function
- **Example**: "Neizdevās nosūtīt rēķinu INV-001 uz customer@example.com. Kļūda: [error message]"

#### 3. **Stock Update Failed** (ERROR)
- **Trigger**: When `stock_update_status` field on invoice is set to `'failed'`
- **Who sees it**:
  - The user who created the invoice
  - Admins and Super Admins
- **How it works**: Real-time subscription watches for `stock_update_status === 'failed'`
- **Example**: "Neizdevās atjaunināt krājumus rēķinam INV-001. Lūdzu, pārbaudiet manuāli."

### Daily Digest Notifications (9 AM Daily)

These appear **once per day at 9 AM** (or immediately on login if it's past 9 AM and not sent yet):

#### 1. **Overdue Invoices** (WARNING)
- **Condition**: Invoices with `status = 'overdue'`
- **Who sees it**:
  - Regular users: Only their own overdue invoices
  - Admins: Their own + all system overdue invoices (separate notifications)
- **Example**: "Jums ir 3 kavēti rēķini." or "Sistēmā ir 5 kavēti rēķini."

#### 2. **Pending Investigation** (WARNING)
- **Condition**: Invoices with `status = 'pending'` that are **3+ days old**
- **Who sees it**:
  - Regular users: Only their own pending invoices
  - Admins: Their own + all system pending invoices (separate notifications)
- **Example**: "2 rēķini gaida apmaksu jau 3+ dienas. Nepieciešama pārbaude."

#### 3. **Draft Deletion Warning** (WARNING)
- **Condition**: Draft invoices (`status = 'draft'`) that are **1+ days old** (will be deleted in 2 days)
- **Who sees it**: Only regular users (not admins)
- **Example**: "2 melnraksti tiks dzēsti pēc 2 dienām. Lūdzu, pabeidziet vai dzēsiet tos."

---

## How It Works Technically

### 1. **Notification Context** (`src/contexts/NotificationContext.jsx`)
- Manages all notifications in React state
- Stores last 50 notifications
- Tracks unread count
- Provides helper functions to add notifications

### 2. **Real-Time Subscriptions**
```javascript
// Watches for invoice updates in real-time
supabase
  .channel('invoice-notifications')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'invoices',
  }, (payload) => {
    // Triggers notifications when invoice changes
  })
```

### 3. **Daily Digest Check**
- Runs on component mount
- Checks at 9 AM daily
- Prevents duplicate notifications (only one per day)

### 4. **Toast Display**
- Uses Ant Design's `notification` API
- Appears in **top-right corner**
- Also stored in notification dropdown (bell icon)
- Unread notifications have colored background

---

## Notification Dropdown (Bell Icon)

- **Location**: Top navigation bar
- **Badge**: Shows unread count (max 99+)
- **Features**:
  - Click to view all notifications
  - Mark as read (individual or all)
  - Delete notifications
  - Click notification to navigate to related page
  - Color-coded by priority
  - Shows relative time ("Pirms 5 min", "Pirms 2 st", etc.)

---

## Toast Duration

| Type | Duration | Auto-Close |
|------|----------|------------|
| SUCCESS | 4.5 seconds | ✅ Yes |
| WARNING | 4.5 seconds | ✅ Yes |
| INFO | 4.5 seconds | ✅ Yes |
| ERROR | **Never** | ❌ No (must manually close) |

**Why errors don't auto-dismiss?** Errors are critical and need user attention, so they stay visible until the user acknowledges them.

---

## Code Examples

### Creating a Custom Notification

```javascript
import { useNotifications, NOTIFICATION_PRIORITY } from '../contexts/NotificationContext';

const { addNotification } = useNotifications();

// Success notification
addNotification({
  type: 'custom_type',
  priority: NOTIFICATION_PRIORITY.SUCCESS,
  title: 'Operācija veiksmīga',
  message: 'Dati saglabāti veiksmīgi',
  actionUrl: '/invoices', // Optional: where to navigate on click
});

// Error notification
addNotification({
  type: 'custom_error',
  priority: NOTIFICATION_PRIORITY.ERROR,
  title: 'Kļūda',
  message: 'Neizdevās saglabāt datus',
});
```

### Using Helper Functions

```javascript
const { notifyInvoicePaid, notifyEmailSendFailed } = useNotifications();

// Notify invoice paid
notifyInvoicePaid(invoice, 'stripe');

// Notify email failure
notifyEmailSendFailed(invoice, 'SMTP connection failed');
```

---

## Summary

**Toasts appear when:**
1. ✅ Invoice is paid (real-time, SUCCESS)
2. ❌ Email sending fails (ERROR, no auto-dismiss)
3. ❌ Stock update fails (ERROR, no auto-dismiss)
4. ⚠️ Daily at 9 AM: Overdue invoices, pending investigations, draft warnings (WARNING)

**Toast Types:**
- **SUCCESS** (green): Good news, auto-dismisses
- **ERROR** (red): Critical issues, stays until closed
- **WARNING** (orange): Important reminders, auto-dismisses
- **INFO** (blue): General information, auto-dismisses

All toasts also appear in the notification dropdown (bell icon) for later review!





