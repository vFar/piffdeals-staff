# 📋 Invoice Sending Guide - Quick Reference

## Overview

This guide explains the new invoice creation and sending flow. All invoices are created as drafts, and you manually send them when ready.

---

## 🔄 Complete Flow

### Step 1: Create Invoice
```
📝 Fill out invoice form
   ↓
Click "Izveidot rēķinu"
   ↓
✅ Invoice created with 'draft' status
   ↓
🟨 Appears with yellow highlight in list
```

### Step 2: Review & Edit (Optional)
```
👁️ Click "View" on draft invoice
   ↓
📝 Click "Rediģēt" if changes needed
   ↓
💾 Click "Saglabāt izmaiņas"
```

### Step 3: Send Invoice
```
👁️ Click "View" on draft invoice
   ↓
🟢 Click "Gatavs nosūtīšanai" (green button)
   ↓
🔄 Status automatically changes to 'sent'
🔗 Public token (UUID) generated
   ↓
📋 Modal appears with 2 options:

   Option A: 📧 Send via Email
   ├── Email sent to customer automatically
   ├── Professional template
   ├── Includes invoice link
   └── Customer receives in inbox
   
   Option B: 🔗 Copy Link
   ├── Public URL copied to clipboard
   ├── Share manually (WhatsApp, SMS, etc.)
   └── Customer can view via link
```

---

## 🎯 Quick Actions Reference

### For Draft Invoices (🟨 Yellow Highlight)

| Action | Button | Result |
|--------|--------|--------|
| **View** | 👁️ View | Opens invoice in view mode |
| **Edit** | ✏️ Rediģēt | Enable editing mode |
| **Send** | 🟢 Gatavs nosūtīšanai | Changes to 'sent', shows share modal |
| **Delete** | 🗑️ Dzēst | Deletes invoice (creator/super_admin) |

### For Sent Invoices (🔵 Blue Status)

| Action | Button | Result |
|--------|--------|--------|
| **View** | 👁️ View | Opens invoice in view mode |
| **Share** | 🔗 Dalīties | Shows share modal (email/copy link) |
| **Mark Paid** | ✅ Atzīmēt kā apmaksātu | Changes status to 'paid' |
| **Delete** | 🗑️ Dzēst | Deletes invoice (creator/super_admin) |

### For Paid/Pending/Overdue/Cancelled Invoices (🔒 Locked)

| Action | Button | Result |
|--------|--------|--------|
| **View** | 👁️ View | Opens invoice in read-only mode |
| **Share** | 🔗 Dalīties | Shows share modal (email/copy link) |
| ~~Delete~~ | ❌ | Cannot delete (permanent for audit) |
| ~~Edit~~ | ❌ | Cannot edit (locked) |

---

## 📧 Email Sending

### What Customers Receive

**Email Subject:** `Rēķins #{invoice_number} - {Company Name}`

**Email Content:**
- Professional branded header
- Personalized greeting with customer name
- Invoice number and total amount
- Big blue button: "Skatīt rēķinu" (View Invoice)
- Public invoice link
- Company footer

### Requirements
- Customer must have valid email in invoice
- RESEND_API_KEY must be configured in Supabase
- Edge function `send-invoice-email` must be deployed

---

## 🔗 Public Invoice Links

### Format
```
https://yourdomain.com/i/{public_token}

Example:
https://piffdeals.lv/i/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### Features
- No login required to view
- Secure UUID-based token
- Cannot be guessed or enumerated
- Shows all invoice details
- Includes payment button (if Stripe enabled)

### Sharing Options
- ✉️ Email (automated)
- 💬 WhatsApp
- 📱 SMS
- 💼 Messenger
- 📋 Copy & paste anywhere

---

## ⚙️ Status Transitions (Automatic)

```
[draft] ──────────────────────────┐
   ↓                               │
   │ (User: Gatavs nosūtīšanai)    │ Auto-delete
   ↓                               │ after 3 days
[sent] ────────────────────────────┘
   ↓
   ├─→ [paid] ────────┐
   ├─→ [pending] ─────┤
   ├─→ [overdue] ─────┤──→ 🔒 Permanent (cannot delete)
   └─→ [cancelled] ───┘
```

### Status Meanings

| Status | Latvian | Meaning | Can Edit? | Can Delete? |
|--------|---------|---------|-----------|-------------|
| **draft** | Melnraksts | Being created | ✅ Yes | ✅ Yes |
| **sent** | Nosūtīts | Sent to customer | ❌ No | ✅ Yes |
| **paid** | Apmaksāts | Payment received | ❌ No | ❌ No |
| **pending** | Gaida | Payment processing | ❌ No | ❌ No |
| **overdue** | Kavēts | Past due date | ❌ No | ❌ No |
| **cancelled** | Atcelts | Cancelled | ❌ No | ❌ No |

---

## 🚨 Common Questions

### Q: Can I edit an invoice after sending?
**A:** No. Once an invoice is marked as 'sent', it becomes locked. You can only delete it and create a new one.

### Q: Can I resend an invoice?
**A:** Yes! Click "View" on a sent invoice, then click "Dalīties" to access send options again.

### Q: What happens if I delete a sent invoice?
**A:** It's completely removed from the database (including items). Only do this if the invoice was sent by mistake.

### Q: Can customers pay via the public link?
**A:** Yes, if Stripe payment integration is enabled. They'll see a "Pay Now" button on the public invoice page.

### Q: How long do draft invoices last?
**A:** Draft invoices are automatically deleted after 3 days. Send them or they'll be cleaned up by the system.

### Q: Can I see who created an invoice?
**A:** Yes! The "Izveidoja" (Created by) column shows the creator's name in the invoices table.

### Q: What if the email fails to send?
**A:** You'll see an error message. You can always use "Copy Link" option and share manually.

---

## 💡 Best Practices

1. **✅ Review before sending**
   - Create invoice as draft
   - Review all details carefully
   - Edit if needed
   - Only then click "Gatavs nosūtīšanai"

2. **📧 Choose appropriate send method**
   - Use email for professional communication
   - Use copy link for instant messaging (WhatsApp, etc.)

3. **🗑️ Clean up mistakes quickly**
   - Draft or sent invoices can be deleted
   - Delete and recreate if major errors found

4. **⏰ Don't delay sending**
   - Draft invoices auto-delete after 3 days
   - Send invoices promptly after creation

5. **🔐 Keep public links secure**
   - Don't share public links publicly on social media
   - Send directly to customers only

---

## 📞 Need Help?

If you encounter any issues:
1. Check that customer email is valid
2. Verify RESEND_API_KEY is configured
3. Check edge functions are deployed
4. Contact your system administrator

---

**Last Updated:** November 2024
**Version:** 2.0





