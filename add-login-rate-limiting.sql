-- ============================================
-- LOGIN RATE LIMITING TABLE
-- ============================================

-- Create table to track failed login attempts
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  blocked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast lookups by email
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_blocked_until ON login_attempts(blocked_until);

-- Enable RLS
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous users to insert/update their own attempts (by email)
-- This is needed because login happens before authentication
CREATE POLICY "Allow login attempt tracking"
  ON login_attempts FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Function to check if email is blocked
CREATE OR REPLACE FUNCTION public.is_email_blocked(check_email TEXT)
RETURNS BOOLEAN AS $$
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

-- Function to get blocked until time
CREATE OR REPLACE FUNCTION public.get_blocked_until(check_email TEXT)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
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

-- Function to record a failed login attempt
CREATE OR REPLACE FUNCTION public.record_failed_login(check_email TEXT)
RETURNS JSONB AS $$
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

-- Function to clear login attempts on successful login
CREATE OR REPLACE FUNCTION public.clear_login_attempts(check_email TEXT)
RETURNS VOID AS $$
BEGIN
  DELETE FROM login_attempts
  WHERE email = LOWER(check_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

