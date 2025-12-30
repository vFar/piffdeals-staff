-- Create customer_blacklist table
-- This table stores customers who have been blacklisted due to overdue invoices or other payment issues

CREATE TABLE IF NOT EXISTS customer_blacklist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    reason TEXT,
    overdue_count INTEGER DEFAULT 0,
    added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on customer_email for faster lookups
CREATE INDEX IF NOT EXISTS idx_customer_blacklist_email ON customer_blacklist(customer_email);

-- Create index on customer_name for faster lookups (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_customer_blacklist_name ON customer_blacklist(LOWER(customer_name));

-- Add unique constraint on customer_email to prevent duplicates
ALTER TABLE customer_blacklist ADD CONSTRAINT unique_customer_email UNIQUE (customer_email);

-- Enable Row Level Security
ALTER TABLE customer_blacklist ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view blacklist
CREATE POLICY "All authenticated users can view blacklist" 
ON customer_blacklist FOR SELECT 
TO authenticated 
USING (true);

-- Policy: All authenticated users can insert into blacklist
CREATE POLICY "All authenticated users can insert into blacklist" 
ON customer_blacklist FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Policy: All authenticated users can update blacklist
CREATE POLICY "All authenticated users can update blacklist" 
ON customer_blacklist FOR UPDATE 
TO authenticated 
USING (true);

-- Policy: All authenticated users can delete from blacklist
CREATE POLICY "All authenticated users can delete from blacklist" 
ON customer_blacklist FOR DELETE 
TO authenticated 
USING (true);

-- Add comment to table
COMMENT ON TABLE customer_blacklist IS 'Stores customers who are blacklisted due to payment issues (e.g., more than 2 overdue invoices)';
COMMENT ON COLUMN customer_blacklist.customer_name IS 'Customer name as entered in invoice';
COMMENT ON COLUMN customer_blacklist.customer_email IS 'Customer email address (primary identifier)';
COMMENT ON COLUMN customer_blacklist.reason IS 'Reason for blacklisting';
COMMENT ON COLUMN customer_blacklist.overdue_count IS 'Number of overdue invoices';
COMMENT ON COLUMN customer_blacklist.added_by IS 'User who added this customer to blacklist';






