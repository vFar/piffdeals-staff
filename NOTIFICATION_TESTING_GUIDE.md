# Notification System Testing Guide

## 🎯 Overview

This guide will help you test the notification system we just implemented. The system includes:

- **Real-time notifications** for critical events (invoice paid, email failures, stock failures)
- **Daily digest notifications** for overdue invoices, pending investigations, and draft warnings
- **Notification dropdown** with badge count in the header

## ✅ What's Implemented

### 1. Real-time Critical Notifications
- ✅ Invoice Paid (when status changes to 'paid')
- ✅ Email Send Failed (when email sending fails)
- ✅ Stock Update Failed (when Mozello stock update fails)

### 2. Daily Digest Notifications
- ✅ Overdue Invoices Summary (daily at 9 AM)
- ✅ Pending Investigation Summary (invoices pending 3+ days)
- ✅ Draft Deletion Warning (drafts older than 1 day)

### 3. UI Components
- ✅ Notification bell icon with badge count in header
- ✅ Notification dropdown with list of notifications
- ✅ Mark as read / Mark all as read functionality
- ✅ Delete individual notifications
- ✅ Click notification to navigate to related page

## 🧪 Test Scenarios

### Test 1: Invoice Paid Notification

**Steps:**
1. Log in as an employee
2. Create a test invoice (or use existing)
3. Mark an invoice as "paid" (from Invoices page or ViewInvoice page)
4. **Expected:** 
   - Toast notification appears: "Rēķins apmaksāts"
   - Notification appears in bell dropdown
   - Badge count increases
   - Notification shows invoice number and amount

**Test as Admin:**
- Admins should see notifications for ALL invoices (not just their own)
- Create an invoice as Employee A, mark as paid
- Log in as Admin
- Admin should see the notification

### Test 2: Email Send Failed Notification

**Steps:**
1. Log in as an employee
2. Go to Invoices page
3. Try to send an invoice email (but simulate failure - you can temporarily break the email function)
4. **Expected:**
   - Error toast notification appears
   - Notification appears in bell dropdown with error icon (red)
   - Notification shows invoice number and error message
   - Only the invoice creator sees this notification

**Note:** To test this easily, you can temporarily modify the email sending code to always fail, or use an invalid email address.

### Test 3: Stock Update Failed Notification

**Steps:**
1. Log in as an employee
2. Mark an invoice as paid
3. If stock update fails (you may need to simulate this), notification should appear
4. **Expected:**
   - Error notification appears in bell dropdown
   - Both creator and admins see this notification
   - Notification shows invoice number and error message

**Note:** This requires the stock update logic to be implemented. Currently, the notification will trigger if `stock_update_status` is set to 'failed' in the database.

### Test 4: Daily Digest Notifications

**Steps:**
1. Create test data:
   - Create an invoice with status 'overdue' (or set due_date to past date)
   - Create an invoice with status 'pending' that's 3+ days old
   - Create a draft invoice that's 1+ days old
2. Wait for daily digest check (runs at 9 AM, or trigger manually)
3. **Expected:**
   - Summary notifications appear for each category
   - Notifications are grouped (e.g., "You have 3 overdue invoices")
   - Clicking notification navigates to filtered invoice list

**Manual Trigger:**
You can manually trigger the daily digest by calling `checkDailyDigest()` from the browser console:
```javascript
// In browser console (after logging in)
// The notification context should be available
```

### Test 5: Notification Dropdown UI

**Steps:**
1. Generate some notifications (mark invoices as paid, etc.)
2. Click the bell icon in header
3. **Expected:**
   - Dropdown opens showing all notifications
   - Unread notifications have colored background
   - Each notification shows icon, title, message, and timestamp
   - "Mark all as read" button works
   - "Delete all" button works
   - Individual delete buttons work
   - Clicking notification navigates to related page

### Test 6: Badge Count

**Steps:**
1. Generate multiple notifications
2. **Expected:**
   - Badge shows unread count
   - Badge shows "99+" if count exceeds 99
   - Badge disappears when all notifications are read
   - Badge updates in real-time as notifications arrive

### Test 7: Real-time Updates

**Steps:**
1. Open the app in two browser windows (or two different users)
2. In Window 1: Mark an invoice as paid
3. **Expected:**
   - Window 2 (if same user or admin) should see notification appear automatically
   - No page refresh needed
   - Real-time subscription works

## 🔧 Manual Testing Helpers

### Create Test Data

**Create Overdue Invoice:**
```sql
-- In Supabase SQL Editor
UPDATE invoices 
SET status = 'overdue', due_date = CURRENT_DATE - INTERVAL '5 days'
WHERE invoice_number = 'YOUR_INVOICE_NUMBER';
```

**Create Pending Invoice (3+ days old):**
```sql
UPDATE invoices 
SET status = 'pending', created_at = NOW() - INTERVAL '4 days'
WHERE invoice_number = 'YOUR_INVOICE_NUMBER';
```

**Create Draft Invoice (1+ days old):**
```sql
UPDATE invoices 
SET status = 'draft', created_at = NOW() - INTERVAL '2 days'
WHERE invoice_number = 'YOUR_INVOICE_NUMBER';
```

### Trigger Daily Digest Manually

Open browser console and run:
```javascript
// This will trigger the daily digest check
// Note: You may need to access the notification context differently
// The easiest way is to just wait until 9 AM or modify the code temporarily
```

## 🐛 Troubleshooting

### Notifications Not Appearing

1. **Check browser console** for errors
2. **Verify NotificationProvider** is in main.jsx
3. **Check user role** - some notifications are role-based
4. **Verify real-time subscription** is working (check Supabase connection)

### Daily Digest Not Running

1. **Check lastDailyDigest** - it only runs once per day
2. **Verify userProfile** is loaded
3. **Check browser console** for errors in checkDailyDigest

### Badge Count Wrong

1. **Clear notifications** and test again
2. **Check unreadCount** state in NotificationContext
3. **Verify markAsRead** is working correctly

## 📝 Next Steps

After testing, you may want to:

1. **Add notification preferences** - allow users to enable/disable certain notifications
2. **Add notification persistence** - store notifications in database for history
3. **Add email notifications** - send email for critical notifications
4. **Add sound alerts** - optional sound for critical notifications
5. **Add weekly/monthly summaries** - opt-in performance reports

## 🎉 Success Criteria

The notification system is working correctly if:

- ✅ Invoice paid notifications appear in real-time
- ✅ Email failure notifications appear when email fails
- ✅ Daily digest notifications appear once per day
- ✅ Badge count updates correctly
- ✅ Notification dropdown shows all notifications
- ✅ Mark as read / delete functionality works
- ✅ Clicking notification navigates to correct page
- ✅ Role-based notifications work (employees see own, admins see all)

## 🚀 Ready to Test!

Start with Test 1 (Invoice Paid) as it's the easiest to test. Then work through the other scenarios. Let me know if you encounter any issues!

