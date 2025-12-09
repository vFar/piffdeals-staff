-- Add column to track when reminder email was sent (36 hours before due_date)
-- This prevents sending duplicate reminder emails

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS last_reminder_email_sent TIMESTAMP WITH TIME ZONE;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_invoices_last_reminder_email_sent 
ON invoices(last_reminder_email_sent);

-- Add comment
COMMENT ON COLUMN invoices.last_reminder_email_sent IS 'Timestamp when reminder email was sent (36 hours before due_date)';





