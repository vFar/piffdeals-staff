# User Notification System

## Overview
This document outlines all notification triggers and factors that will notify users in the Piffdeals Staff Portal. Notifications appear in the top-right corner using Ant Design's Notification component.

## Notification Triggers

### Invoice Notifications

#### 1. Draft Auto-Delete Warning
- **Trigger**: Draft invoice is 1 day old (2 days before auto-deletion)
- **Recipient**: Invoice creator
- **Type**: Warning
- **Message**: `"Jūsu melnraksta rēķins {invoice_number} tiks dzēsts pēc 1 dienas. Lūdzu, pabeidziet vai dzēsiet to."`
- **Action**: Click to view invoice
- **Frequency**: Once per invoice

#### 2. Invoice Paid (Real-time)
- **Trigger**: Invoice status changes to 'paid' (via Stripe webhook or manual)
- **Recipient**: Invoice creator
- **Type**: Success
- **Message**: `"Rēķins {invoice_number} ir apmaksāts! Summa: €{total}"`
- **Action**: Click to view invoice
- **Frequency**: Once per invoice

#### 3. Invoice Overdue (Daily)
- **Trigger**: Invoice becomes overdue (via cron job)
- **Recipient**: Invoice creator
- **Type**: Warning
- **Message**: `"Rēķins {invoice_number} ir kavēts. Apmaksas termiņš: {due_date}"`
- **Action**: Click to view invoice
- **Frequency**: Once per invoice (when it becomes overdue)

#### 4. Pending Investigation (After 3 days)
- **Trigger**: Pending invoice is 3 days old
- **Recipient**: Invoice creator + Super Admin
- **Type**: Warning
- **Message**: `"Rēķins {invoice_number} ir gaida apmaksu jau 3 dienas. Nepieciešama pārbaude."`
- **Action**: Click to view invoice
- **Frequency**: Once per invoice (after 3 days in pending)

#### 5. Stock Update Failed
- **Trigger**: Mozello stock update fails when invoice is marked as paid
- **Recipient**: Invoice creator + Super Admin
- **Type**: Error
- **Message**: `"Neizdevās atjaunināt krājumus rēķinam {invoice_number}. Lūdzu, pārbaudiet manuāli."`
- **Action**: Click to view invoice
- **Frequency**: Once per failed update

### System Notifications

#### 6. Payment Link Created
- **Trigger**: Stripe payment link is successfully created
- **Recipient**: Invoice creator
- **Type**: Info
- **Message**: `"Maksājuma saite izveidota rēķinam {invoice_number}"`
- **Action**: None (informational)
- **Frequency**: Once per invoice

#### 7. Email Sent Successfully
- **Trigger**: Invoice email is sent successfully
- **Recipient**: Invoice creator
- **Type**: Success
- **Message**: `"Rēķins {invoice_number} nosūtīts uz {customer_email}"`
- **Action**: None (informational)
- **Frequency**: Once per email send

#### 8. Email Send Failed
- **Trigger**: Invoice email fails to send
- **Recipient**: Invoice creator
- **Type**: Error
- **Message**: `"Neizdevās nosūtīt rēķinu {invoice_number}. Lūdzu, mēģiniet vēlreiz."`
- **Action**: Click to retry
- **Frequency**: Once per failed attempt

## Implementation Details

### Notification Component
- **Library**: Ant Design Notification
- **Position**: Top-right corner
- **Duration**: 4.5 seconds (configurable)
- **Max Count**: 5 notifications visible at once

### Database Storage (Future Enhancement)
Consider creating a `notifications` table to:
- Store notification history
- Mark notifications as read/unread
- Show notification count badge
- Allow users to view past notifications

### Notification Badge
- **Location**: Header bell icon (DashboardLayout.jsx)
- **Display**: Red dot badge when unread notifications exist
- **Click Action**: Opens notification dropdown/modal

## Notification Priority

1. **Error** (Red) - Stock update failed, email send failed
2. **Warning** (Orange) - Draft deletion warning, overdue, pending investigation
3. **Success** (Green) - Invoice paid, email sent
4. **Info** (Blue) - Payment link created

## User Preferences (Future)

Allow users to configure:
- Which notifications they want to receive
- Notification frequency (immediate, daily digest, weekly)
- Email notifications for critical events
- Sound alerts (optional)

## Testing

To test notifications:
1. Create a draft invoice and wait 1 day → Should see deletion warning
2. Mark invoice as paid → Should see paid notification
3. Set invoice due_date to past date → Should see overdue notification (after cron runs)
4. Mark invoice as pending and wait 3 days → Should see investigation notification

## Related Files

- `src/components/DashboardLayout.jsx` - Notification bell icon
- `src/pages/Invoices.jsx` - Invoice status changes
- `supabase/functions/stripe-webhook/index.ts` - Payment notifications
- `supabase/functions/mark-overdue-invoices/index.ts` - Overdue notifications
- `supabase/functions/delete-old-drafts/index.ts` - Draft deletion warnings




