# Employee Guide: How to Create and Send Invoices

## 📋 Overview

This guide shows you how to create invoices and send payment links to customers. Everything is automated - when the customer pays, the invoice automatically updates!

---

## 🎯 Creating an Invoice

### Step 1: Go to Create Invoice Page

1. Click **"Izveidot jaunu rēķinu"** button in the sidebar
2. Or go to **Invoices** → **Create Invoice**

### Step 2: Fill in Customer Details

**Bill To Section:**
- **Client Name*** (required) - Customer's full name
- **Client Email*** (required) - Where payment link will be sent
- **Client Address** (optional) - Customer's billing address

**Invoice Details:**
- **Invoice #** - Auto-generated (you can change it if needed)
- **Issue Date** - Defaults to today
- **Due Date** - When payment is due (optional)

### Step 3: Add Products/Items

**For each item:**
1. **Item Name** - Product or service name
2. **Quantity** - Number of units
3. **Price (€)** - Price per unit

**Tips:**
- Click **+ Add Item** to add more products
- Click the trash icon to remove an item
- Total is calculated automatically

### Step 4: Review Totals

The system automatically calculates:
- **Subtotal** - Sum of all items
- **Tax (21%)** - VAT/Sales tax
- **Total** - Final amount customer pays

---

## 💾 Save or Send

### Option 1: Save as Draft

Click **"Save Draft"** to:
- Save the invoice for later
- Make changes before sending
- Not ready to send to customer yet

**What happens:**
- Invoice saved with status "Draft"
- No payment link generated
- You can edit it anytime

### Option 2: Send Invoice

Click **"Send Invoice"** to:
- Generate Stripe payment link automatically
- Mark invoice as "Sent"
- Ready to send to customer

**What happens:**
1. ✅ Invoice saved to database
2. ✅ Stripe payment link generated
3. ✅ Modal shows payment link
4. ✅ Status changes to "Sent"

---

## 📤 Sending Payment Link to Customer

After clicking "Send Invoice", you'll see a modal with the payment link:

### Copy the Link

1. Click **"Copy Link"** button
2. Link is copied to clipboard

### Send to Customer

You can send the link via:
- **Email** - Paste link in email
- **WhatsApp** - Send link directly
- **SMS** - Text the link
- **Any messaging app** - Just paste and send

**Example message:**
```
Hello [Customer Name],

Here's your invoice #INV-2024-001 for €383.90

Payment link:
https://buy.stripe.com/xxxxxxxxxxxxx

Please pay by [due date]. Payment is secure and handled by Stripe.

Thank you!
```

---

## ✅ After Customer Pays

### Automatic Updates (No Action Needed!)

When the customer completes payment:

1. **Invoice Status** → Changes to "Paid" ✅
2. **Paid Date** → Set automatically
3. **Stock Update** → Products automatically deducted from Mozello
4. **You See It** → Dashboard updates in real-time!

### You'll Know Payment is Received

- 🔔 You'll see a notification: "Invoice INV-XXX has been paid!"
- 📊 Invoice list shows status as **Paid** (green badge)
- 📅 Paid date is recorded

**No manual work needed!** Everything happens automatically.

---

## 📊 Managing Invoices

### View All Invoices

1. Go to **Invoices** page
2. See all your invoices (or all if you're admin)

### Invoice Statuses

| Status | Meaning | What You Can Do |
|--------|---------|-----------------|
| 🟢 **Draft** | Being created | Edit, Delete, Send |
| 🟡 **Sent** | Waiting for payment | View payment link, Cancel |
| ✅ **Paid** | Payment received | View only (locked) |
| 🔴 **Cancelled** | Invoice cancelled | View only |
| ⚫ **Overdue** | Past due date | Update to paid when received |

### View Payment Link (For Sent Invoices)

1. Find invoice in list
2. Click **⋮** (three dots)
3. Select **"View Payment Link"**
4. Copy and send to customer again

### Search Invoices

Use the search box to find:
- By invoice number: "INV-2024-001"
- By customer name: "John Doe"
- By status: "paid", "sent"

---

## ❓ Common Questions

### Q: Can I edit an invoice after sending?

**A:** No, once sent, invoices are locked to prevent changes after payment link is generated. If you need to make changes:
1. Cancel the invoice
2. Create a new one
3. Send new payment link

### Q: What if customer lost the payment link?

**A:** Easy!
1. Go to **Invoices**
2. Find the invoice
3. Click **⋮** → **View Payment Link**
4. Copy and send again

### Q: How do I know if customer paid?

**A:** You'll see it automatically:
- Real-time notification
- Invoice status changes to "Paid"
- No need to check manually!

### Q: Can customers pay with credit card?

**A:** Yes! Stripe accepts:
- Credit cards (Visa, Mastercard, Amex)
- Debit cards
- Digital wallets (Apple Pay, Google Pay)

### Q: Is payment secure?

**A:** Yes! All payments are processed by Stripe, one of the world's most secure payment processors. We never handle card details.

### Q: What if payment fails?

**A:** Customer will see an error message and can try again. Invoice status stays as "Sent" until payment succeeds.

### Q: Can I cancel an invoice after sending?

**A:** Yes, but:
- If not yet paid → You can cancel
- If already paid → Contact admin for refund process

---

## 🎯 Best Practices

### ✅ Do's

- ✅ Double-check customer email before sending
- ✅ Verify product quantities and prices
- ✅ Add due date for payment tracking
- ✅ Save draft first if unsure
- ✅ Include clear item descriptions

### ❌ Don'ts

- ❌ Don't share payment links publicly
- ❌ Don't try to edit sent invoices
- ❌ Don't create duplicate invoices
- ❌ Don't forget to set due dates

---

## 🚨 Troubleshooting

### Problem: Payment link not generating

**Solution:**
1. Check internet connection
2. Make sure all required fields are filled
3. Try again or contact admin

### Problem: Customer says link doesn't work

**Solution:**
1. Verify link was copied completely (no missing characters)
2. Ask customer to try different browser
3. Generate new invoice if needed

### Problem: Invoice stuck in "Sent" but customer paid

**Solution:**
1. Wait a few minutes (can take up to 5 minutes)
2. Refresh the page
3. If still not updated, contact admin

---

## 📞 Need Help?

**Contact your administrator if:**
- Payment link issues
- Stock not updating
- Invoice status problems
- Any other issues

**Check documentation:**
- `STRIPE_PAYMENT_SETUP.md` - Technical setup
- `PROJECT_OVERVIEW.md` - System overview

---

## 🎉 That's It!

Creating and sending invoices is easy:

1. **Create** → Fill in details
2. **Send** → Generate payment link
3. **Share** → Send link to customer
4. **Done** → Payment auto-updates!

No manual work, everything automated! 🚀









