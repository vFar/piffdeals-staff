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
-- NOTE: This schema does NOT delete existing data
-- It uses CREATE TABLE IF NOT EXISTS and CREATE OR REPLACE for functions
-- Safe to run on existing databases without data loss
-- ============================================

-- ============================================
-- STEP 1: User Profiles Table
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL, -- Name and last name (not unique, for display purposes)
  
  -- Role-based access control
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'admin', 'super_admin')),
  
  -- User status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  
  -- User creation tracking
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
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

-- Function to check if user is employee
CREATE OR REPLACE FUNCTION public.is_employee(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_user_role(user_id) = 'employee';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin (not super_admin)
CREATE OR REPLACE FUNCTION public.is_admin_only(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_user_role(user_id) = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe - doesn't delete data, only access rules)
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can create profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can delete profiles" ON user_profiles;

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

-- Drop trigger if it exists, then create it (safe - doesn't delete data)
DROP TRIGGER IF EXISTS on_user_profile_updated ON user_profiles;
CREATE TRIGGER on_user_profile_updated
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- STEP 3: Invoices Table
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
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
  last_invoice_email_sent TIMESTAMP WITH TIME ZONE, -- Rate limiting: last time email was sent for this invoice
  
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

-- Create indexes (IF NOT EXISTS to avoid errors if they already exist)
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_public_token ON invoices(public_token);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_payment_link_id ON invoices(stripe_payment_link_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_payment_intent_id ON invoices(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stock_update_status ON invoices(stock_update_status);
CREATE INDEX IF NOT EXISTS idx_invoices_last_email_sent ON invoices(last_invoice_email_sent);

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe - doesn't delete data, only access rules)
DROP POLICY IF EXISTS "Users can view invoices" ON invoices;
DROP POLICY IF EXISTS "Public can view invoices by token" ON invoices;
DROP POLICY IF EXISTS "Users can create invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update invoices" ON invoices;
DROP POLICY IF EXISTS "Users can delete invoices" ON invoices;

-- Policy: Employees can view their own invoices, admins can view employee invoices only
CREATE POLICY "Users can view invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    -- Users can always view their own invoices
    user_id = auth.uid()
    OR
    -- Admins can view invoices created by employees (but not by other admins)
    (
      public.is_admin(auth.uid())
      AND public.is_employee(user_id)
    )
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

-- Policy: Allows updating invoices
-- Draft invoices: Can be edited (content or status) by creator/admin/super_admin
-- Non-draft invoices: Can only change status (by creator only), cannot edit content
-- Super_admin can update any draft invoice
-- Admins (not super_admin) can update invoices created by employees (but not by super_admin or other admins)
CREATE POLICY "Users can update invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (
    (
      -- Case 1: Draft invoices - can be updated by creator/admin/super_admin
      (
        status = 'draft'
        AND (
          -- Creator can always update their own invoices
          user_id = auth.uid()
          OR
          -- Super_admin can update any draft invoice
          public.is_super_admin(auth.uid())
          OR
          -- Admins (not super_admin) can update invoices created by employees (but not by super_admin or other admins)
          (
            public.is_admin_only(auth.uid())
            AND public.is_employee(user_id)
          )
        )
      )
      OR
      -- Case 2: Non-draft invoices - can only change status (by creator only)
      (
        status IN ('sent', 'pending', 'overdue')
        AND user_id = auth.uid()  -- Only creator can update non-draft invoices
      )
    )
  )
  WITH CHECK (
    (
      -- Case 1: Draft invoices - can be updated to draft (content edit) or sent (status change)
      (
        status IN ('draft', 'sent')
        AND (
          -- Creator can always update their own invoices
          user_id = auth.uid()
          OR
          -- Super_admin can update any draft invoice
          public.is_super_admin(auth.uid())
          OR
          -- Admins (not super_admin) can update invoices created by employees (but not by super_admin or other admins)
          (
            public.is_admin_only(auth.uid())
            AND public.is_employee(user_id)
          )
        )
      )
      OR
      -- Case 2: Non-draft invoices - can change status (by creator only)
      -- Allow status changes from sent/pending/overdue to other valid statuses
      -- Note: Content edits are prevented by application logic, RLS only controls access
      (
        status IN ('paid', 'pending', 'overdue', 'cancelled', 'sent')
        AND user_id = auth.uid()  -- Only creator can update non-draft invoices
      )
    )
  );

-- Policy: Only draft invoices can be deleted
-- Employees can delete their own draft invoices
-- Admins (not super_admin) can delete draft invoices created by employees (but not by super_admin or other admins)
-- Super_admin can delete any draft invoice
CREATE POLICY "Users can delete invoices"
  ON invoices FOR DELETE
  TO authenticated
  USING (
    status = 'draft'
    AND (
      -- Creator can always delete their own invoices
      user_id = auth.uid()
      OR
      -- Super_admin can delete any draft invoice
      public.is_super_admin(auth.uid())
      OR
      -- Admins (not super_admin) can delete invoices created by employees (but not by super_admin or other admins)
      (
        public.is_admin_only(auth.uid())
        AND public.is_employee(user_id)
      )
    )
  );

-- Apply updated_at trigger (drop if exists first - safe, doesn't delete data)
DROP TRIGGER IF EXISTS on_invoice_updated ON invoices;
CREATE TRIGGER on_invoice_updated
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- STEP 4: Invoice Items Table
-- ============================================
CREATE TABLE IF NOT EXISTS invoice_items (
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

-- Create indexes (IF NOT EXISTS to avoid errors if they already exist)
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON invoice_items(product_id);

-- Enable RLS
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe - doesn't delete data, only access rules)
DROP POLICY IF EXISTS "Users can view invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Public can view invoice items by token" ON invoice_items;
DROP POLICY IF EXISTS "Users can create invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Users can update invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Users can delete invoice items" ON invoice_items;

-- Policy: Users can view items from invoices they have access to
CREATE POLICY "Users can view invoice items"
  ON invoice_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND (
        -- Users can view items from their own invoices
        invoices.user_id = auth.uid()
        OR
        -- Admins can view items from invoices created by employees (but not by other admins)
        (
          public.is_admin(auth.uid())
          AND public.is_employee(invoices.user_id)
        )
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

-- Policy: Users can create items for invoices they can edit
-- Employees can create items for their own invoices
-- Super_admin can create items for any draft invoice
-- Admins (not super_admin) can create items for draft invoices created by employees (but not by super_admin or other admins)
CREATE POLICY "Users can create invoice items"
  ON invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.status = 'draft'
      AND (
        -- Creator can always create items for their own invoices
        invoices.user_id = auth.uid()
        OR
        -- Super_admin can create items for any draft invoice
        public.is_super_admin(auth.uid())
        OR
        -- Admins (not super_admin) can create items for invoices created by employees (but not by super_admin or other admins)
        (
          public.is_admin_only(auth.uid())
          AND public.is_employee(invoices.user_id)
        )
      )
    )
  );

-- Policy: Only draft invoices can have items updated
-- sent/paid/pending/overdue are LOCKED - cannot be edited by anyone
-- Employees can update items in their own draft invoices
-- Super_admin can update items in any draft invoice
-- Admins (not super_admin) can update items in draft invoices created by employees (but not by super_admin or other admins)
CREATE POLICY "Users can update invoice items"
  ON invoice_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.status = 'draft'
      AND (
        -- Creator can always update items in their own invoices
        invoices.user_id = auth.uid()
        OR
        -- Super_admin can update items in any draft invoice
        public.is_super_admin(auth.uid())
        OR
        -- Admins (not super_admin) can update items in invoices created by employees (but not by super_admin or other admins)
        (
          public.is_admin_only(auth.uid())
          AND public.is_employee(invoices.user_id)
        )
      )
    )
  );

-- Policy: Only draft invoices can have items deleted
-- sent/paid/pending/overdue are LOCKED - cannot be edited by anyone
-- Employees can delete items from their own draft invoices
-- Admins can delete items from draft invoices created by employees (but not by other admins)
CREATE POLICY "Users can delete invoice items"
  ON invoice_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.status = 'draft'
      AND (
        -- Creator can always delete items from their own invoices
        invoices.user_id = auth.uid()
        OR
        -- Super_admin can delete items from any draft invoice
        public.is_super_admin(auth.uid())
        OR
        -- Admins (not super_admin) can delete items from invoices created by employees (but not by super_admin or other admins)
        (
          public.is_admin_only(auth.uid())
          AND public.is_employee(invoices.user_id)
        )
      )
    )
  );

-- ============================================
-- STEP 5: Activity Logs Table
-- ============================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User who performed the action
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_username TEXT,
  user_email TEXT,
  user_role TEXT,
  
  -- Action details
  action_type TEXT NOT NULL,
  action_category TEXT NOT NULL CHECK (action_category IN ('user_management', 'invoice_management', 'system', 'security')),
  description TEXT NOT NULL,
  details JSONB, -- Additional structured data (e.g., { old_value: 'admin', new_value: 'super_admin' })
  
  -- Target entity (what was affected)
  target_type TEXT, -- 'user', 'invoice', 'system', etc.
  target_id UUID, -- ID of the affected entity
  
  -- Request metadata
  ip_address TEXT,
  user_agent TEXT,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance (IF NOT EXISTS to avoid errors if they already exist)
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_category ON activity_logs(action_category);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_target_type ON activity_logs(target_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_target_id ON activity_logs(target_id);

-- Enable RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe - doesn't delete data, only access rules)
DROP POLICY IF EXISTS "Super admins can view activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Allow activity log inserts via function" ON activity_logs;

-- Policy: Only super_admins can view activity logs
CREATE POLICY "Super admins can view activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Policy: Allow inserts via the log_activity function (which uses SECURITY DEFINER)
-- The function itself handles authorization, so we allow authenticated users to insert
-- The function will be called by the application to log activities
CREATE POLICY "Allow activity log inserts via function"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to log activity (can be called by any authenticated user, but uses SECURITY DEFINER)
-- This allows the function to insert logs even if the caller is not a super_admin
CREATE OR REPLACE FUNCTION public.log_activity(
  p_user_id UUID,
  p_action_type TEXT,
  p_action_category TEXT,
  p_description TEXT,
  p_details TEXT DEFAULT NULL, -- JSON string that will be converted to JSONB
  p_target_type TEXT DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_user_profile RECORD;
  v_log_id UUID;
  v_details_jsonb JSONB;
BEGIN
  -- Get user profile information (SECURITY DEFINER bypasses RLS)
  BEGIN
    SELECT username, email, role INTO v_user_profile
    FROM user_profiles
    WHERE id = p_user_id;
  EXCEPTION WHEN OTHERS THEN
    -- If we can't get profile, continue with NULL values (will use COALESCE defaults)
    v_user_profile := NULL;
  END;
  
  -- Convert details JSON string to JSONB if provided
  IF p_details IS NOT NULL THEN
    BEGIN
      v_details_jsonb := p_details::JSONB;
    EXCEPTION WHEN OTHERS THEN
      v_details_jsonb := NULL;
    END;
  END IF;
  
  -- Insert activity log (SECURITY DEFINER bypasses RLS)
  INSERT INTO activity_logs (
    user_id,
    user_username,
    user_email,
    user_role,
    action_type,
    action_category,
    description,
    details,
    target_type,
    target_id,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    COALESCE(v_user_profile.username, 'Unknown'),
    COALESCE(v_user_profile.email, 'unknown@example.com'),
    COALESCE(v_user_profile.role, 'employee'),
    p_action_type,
    p_action_category,
    p_description,
    v_details_jsonb,
    p_target_type,
    p_target_id,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail - return NULL if insert fails
  -- This ensures logging errors don't break the application
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- END OF SCHEMA
-- ============================================

