-- Add stock_snapshot column to invoice_items table
-- This stores the stock level at the time of invoice creation for validation purposes
ALTER TABLE invoice_items 
ADD COLUMN IF NOT EXISTS stock_snapshot INTEGER;

-- Add comment to column
COMMENT ON COLUMN invoice_items.stock_snapshot IS 'Stock level snapshot at time of invoice creation (null = unlimited stock). Used for backend validation.';

-- Create function to validate invoice item quantity
-- Validates: quantity <= 999 AND (if stock_snapshot is not null, quantity <= stock_snapshot)
CREATE OR REPLACE FUNCTION validate_invoice_item_quantity()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate maximum quantity limit (999)
    IF NEW.quantity > 999 THEN
        RAISE EXCEPTION 'Quantity cannot exceed 999. Received: %', NEW.quantity
            USING ERRCODE = '23514'; -- Check violation error code
    END IF;
    
    -- Validate stock limit (only if stock_snapshot is not null)
    -- If stock_snapshot is null, it means unlimited stock, so no validation needed
    IF NEW.stock_snapshot IS NOT NULL AND NEW.quantity > NEW.stock_snapshot THEN
        RAISE EXCEPTION 'Quantity cannot exceed available stock. Requested: %, Available: %', 
            NEW.quantity, NEW.stock_snapshot
            USING ERRCODE = '23514'; -- Check violation error code
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate before insert or update
DROP TRIGGER IF EXISTS validate_invoice_item_quantity_trigger ON invoice_items;

CREATE TRIGGER validate_invoice_item_quantity_trigger
    BEFORE INSERT OR UPDATE ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION validate_invoice_item_quantity();

-- Add comment to function
COMMENT ON FUNCTION validate_invoice_item_quantity() IS 'Validates invoice item quantity: must be <= 999 and <= stock_snapshot (if stock_snapshot is not null)';

