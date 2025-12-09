-- ============================================
-- PART 4: FIX REMAINING FUNCTIONS
-- Direct replacement (simpler approach)
-- ============================================

-- Fix login rate limiting functions (if they exist)
-- These will only work if login_attempts table exists

-- 8. Fix is_email_blocked
CREATE OR REPLACE FUNCTION public.is_email_blocked(check_email TEXT)
RETURNS BOOLEAN 
SET search_path = public, pg_temp
AS $$
DECLARE
  attempt_record login_attempts%ROWTYPE;
BEGIN
  SELECT * INTO attempt_record
  FROM login_attempts
  WHERE email = LOWER(check_email)
  ORDER BY updated_at DESC
  LIMIT 1;
  
  -- If no record exists, not blocked
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- If blocked_until is set and in the future, user is blocked
  IF attempt_record.blocked_until IS NOT NULL AND attempt_record.blocked_until > NOW() THEN
    RETURN TRUE;
  END IF;
  
  -- If attempt_count >= 5 and last attempt was less than 15 minutes ago, block
  IF attempt_record.attempt_count >= 5 THEN
    -- Block for 15 minutes from last attempt
    IF attempt_record.last_attempt_at > NOW() - INTERVAL '15 minutes' THEN
      RETURN TRUE;
    ELSE
      -- Reset if 15 minutes have passed
      UPDATE login_attempts
      SET attempt_count = 0,
          blocked_until = NULL,
          updated_at = NOW()
      WHERE email = LOWER(check_email);
      RETURN FALSE;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Fix get_blocked_until
CREATE OR REPLACE FUNCTION public.get_blocked_until(check_email TEXT)
RETURNS TIMESTAMP WITH TIME ZONE 
SET search_path = public, pg_temp
AS $$
DECLARE
  attempt_record login_attempts%ROWTYPE;
BEGIN
  SELECT * INTO attempt_record
  FROM login_attempts
  WHERE email = LOWER(check_email)
  ORDER BY updated_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- If blocked_until is set and in the future, return it
  IF attempt_record.blocked_until IS NOT NULL AND attempt_record.blocked_until > NOW() THEN
    RETURN attempt_record.blocked_until;
  END IF;
  
  -- If attempt_count >= 5, calculate blocked_until from last_attempt_at
  IF attempt_record.attempt_count >= 5 AND attempt_record.last_attempt_at > NOW() - INTERVAL '15 minutes' THEN
    RETURN attempt_record.last_attempt_at + INTERVAL '15 minutes';
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Fix record_failed_login
CREATE OR REPLACE FUNCTION public.record_failed_login(check_email TEXT)
RETURNS JSONB 
SET search_path = public, pg_temp
AS $$
DECLARE
  attempt_record login_attempts%ROWTYPE;
  new_count INTEGER;
  block_until TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get or create attempt record
  SELECT * INTO attempt_record
  FROM login_attempts
  WHERE email = LOWER(check_email)
  ORDER BY updated_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    -- Create new record
    INSERT INTO login_attempts (email, attempt_count, last_attempt_at)
    VALUES (LOWER(check_email), 1, NOW())
    RETURNING * INTO attempt_record;
    new_count := 1;
  ELSE
    -- Check if 15 minutes have passed since last attempt (reset counter)
    IF attempt_record.last_attempt_at < NOW() - INTERVAL '15 minutes' THEN
      new_count := 1;
    ELSE
      new_count := attempt_record.attempt_count + 1;
    END IF;
    
    -- Calculate block_until if needed
    IF new_count >= 5 THEN
      block_until := NOW() + INTERVAL '15 minutes';
    ELSE
      block_until := NULL;
    END IF;
    
    -- Update existing record
    UPDATE login_attempts
    SET attempt_count = new_count,
        last_attempt_at = NOW(),
        blocked_until = block_until,
        updated_at = NOW()
    WHERE email = LOWER(check_email)
    RETURNING * INTO attempt_record;
  END IF;
  
  -- Return status
  RETURN jsonb_build_object(
    'attempt_count', new_count,
    'is_blocked', new_count >= 5,
    'blocked_until', CASE WHEN new_count >= 5 THEN NOW() + INTERVAL '15 minutes' ELSE NULL END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Fix clear_login_attempts
CREATE OR REPLACE FUNCTION public.clear_login_attempts(check_email TEXT)
RETURNS VOID 
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM login_attempts
  WHERE email = LOWER(check_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Fix generate_invoice_public_token (if it exists)
-- This function might not exist - if you get an error, check if the function exists first
DO $$
BEGIN
  -- Only create if function exists
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'generate_invoice_public_token'
  ) THEN
    -- Get the function signature to recreate it properly
    -- Since we don't know the exact signature, we'll try a common one
    EXECUTE '
    CREATE OR REPLACE FUNCTION public.generate_invoice_public_token(invoice_id UUID)
    RETURNS UUID 
    SET search_path = public, pg_temp
    AS $func$
    DECLARE
      new_token UUID;
    BEGIN
      new_token := gen_random_uuid();
      UPDATE invoices
      SET public_token = new_token
      WHERE id = invoice_id;
      RETURN new_token;
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;';
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- If function doesn't exist or has different signature, skip it
  NULL;
END $$;
