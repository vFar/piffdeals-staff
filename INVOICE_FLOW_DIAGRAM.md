# Invoice Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    INVOICE CREATION FLOW                        │
└─────────────────────────────────────────────────────────────────┘

1. CREATE INVOICE
   ┌─────────────────┐
   │ Employee/Admin/ │
   │ Super Admin     │
   │ clicks          │
   │ "Izveidot       │
   │  rēķinu"        │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │ Invoice Created │
   │ Status: DRAFT   │
   │                 │
   │ ✅ Editable     │
   │ ✅ Viewable     │
   │ ✅ Deletable    │
   │    (by creator  │
   │     or super    │
   │     admin)      │
   │                 │
   │ 🟡 Highlighted  │
   │    in table     │
   │    (yellow bg)  │
   └────────┬────────┘
            │
            │ User clicks "Skatīt" (View)
            ▼
   ┌─────────────────────────────────────┐
   │        VIEW INVOICE PAGE            │
   │                                     │
   │  ┌──────────────────────────────┐  │
   │  │ "Priekšskatīt" (Preview)     │  │
   │  │                              │  │
   │  │ ⚠️ Shows: "Maksājuma saite  │  │
   │  │    nav pieejama" (Payment    │  │
   │  │    link not available)      │  │
   │  │    because invoice is draft  │  │
   │  └──────────────────────────────┘  │
   │                                     │
   │  ┌──────────────────────────────┐  │
   │  │ "Gatavs nosūtīšanai"         │  │
   │  │ (Ready to send)               │  │
   │  │                              │  │
   │  │ Opens Share Modal            │  │
   │  └──────────────────────────────┘  │
   └─────────────┬───────────────────────┘
                 │
                 ▼
   ┌─────────────────────────────────────┐
   │         SHARE MODAL OPENS            │
   │                                     │
   │  Option 1: Send by Email           │
   │  ┌──────────────────────────────┐   │
   │  │ Email Input (read-only)      │   │
   │  │ [Nosūtīt e-pastu] Button     │   │
   │  │                              │   │
   │  │ On Click:                    │   │
   │  │ 1. Create Stripe Payment Link│   │
   │  │ 2. Send Email                │   │
   │  │ 3. Update Status → "sent"    │   │
   │  │ 4. Show Success Message      │   │
   │  │ 5. Keep Modal Open           │   │
   │  │    (NO CLOSING/REOPENING)    │   │
   │  └──────────────────────────────┘   │
   │                                     │
   │  ──────────── VAI ──────────────    │
   │                                     │
   │  Option 2: Share by Link           │
   │  ┌──────────────────────────────┐   │
   │  │ Public Link Input (read-only)│   │
   │  │ [Kopēt] Button               │   │
   │  │                              │   │
   │  │ On Click:                    │   │
   │  │ 1. Create Stripe Payment Link│   │
   │  │ 2. Copy Link to Clipboard    │   │
   │  │ 3. Update Status → "sent"    │   │
   │  │ 4. Close Modal              │   │
   │  │ 5. Show Success Message      │   │
   │  └──────────────────────────────┘   │
   └─────────────┬───────────────────────┘
                 │
                 ▼
   ┌─────────────────────────────────────┐
   │      INVOICE STATUS: "sent"         │
   │                                     │
   │  ✅ Stripe Payment Link Created     │
   │  ✅ Public Token Available          │
   │  ✅ Payment Button Visible          │
   │                                     │
   │  ❌ No longer editable              │
   │  ❌ No longer deletable             │
   │                                     │
   │  ✅ Can resend email                │
   │  ✅ Can mark as paid                │
   │  ✅ Can cancel                      │
   └─────────────────────────────────────┘
```

## Key Points:

1. **Draft Status**:
   - Editable, viewable, deletable (by creator or super_admin)
   - Highlighted in yellow in invoices table
   - No payment link yet

2. **Preview Button**:
   - Shows warning: "Maksājuma saite nav pieejama"
   - Because invoice is still draft

3. **Ready to Send Button**:
   - Opens share modal
   - Creates payment link automatically
   - User chooses email or link

4. **Email Sharing**:
   - Creates payment link
   - Sends email
   - Updates status to "sent"
   - Shows success message
   - **Modal stays open** (no closing/reopening)

5. **Link Sharing**:
   - Creates payment link
   - Copies to clipboard
   - Updates status to "sent"
   - Closes modal
   - Shows success message

6. **Sent Status**:
   - Payment link available
   - Payment button visible on public page
   - Invoice locked (not editable/deletable)

