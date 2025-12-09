-- Add 'unsent' status to invoices table
-- This status indicates invoice is ready to be sent but hasn't been sent yet

-- First, update the CHECK constraint to include 'unsent'
ALTER TABLE invoices 
DROP CONSTRAINT IF EXISTS invoices_status_check;

ALTER TABLE invoices 
ADD CONSTRAINT invoices_status_check 
CHECK (status IN ('draft', 'unsent', 'sent', 'paid', 'pending', 'overdue', 'cancelled'));

-- Add comment explaining the new status
COMMENT ON COLUMN invoices.status IS 'Invoice status: draft (being created), unsent (ready to send but not sent), sent (sent to customer), pending (payment pending), paid (payment received), overdue (past due date), cancelled (cancelled)';





