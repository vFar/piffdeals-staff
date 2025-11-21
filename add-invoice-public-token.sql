-- ============================================
-- Add public_token column to invoices table
-- This enables secure public invoice sharing via unique URLs
-- ============================================

-- Add public_token column (UUID for secure public access)
ALTER TABLE invoices
ADD COLUMN public_token UUID UNIQUE DEFAULT NULL;

-- Create index for fast lookups by public token
CREATE INDEX idx_invoices_public_token ON invoices(public_token);

-- Add comment
COMMENT ON COLUMN invoices.public_token IS 'UUID token for secure public invoice access. Generated when invoice is sent to customer.';

-- Function to generate public token when invoice is sent
CREATE OR REPLACE FUNCTION generate_invoice_public_token()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate token when status changes to 'sent' and token doesn't exist
  IF NEW.status = 'sent' AND NEW.public_token IS NULL THEN
    NEW.public_token = gen_random_uuid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate public token on invoice send
CREATE TRIGGER on_invoice_sent_generate_token
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION generate_invoice_public_token();

-- For existing sent invoices without tokens, generate them
UPDATE invoices
SET public_token = gen_random_uuid()
WHERE status IN ('sent', 'paid', 'pending', 'overdue')
  AND public_token IS NULL;

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE 'Successfully added public_token column to invoices table';
  RAISE NOTICE 'Public tokens will be auto-generated when invoices are sent';
END $$;






