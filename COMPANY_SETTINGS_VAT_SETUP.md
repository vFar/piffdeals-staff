# Company Settings - VAT Toggle Feature

## Overview

This feature adds a **Company Settings** page accessible only to super administrators, allowing them to toggle VAT (Pievienotās vērtības nodoklis) calculation for all invoices. When enabled, VAT is automatically calculated and included in:
- Invoice totals displayed in the UI
- Stripe payment links sent to customers
- Activity logs for audit purposes

## Features Implemented

### 1. **Database Schema**
- New `company_settings` table to store company-wide settings
- VAT setting stored as JSONB: `{"enabled": boolean, "rate": decimal}`
- Row Level Security (RLS) policies ensuring only super_admins can modify settings
- Database functions:
  - `get_vat_setting()` - Returns current VAT configuration (accessible by all authenticated users)
  - `update_vat_setting(p_enabled, p_rate)` - Updates VAT setting (super_admin only)

### 2. **Company Settings Page** (`/company-settings`)
- **Access**: Super admin only
- **Features**:
  - Toggle VAT calculation on/off
  - Set VAT rate (default: 21% - Latvia standard rate)
  - Real-time preview of settings
  - Information box explaining how VAT affects invoices
  - Activity logging when settings are changed

### 3. **Invoice Creation with VAT**
- Automatically fetches VAT settings when creating/editing invoices
- Calculates VAT based on subtotal when enabled
- Displays VAT breakdown in invoice totals:
  - Subtotal (without VAT)
  - VAT amount (rate %)
  - Total (with VAT)
- Saves VAT information to database (`tax_rate`, `tax_amount` fields)

### 4. **Stripe Integration**
- VAT is added as a separate line item in Stripe checkout sessions
- Line item format: "PVN (21%)" with description "Pievienotās vērtības nodoklis"
- Ensures customers see the correct total including VAT
- Only adds VAT line item when VAT is enabled and > 0

### 5. **Activity Logging**
- All VAT setting changes are logged in the activity log
- Action type: `system_config_changed`
- Details include:
  - VAT enabled/disabled status
  - VAT rate percentage
  - Previous status (for comparison)
- Visible in Activity Logs page (super admin only)

### 6. **User Interface Updates**
- New menu item "Uzņēmuma iestatījumi" in sidebar (super admin only)
- Updated DashboardLayout to include company settings route
- Profile icon changed to UserOutlined to avoid icon conflict with settings

## Installation & Setup

### Step 1: Run Database Migration

Execute the SQL migration file to create the necessary database structure:

```bash
# Using Supabase CLI
supabase db push

# Or manually run the SQL file in Supabase Dashboard > SQL Editor
```

The migration file is located at:
```
supabase/migrations/create_company_settings_table.sql
```

This will:
- Create `company_settings` table
- Set up RLS policies
- Create helper functions
- Insert default VAT setting (disabled, 21% rate)

### Step 2: Deploy Edge Functions

Deploy the updated Stripe payment link function:

```bash
# Deploy create-stripe-payment-link function
supabase functions deploy create-stripe-payment-link

# Verify deployment
supabase functions list
```

### Step 3: Verify Permissions

Ensure your super admin user has the correct role:

```sql
-- Check current role
SELECT id, username, email, role FROM user_profiles WHERE email = 'your-admin@email.com';

-- Update to super_admin if needed
UPDATE user_profiles SET role = 'super_admin' WHERE email = 'your-admin@email.com';
```

### Step 4: Test the Feature

1. **Login as super admin**
2. **Navigate to "Uzņēmuma iestatījumi"** in the sidebar
3. **Toggle VAT on/off** and set the rate
4. **Save changes** and verify success message
5. **Create a test invoice** and verify:
   - VAT is calculated correctly in the UI
   - Invoice totals include VAT
   - Stripe payment link includes VAT as separate line item
6. **Check Activity Logs** to see the VAT setting change logged

## Usage

### For Super Administrators

#### Enabling VAT:
1. Go to **Uzņēmuma iestatījumi** (Company Settings)
2. Toggle **PVN aprēķins** to ON
3. Set the **PVN likme** (VAT rate) - default is 21%
4. Click **Saglabāt izmaiņas** (Save changes)

#### Disabling VAT:
1. Go to **Uzņēmuma iestatījumi**
2. Toggle **PVN aprēķins** to OFF
3. Click **Saglabāt izmaiņas**

### For All Users (Creating Invoices)

When VAT is **enabled**:
- Create invoices as usual
- VAT is automatically calculated and displayed
- Invoice totals include VAT
- Stripe payment links include VAT

When VAT is **disabled**:
- Invoices are created without VAT
- Prices remain as entered
- No VAT line item in Stripe

**Important**: VAT settings only affect **new invoices**. Existing invoices are not modified.

## Technical Details

### Database Schema

#### `company_settings` Table
```sql
CREATE TABLE company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### VAT Setting Format
```json
{
  "enabled": false,
  "rate": 0.21
}
```

### Invoice Fields
- `subtotal` - Total before VAT
- `tax_rate` - VAT rate (0.21 = 21%)
- `tax_amount` - Calculated VAT amount in euros
- `total` - Final total including VAT

### Stripe Line Items

When VAT is enabled, Stripe checkout session includes:

**Product Line Items:**
```javascript
{
  price_data: {
    currency: 'eur',
    product_data: {
      name: 'Product Name',
      description: 'Product Description'
    },
    unit_amount: 5000 // €50.00 in cents
  },
  quantity: 2
}
```

**VAT Line Item:**
```javascript
{
  price_data: {
    currency: 'eur',
    product_data: {
      name: 'PVN (21%)',
      description: 'Pievienotās vērtības nodoklis'
    },
    unit_amount: 2100 // €21.00 in cents
  },
  quantity: 1
}
```

### Activity Log Format

When VAT settings are changed:

```javascript
{
  actionType: 'system_config_changed',
  actionCategory: 'system',
  description: 'Ieslēgts PVN aprēķins (21%)', // or 'Izslēgts PVN aprēķins (21%)'
  details: {
    vat_enabled: true,
    vat_rate: 21,
    old_vat_enabled: false
  },
  targetType: 'system',
  targetId: 'vat_setting'
}
```

## Security

### Access Control
- **Company Settings Page**: Super admin only (enforced by RoleRoute)
- **Database Functions**: RLS policies ensure only super_admins can update settings
- **Reading Settings**: All authenticated users can read VAT settings (needed for invoice creation)

### RLS Policies
```sql
-- View: Super admins only
CREATE POLICY "Super admins can view company settings"
  ON company_settings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'super_admin'
  ));

-- Update: Super admins only
CREATE POLICY "Super admins can update company settings"
  ON company_settings FOR UPDATE
  USING (...) WITH CHECK (...);

-- Insert: Super admins only
CREATE POLICY "Super admins can insert company settings"
  ON company_settings FOR INSERT
  WITH CHECK (...);
```

## Troubleshooting

### VAT not calculating in invoices
1. Check if VAT is enabled in Company Settings
2. Verify `get_vat_setting()` function exists in database
3. Check browser console for errors
4. Ensure invoice page is fetching VAT settings on load

### Stripe payment link doesn't include VAT
1. Verify edge function is deployed: `supabase functions list`
2. Check invoice has `tax_rate` and `tax_amount` saved
3. Test edge function directly in Supabase Dashboard
4. Check edge function logs for errors

### Activity log not showing VAT changes
1. Verify `activity_logs` table exists
2. Check `log_activity` edge function is deployed
3. Ensure user is authenticated when changing settings
4. Check activity log filters (might be filtered out)

### Permission errors
1. Verify user role is `super_admin`: 
   ```sql
   SELECT role FROM user_profiles WHERE id = auth.uid();
   ```
2. Check RLS policies are enabled on `company_settings` table
3. Verify edge functions have correct environment variables

## Future Enhancements

Potential improvements for this feature:

1. **Multiple VAT Rates**: Support different VAT rates for different product categories
2. **VAT Exemptions**: Allow marking certain products as VAT-exempt
3. **Historical VAT Rates**: Track VAT rate changes over time
4. **VAT Reports**: Generate VAT reports for accounting purposes
5. **Invoice Templates**: Include VAT information in PDF invoices
6. **Multi-Currency VAT**: Handle VAT for different currencies
7. **Reverse Charge**: Support reverse charge mechanism for B2B transactions

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review activity logs for error details
3. Check Supabase edge function logs
4. Contact system administrator

## Version History

- **v1.0.0** (2024-12-24): Initial implementation
  - Company Settings page
  - VAT toggle functionality
  - Stripe integration
  - Activity logging
  - Database schema and functions


