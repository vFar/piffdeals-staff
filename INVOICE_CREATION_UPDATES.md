# Invoice Creation Page Updates

## ✅ Changes Completed

### 1. **Redesigned with Ant Design Components**
- ✅ Used `Input` for text fields
- ✅ Used `InputNumber` for quantity and price
- ✅ Used `DatePicker` for issue date
- ✅ Used `Select` for product selection
- ✅ Used `TextArea` for address and notes
- ✅ Used `Button` components with icons
- ✅ **Original CSS styling preserved** (inline styles maintained)

### 2. **Invoice Number Format**
- ✅ Format: `INV-########` (8 random digits)
- ✅ Example: `INV-12345678`
- ✅ Auto-generated on page load

### 3. **Due Date Auto-Calculation**
- ✅ Not selectable by user
- ✅ Automatically set to **Issue Date + 5 days**
- ✅ Displayed as disabled field with "(+5 dienas)" suffix
- ✅ Shows formatted date: `DD.MM.YYYY`

### 4. **Tax Removed**
- ✅ PVN set to 0%
- ✅ No tax calculation
- ✅ Display shows: `PVN (0%) - €0.00`
- ✅ Total = Subtotal (no tax added)

### 5. **Stripe Features Removed**
- ✅ No payment link generation
- ✅ No Stripe modal
- ✅ Simple "Nosūtīt rēķinu" button that just changes status to 'sent'

### 6. **Database Fields**
- ✅ `customer_phone` - Already exists in schema ✓
- ✅ `notes` - Already exists in schema ✓
- ✅ **No migration needed!**

---

## 📋 Field Validation

### Required Fields:
- ✅ **Klienta vārds** (Customer Name)
- ✅ **Klienta e-pasts** (Customer Email)
- ✅ **At least one product** with price > 0

### Optional Fields:
- Telefons (Phone)
- Klienta adrese (Address)
- Piezīmes (Notes)

---

## 🎨 UI Components Used

### Ant Design Components:
```jsx
import {
  Input,          // Text inputs
  InputNumber,    // Number inputs with controls
  DatePicker,     // Date selection
  Select,         // Product dropdown
  TextArea,       // Multi-line text
  Button,         // Action buttons
  Card,           // Container
  Space,          // Spacing
  Divider,        // Visual separator
  Spin,           // Loading indicator
} from 'antd';
```

### Icons:
```jsx
import {
  DeleteOutlined,  // Remove item
  PlusOutlined,    // Add item
  SaveOutlined,    // Save draft
  SendOutlined,    // Send invoice
} from '@ant-design/icons';
```

---

## 🔢 Invoice Number Generation

```javascript
const generateInvoiceNumber = () => {
  // Generate 8 random digits
  const random = String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
  setInvoiceNumber(`INV-${random}`);
};

// Examples:
// INV-00001234
// INV-12345678
// INV-98765432
```

---

## 📅 Due Date Calculation

```javascript
const calculateDueDate = (issueDateValue) => {
  return issueDateValue.add(5, 'day');
};

// Example:
// Issue Date: 15.11.2024
// Due Date: 20.11.2024 (auto-calculated)
```

---

## 💰 Price Calculation

```javascript
// No tax applied
const calculateSubtotal = () => {
  return items.reduce((sum, item) => sum + parseFloat(item.total || 0), 0);
};

const calculateTotal = () => {
  return calculateSubtotal(); // Total = Subtotal
};

// Example:
// Subtotal: €100.00
// PVN (0%): €0.00
// Total: €100.00
```

---

## 📦 Product Selection

Products loaded from Mozello API:
- ✅ Only visible products
- ✅ Only products with stock > 0
- ✅ Searchable dropdown
- ✅ Shows: "Product Name - €99.99"
- ✅ Auto-fills price when selected

---

## 💾 Save Actions

### Save as Draft:
```javascript
handleSave(false)
// Status: 'draft'
// Can be edited later
```

### Send Invoice:
```javascript
handleSave(true)
// Status: 'sent'
// Due date: Issue date + 5 days
```

---

## 🎯 Data Saved to Database

```javascript
{
  invoice_number: "INV-12345678",
  customer_name: "John Doe",
  customer_email: "john@example.com",
  customer_phone: "+371 22222222",
  customer_address: "Graudu iela 44, Liepāja",
  issue_date: "2024-11-15",
  due_date: "2024-11-20",  // Auto: +5 days
  subtotal: 100.00,
  tax_rate: 0,
  tax_amount: 0,
  total: 100.00,
  status: "sent",  // or "draft"
  notes: "Piegāde līdz 5pm",
  user_id: "current-user-id"
}
```

---

## 🚀 Running the Application

### Start Dev Server:
```bash
npm run dev
```

### Access:
```
http://localhost:5173/invoices/create
```

---

## 🐛 PowerShell Script Issue

If you get an error running `deploy-stripe-functions.ps1`:

### Solution 1: Run as File
```powershell
# Don't copy-paste line by line
# Run the entire file:
.\deploy-stripe-functions.ps1
```

### Solution 2: Check Execution Policy
```powershell
# Check current policy
Get-ExecutionPolicy

# If restricted, set to RemoteSigned
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Then run script
.\deploy-stripe-functions.ps1
```

### Solution 3: Bypass for Single Run
```powershell
powershell -ExecutionPolicy Bypass -File .\deploy-stripe-functions.ps1
```

---

## ✅ Testing Checklist

- [ ] Invoice number auto-generates
- [ ] Products load from Mozello
- [ ] Quantity can be changed
- [ ] Price can be changed
- [ ] Total calculates correctly (no tax)
- [ ] Due date shows +5 days from issue date
- [ ] Can add multiple products
- [ ] Can remove products (minimum 1)
- [ ] Save as draft works
- [ ] Send invoice works
- [ ] Notes field saves
- [ ] Phone field saves

---

## 📝 Next Steps

1. **Test the invoice creation page**
2. **Create a test invoice**
3. **Verify data in Supabase dashboard**
4. **Check invoice appears in `/invoices` list**

---

## 🎨 Design Preserved

All original CSS styling has been maintained:
- Colors: Blue (#0068FF), Gray shades
- Border radius: 12px
- Font sizes and weights
- Spacing and padding
- Hover effects
- Responsive grid layout

The only change is using Ant Design components instead of raw HTML inputs, but the visual appearance remains the same!









