# Quick Start - Mozello Integration

## 🎯 What's New

Your invoice creation page now:
- ✅ Loads products from your Mozello store automatically
- ✅ Shows only available products (visible & in stock)
- ✅ All text in Latvian
- ✅ Auto-generates invoice numbers: `INV-20240115-####`
- ✅ Includes notes field for customer instructions
- ✅ Includes phone field for customer contact

---

## ⚡ Quick Setup (5 minutes)

### Step 1: Run Database Migration

Go to **Supabase Dashboard → SQL Editor** and run:

```sql
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_phone TEXT;
CREATE INDEX IF NOT EXISTS idx_invoices_customer_phone ON invoices(customer_phone);
```

### Step 2: Configure Mozello API in Edge Functions

Go to **Supabase Dashboard → Edge Functions → Manage secrets**

Add these 2 secrets:
```
MOZELLO_API_URL = https://api.mozello.com/v1
MOZELLO_API_KEY = MZL-2322156-d84bf15a29941297f704ebd31b71bb54
```

### Step 3: Deploy Edge Functions

Open PowerShell and run:
```powershell
cd C:\Users\Markuss\Desktop\piffdeals-staff
.\deploy-stripe-functions.ps1
```

### Step 4: Test It

1. Go to your app: `http://localhost:5173/invoices/create`
2. Click the product dropdown
3. You should see products from your Mozello store!

---

## 🎨 What Changed

### Invoice Creation Page (`/invoices/create`)

**Before:**
- Manual product entry
- English labels
- No notes field

**After:**
- Product dropdown from Mozello
- Latvian labels
- Notes section included
- Phone field added

### Translation Examples:

| English | Latvian |
|---------|---------|
| Create Invoice | Izveidot Rēķinu |
| Bill To | Rēķina saņēmējs |
| Client Name | Klienta vārds |
| Issue Date | Izrakstīšanas datums |
| Due Date | Apmaksas termiņš |
| Product | Produkts |
| Quantity | Daudz. |
| Price | Cena |
| Total | Kopā |
| Add Item | Pievienot produktu |
| Subtotal | Starpsumma |
| Notes | Piezīmes |
| Save Draft | Saglabāt melnrakstu |
| Send Invoice | Nosūtīt rēķinu |

---

## 📦 Product Loading

### API Call:
```javascript
GET https://api.mozello.com/v1/store/products/
Authorization: ApiKey MZL-2322156-d84bf15a29941297f704ebd31b71bb54
```

### Filtering:
Only products that meet ALL criteria are shown:
- ✅ `visible: true`
- ✅ `stock: null` OR `stock > 0`
- ✅ If has variants: at least one variant has stock

### Product Display:
Products shown as: **"Product Name - €99.99"**

---

## 🔄 Stock Update Flow

```
Customer Pays
    ↓
Stripe Webhook
    ↓
Invoice Status → "paid"
    ↓
update-mozello-stock Function
    ↓
For each product:
  1. GET current stock from Mozello
  2. Calculate: new_stock = current - quantity_sold
  3. PUT new stock to Mozello
    ↓
Stock Updated in Mozello Store
```

---

## 🧪 Testing Steps

### Test Product Loading:
1. Go to `/invoices/create`
2. Click product dropdown
3. ✅ Should see your Mozello products
4. ❌ If empty: Check Mozello API key in browser console

### Test Invoice Creation:
1. Select a product
2. Fill customer details
3. Click "Saglabāt melnrakstu"
4. ✅ Should save as draft
5. Check in `/invoices`

### Test Payment & Stock:
1. Create invoice
2. Click "Nosūtīt rēķinu"
3. Copy payment link
4. Pay with test card: `4242 4242 4242 4242`
5. ✅ Invoice should change to "Apmaksāts"
6. ✅ Check Mozello admin - stock should decrease

---

## 🔑 Environment Variables Summary

### Frontend (Already in Code):
```javascript
// src/services/mozelloService.js
const MOZELLO_API_KEY = 'MZL-2322156-d84bf15a29941297f704ebd31b71bb54';
const MOZELLO_API_BASE = 'https://api.mozello.com/v1';
```

### Backend (Add to Supabase):
```
MOZELLO_API_URL=https://api.mozello.com/v1
MOZELLO_API_KEY=MZL-2322156-d84bf15a29941297f704ebd31b71bb54
```

---

## 📝 Invoice Number Format

**Auto-generated format:**
```
INV-YYYYMMDD-RRRR

Examples:
INV-20240115-0001
INV-20240115-1234
INV-20240116-0042
```

- `YYYY` = Year
- `MM` = Month
- `DD` = Day
- `RRRR` = Random 4-digit number

---

## ⚠️ Important Notes

### API Rate Limits:
From Mozello docs:
- Max 5 requests per second
- Max 300 requests per minute
- Your app respects these limits ✅

### Stock Tracking:
- If `stock: null` → Product has unlimited stock (won't be updated)
- If `stock: 0` → Product hidden from dropdown (out of stock)
- If `stock > 0` → Product shown and stock will decrease after payment

### Data Storage:
- Products NOT stored in your database
- Products fetched from Mozello API on-demand
- Only `product_id` (handle) stored in `invoice_items`

---

## 🐛 Common Issues

### Issue: "Neizdevās ielādēt produktus"

**Cause:** API key invalid or network issue

**Fix:**
1. Check API key in `src/services/mozelloService.js`
2. Try visiting: `https://api.mozello.com/v1/store/products/` in browser
3. Check browser console for errors

### Issue: Products not showing

**Cause:** No visible products in Mozello store

**Fix:**
1. Go to Mozello admin
2. Check products are marked as "visible"
3. Check products have stock > 0

### Issue: Stock not updating after payment

**Cause:** Mozello API credentials not set in Edge Functions

**Fix:**
1. Go to Supabase Dashboard → Edge Functions → Manage secrets
2. Add `MOZELLO_API_URL` and `MOZELLO_API_KEY`
3. Redeploy Edge Functions

---

## ✅ Verification Checklist

- [ ] Database migration run
- [ ] Mozello API credentials added to Supabase
- [ ] Edge Functions deployed
- [ ] Can see products in dropdown at `/invoices/create`
- [ ] Can create invoice
- [ ] Can send invoice (generates payment link)
- [ ] Test payment updates invoice to "paid"
- [ ] Stock decreases in Mozello after payment

---

## 🎉 You're Done!

Your invoice system now:
1. Loads products from Mozello automatically
2. Only shows available products
3. Updates stock when invoices are paid
4. Everything in Latvian!

**Next:** Test the complete flow with a real product and test payment.

---

## 📚 More Documentation

- **Full Setup:** `MOZELLO_INTEGRATION_SETUP.md`
- **Payment Setup:** `STRIPE_PAYMENT_SETUP.md`
- **Employee Guide:** `EMPLOYEE_INVOICE_GUIDE.md`
- **API Reference:** [Mozello Developer Docs](https://www.mozello.com/developers/store-api/)


