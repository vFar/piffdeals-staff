-- ============================================
-- CREATE log_activity FUNCTION
-- This function is required for activity logging to work
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- First, ensure helper functions exist (if they don't already)
-- Function to get user role without RLS recursion
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

-- Function to check if user is super_admin (needed for RLS policies)
CREATE OR REPLACE FUNCTION public.is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_user_role(user_id) = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Main function: log_activity
-- This function allows any authenticated user to log activities
-- It uses SECURITY DEFINER to bypass RLS when inserting logs
-- ============================================
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
  -- Get user profile information
  SELECT username, email, role INTO v_user_profile
  FROM user_profiles
  WHERE id = p_user_id;
  
  -- Convert details JSON string to JSONB if provided
  IF p_details IS NOT NULL THEN
    BEGIN
      v_details_jsonb := p_details::JSONB;
    EXCEPTION WHEN OTHERS THEN
      v_details_jsonb := NULL;
    END;
  END IF;
  
  -- Insert activity log
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.log_activity TO authenticated;

-- ============================================
-- Ensure RLS policy exists for inserts
-- This policy allows authenticated users to insert logs via the function
-- ============================================
-- Drop existing policy if it exists (safe - doesn't delete data)
DROP POLICY IF EXISTS "Allow activity log inserts via function" ON activity_logs;

-- Create policy to allow inserts via the log_activity function
CREATE POLICY "Allow activity log inserts via function"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- Verify the function was created
-- ============================================
-- You can run this query to verify:
-- SELECT proname, proargnames, prorettype::regtype 
-- FROM pg_proc 
-- WHERE proname = 'log_activity';

