# Mozello API Integration Setup

## ✅ What's Been Done

Your invoice system now integrates with Mozello Store API:

1. **Product Loading** - Fetches available products from your Mozello store
2. **Product Selection** - Dropdown selector shows only visible and in-stock products
3. **Stock Updates** - Automatically decreases stock when invoice is paid
4. **Latvian Interface** - All labels translated to Latvian
5. **Auto Invoice Numbers** - Format: `INV-YYYYMMDD-####`

---

## 🔑 Your Mozello API Key

Already configured in the code:
```
MZL-2322156-d84bf15a29941297f704ebd31b71bb54
```

---

## 📋 Database Migration Required

Run this SQL in **Supabase SQL Editor**:

```sql
-- Add customer_phone field
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- Add index
CREATE INDEX IF NOT EXISTS idx_invoices_customer_phone ON invoices(customer_phone);

-- Add comments
COMMENT ON COLUMN invoices.customer_phone IS 'Customer phone number for contact';
COMMENT ON COLUMN invoices.notes IS 'Additional notes or instructions for the customer';
```

Or run the file: `database-migration-add-notes-phone.sql`

---

## ⚙️ Edge Function Configuration

Your Mozello API credentials need to be added to Supabase Edge Function secrets:

### Go to Supabase Dashboard → Edge Functions → Manage secrets

Add these secrets:

```bash
MOZELLO_API_URL=https://api.mozello.com/v1
MOZELLO_API_KEY=MZL-2322156-d84bf15a29941297f704ebd31b71bb54
```

---

## 🚀 Deploy Edge Functions

Run the deployment script:

**Windows (PowerShell):**
```powershell
.\deploy-stripe-functions.ps1
```

**Linux/Mac:**
```bash
./deploy-stripe-functions.sh
```

This deploys:
- `create-stripe-payment-link` - Generates payment links
- `stripe-webhook` - Handles payment notifications
- `update-mozello-stock` - Updates Mozello inventory

---

## 🧪 Test Product Loading

1. Go to `/invoices/create` in your app
2. Click on the product dropdown
3. You should see all visible products from your Mozello store
4. Only products with stock > 0 (or unlimited stock) will show

---

## 📦 How Stock Updates Work

### When Invoice is Paid:

```
1. Stripe webhook fires
   └─> Invoice status → 'paid'

2. update-mozello-stock function triggered
   └─> For each product in invoice:
       ├─> GET current stock from Mozello
       ├─> Calculate: new_stock = current_stock - quantity_sold
       └─> PUT updated stock to Mozello

3. Stock updated in Mozello
   └─> Your online store shows new stock
```

### Example:
- Product A has 50 units in stock
- Customer buys 3 units
- After payment: Product A has 47 units in stock

---

## 🎯 Product Filtering

Products shown in invoice creation are filtered by:

✅ **Visible** - `product.visible === true`
✅ **In Stock** - `product.stock === null || product.stock > 0`
✅ **Has Available Variants** - At least one variant has stock

Products NOT shown:
❌ Hidden products (`visible: false`)
❌ Out of stock products (`stock: 0`)
❌ Products with all variants out of stock

---

## 📝 Invoice Fields

### Auto-generated:
- **Invoice Number**: `INV-20240115-1234`
- **Issue Date**: Today's date

### Required Fields:
- **Customer Name** *
- **Customer Email** *
- **At least one product** *

### Optional Fields:
- Customer Phone
- Customer Address
- Due Date
- Notes

---

## 🌍 Mozello API Reference

Based on: [https://www.mozello.com/developers/store-api/](https://www.mozello.com/developers/store-api/)

### Get Products:
```
GET https://api.mozello.com/v1/store/products/
Authorization: ApiKey MZL-2322156-d84bf15a29941297f704ebd31b71bb54
```

### Get Single Product:
```
GET https://api.mozello.com/v1/store/product/{product-handle}/
Authorization: ApiKey MZL-2322156-d84bf15a29941297f704ebd31b71bb54
```

### Update Product Stock:
```
PUT https://api.mozello.com/v1/store/product/{product-handle}/
Authorization: ApiKey MZL-2322156-d84bf15a29941297f704ebd31b71bb54
Content-Type: application/json

{
  "product": {
    "stock": 47
  }
}
```

---

## 🔒 Security Notes

### API Key Security:
- ✅ API key is in backend code only (Edge Functions and services)
- ✅ Never exposed in frontend bundle
- ✅ All requests go through Supabase Edge Functions
- ✅ Frontend uses Supabase authentication

### Stock Update Security:
- Only triggered after verified Stripe payment
- Webhook signature verified before processing
- Stock can't be decreased without payment

---

## 🐛 Troubleshooting

### Products not loading?

**Check:**
1. Mozello API key is correct
2. Products exist in your Mozello store
3. Products are marked as "visible"
4. Products have stock > 0

**Debug:**
Open browser console and check for errors when loading `/invoices/create`

### Stock not updating after payment?

**Check:**
1. Mozello API credentials set in Supabase Edge Function secrets
2. `update-mozello-stock` function deployed
3. Product IDs in invoice match Mozello product handles
4. Check Edge Function logs in Supabase Dashboard

### Products showing as "Bez nosaukuma"?

This means the product doesn't have a title. Check your Mozello store admin.

---

## 📊 Testing Checklist

- [ ] Run database migration
- [ ] Set Mozello API credentials in Edge Functions
- [ ] Deploy Edge Functions
- [ ] Open `/invoices/create`
- [ ] See products in dropdown
- [ ] Create test invoice
- [ ] Generate payment link
- [ ] Make test payment
- [ ] Verify invoice status changes to "paid"
- [ ] Check stock decreased in Mozello admin

---

## 🎉 You're Ready!

Your staff can now:
1. **Create invoices** with products from your Mozello store
2. **Send payment links** to customers
3. **Track payments** automatically
4. **Stock updates** automatically

Everything is automated! 🚀

---

## 📞 Support

**Mozello API Issues:**
- Check: [Mozello Developer Docs](https://www.mozello.com/developers/store-api/)
- Contact: Mozello support

**Stripe/Payment Issues:**
- See: `STRIPE_PAYMENT_SETUP.md`

**General Issues:**
- See: `IMPLEMENTATION_SUMMARY.md`
- Check Edge Function logs in Supabase Dashboard

