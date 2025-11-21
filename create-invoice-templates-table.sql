-- ============================================
-- INVOICE TEMPLATES TABLE
-- Allows users to save invoice client data as reusable templates
-- Templates are PRIVATE (each user can only see their own)
-- ============================================

CREATE TABLE invoice_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Template name (user-defined)
  template_name TEXT NOT NULL,
  
  -- Customer info (stored from invoice form)
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_address TEXT,
  customer_phone TEXT,
  
  -- Notes (optional)
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_invoice_templates_user_id ON invoice_templates(user_id);
CREATE INDEX idx_invoice_templates_created_at ON invoice_templates(created_at DESC);

-- Enable RLS
ALTER TABLE invoice_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own templates
CREATE POLICY "Users can view own templates"
  ON invoice_templates FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can create their own templates
CREATE POLICY "Users can create own templates"
  ON invoice_templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own templates
CREATE POLICY "Users can update own templates"
  ON invoice_templates FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own templates
CREATE POLICY "Users can delete own templates"
  ON invoice_templates FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Apply updated_at trigger
CREATE TRIGGER on_invoice_template_updated
  BEFORE UPDATE ON invoice_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();




