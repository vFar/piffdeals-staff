-- ============================================
-- PIFFDEALS STAFF PORTAL - DATABASE SCHEMA
-- Based on PROJECT_OVERVIEW.md requirements
-- ============================================

-- ============================================
-- STEP 0: Enable required extensions
-- ============================================
-- Enable pgcrypto for gen_random_uuid() function
-- Supabase usually has this enabled, but enable it just in case
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- CLEANUP: Drop existing tables and functions
-- Run this to reset database (safe to run multiple times)
-- ============================================

-- Drop everything safely (order doesn't matter with IF EXISTS and CASCADE)
DO $$ 
BEGIN
    -- Drop all possible tables (including old ones from previous versions)
    DROP TABLE IF EXISTS invoice_items CASCADE;
    DROP TABLE IF EXISTS invoices CASCADE;
    DROP TABLE IF EXISTS user_profiles CASCADE;
    
    -- Drop old tables that shouldn't exist (from previous schema versions)
    DROP TABLE IF EXISTS products CASCADE;
    DROP TABLE IF EXISTS customers CASCADE;
    DROP TABLE IF EXISTS stock_history CASCADE;
    DROP TABLE IF EXISTS api_sync_logs CASCADE;
    DROP TABLE IF EXISTS activity_logs CASCADE;
    
    -- Drop functions
    DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
    DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
    DROP FUNCTION IF EXISTS public.has_role(UUID, TEXT) CASCADE;
    DROP FUNCTION IF EXISTS public.get_user_role(UUID) CASCADE;
    DROP FUNCTION IF EXISTS public.is_admin(UUID) CASCADE;
    DROP FUNCTION IF EXISTS public.is_super_admin(UUID) CASCADE;
    DROP FUNCTION IF EXISTS public.is_user_active(UUID) CASCADE;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore any errors during cleanup
        NULL;
END $$;

-- ============================================
-- STEP 1: User Profiles Table
-- ============================================
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL, -- Name and last name (not unique, for display purposes)
  
  -- Role-based access control
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'admin', 'super_admin')),
  
  -- User status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- STEP 1.5: Helper functions for RLS (must be created before policies)
-- ============================================
-- Function to check user role without RLS recursion
-- Uses SECURITY DEFINER to bypass RLS when checking roles
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM user_profiles
  WHERE id = user_id;
  
  RETURN COALESCE(user_role, 'employee');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_user_role(user_id) IN ('admin', 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_user_role(user_id) = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Policy: Admins can create profiles
CREATE POLICY "Admins can create profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- Policy: Admins can update employee profiles and their own profile, super_admins can update all
CREATE POLICY "Admins can update profiles"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    (
      public.get_user_role(auth.uid()) = 'admin'
      AND (
        role = 'employee'
        OR auth.uid() = id  -- Allow admins to update their own profile regardless of role
      )
    )
    OR
    public.is_super_admin(auth.uid())
  );

-- Policy: Super admins can delete users
CREATE POLICY "Super admins can delete profiles"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- ============================================
-- STEP 2: Updated_at trigger function
-- ============================================
-- Note: No auto-create profile trigger - users are created manually by super_admin
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_user_profile_updated
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- STEP 3: Invoices Table
-- ============================================
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  
  -- Customer info (stored directly in invoice)
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_address TEXT,
  customer_phone TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'pending', 'overdue', 'cancelled')),
  
  -- Financial
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  
  -- Dates
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  paid_date DATE,
  
  -- Other
  notes TEXT,
  payment_terms TEXT, -- "net_30", "net_15", "due_on_receipt"
  
  -- Tracking
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Public Access
  public_token UUID UNIQUE DEFAULT NULL, -- UUID for secure public invoice access
  
  -- Stripe Payment
  stripe_payment_link TEXT, -- Stripe Payment Link URL
  stripe_payment_link_id TEXT, -- Stripe Payment Link ID
  stripe_payment_intent_id TEXT, -- Stripe Payment Intent ID (after payment)
  payment_method TEXT, -- Payment method used (stripe, bank_transfer, cash)
  
  -- Stock Management
  stock_update_status TEXT CHECK (stock_update_status IN ('pending', 'completed', 'failed')), -- Mozello stock update status
  stock_updated_at TIMESTAMP WITH TIME ZONE, -- When stock was updated
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date DESC);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_public_token ON invoices(public_token);
CREATE INDEX idx_invoices_stripe_payment_link_id ON invoices(stripe_payment_link_id);
CREATE INDEX idx_invoices_stripe_payment_intent_id ON invoices(stripe_payment_intent_id);
CREATE INDEX idx_invoices_stock_update_status ON invoices(stock_update_status);

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Policy: Employees can view their own invoices, admins can view all
CREATE POLICY "Users can view invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    public.is_admin(auth.uid())
  );

-- Policy: Public can view invoices via public_token (no auth required)
-- Allows viewing all invoices with public_token except cancelled ones
CREATE POLICY "Public can view invoices by token"
  ON invoices FOR SELECT
  TO anon, authenticated
  USING (
    public_token IS NOT NULL
    AND status != 'cancelled'
  );

-- Policy: All users can create invoices
CREATE POLICY "Users can create invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Only draft invoices can be updated (by creator or admin)
-- sent/paid/pending/overdue are LOCKED - cannot be edited by anyone
CREATE POLICY "Users can update invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (
    status = 'draft'
    AND (
      user_id = auth.uid()
      OR
      public.is_admin(auth.uid())
    )
  );

-- Policy: Only draft invoices can be deleted (by creator or super_admin)
CREATE POLICY "Users can delete invoices"
  ON invoices FOR DELETE
  TO authenticated
  USING (
    status = 'draft'
    AND (
      user_id = auth.uid()
      OR
      public.is_super_admin(auth.uid())
    )
  );

-- Apply updated_at trigger
CREATE TRIGGER on_invoice_updated
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- STEP 4: Invoice Items Table
-- ============================================
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  
  -- Product info (from Mozello API, stored at time of invoice creation)
  product_id TEXT, -- Product ID from Mozello API
  product_name TEXT NOT NULL,
  product_sku TEXT,
  product_description TEXT,
  
  -- Pricing (stored at time of invoice creation)
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_product_id ON invoice_items(product_id);

-- Enable RLS
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view items from invoices they have access to
CREATE POLICY "Users can view invoice items"
  ON invoice_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND (
        invoices.user_id = auth.uid()
        OR
        public.is_admin(auth.uid())
      )
    )
  );

-- Policy: Public can view items from public invoices
CREATE POLICY "Public can view invoice items by token"
  ON invoice_items FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.public_token IS NOT NULL
      AND invoices.status != 'cancelled'
    )
  );

-- Policy: Users can create items for their own invoices
CREATE POLICY "Users can create invoice items"
  ON invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

-- Policy: Only draft invoices can have items updated (by creator or admin)
-- sent/paid/pending/overdue are LOCKED - cannot be edited by anyone
CREATE POLICY "Users can update invoice items"
  ON invoice_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.status = 'draft'
      AND (
        invoices.user_id = auth.uid()
        OR
        public.is_admin(auth.uid())
      )
    )
  );

-- Policy: Only draft invoices can have items deleted (by creator or admin)
-- sent/paid/pending/overdue are LOCKED - cannot be edited by anyone
CREATE POLICY "Users can delete invoice items"
  ON invoice_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.status = 'draft'
      AND (
        invoices.user_id = auth.uid()
        OR
        public.is_admin(auth.uid())
      )
    )
  );

-- ============================================
-- END OF SCHEMA
-- ============================================

