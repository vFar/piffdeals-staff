-- ============================================
-- Add Stripe payment tracking columns to invoices table
-- These columns track Stripe payment links and payment status
-- ============================================

-- Add Stripe payment columns
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS stripe_payment_link TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_link_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS stock_update_status TEXT CHECK (stock_update_status IN ('pending', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS stock_updated_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_payment_link_id ON invoices(stripe_payment_link_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_payment_intent_id ON invoices(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stock_update_status ON invoices(stock_update_status);

-- Add comments
COMMENT ON COLUMN invoices.stripe_payment_link IS 'Stripe Payment Link URL for customer payment';
COMMENT ON COLUMN invoices.stripe_payment_link_id IS 'Stripe Payment Link ID';
COMMENT ON COLUMN invoices.stripe_payment_intent_id IS 'Stripe Payment Intent ID after successful payment';
COMMENT ON COLUMN invoices.payment_method IS 'Payment method used (e.g., stripe, bank_transfer, cash)';
COMMENT ON COLUMN invoices.stock_update_status IS 'Status of Mozello stock update after payment';
COMMENT ON COLUMN invoices.stock_updated_at IS 'Timestamp when Mozello stock was updated';

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE 'Successfully added Stripe payment tracking columns to invoices table';
END $$;






