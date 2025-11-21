-- ============================================
-- ACTIVITY LOGS TABLE
-- Tracks major actions performed by admins, super_admins, and employees
-- Only accessible by super_admins
-- ============================================

-- Drop table if exists (for safe re-runs)
DROP TABLE IF EXISTS activity_logs CASCADE;

-- Create activity_logs table
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who performed the action
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT, -- Store email for historical reference
  user_username TEXT, -- Store username for historical reference
  user_role TEXT, -- Store role at time of action
  
  -- What action was performed
  action_type TEXT NOT NULL, -- e.g., 'user_created', 'user_updated', 'user_deleted', 'role_changed', 'status_changed', 'invoice_created', 'invoice_updated', 'invoice_deleted', 'invoice_sent', 'bulk_action'
  action_category TEXT NOT NULL, -- 'user_management', 'invoice_management', 'system', 'security'
  
  -- Action details
  description TEXT NOT NULL, -- Human-readable description
  details JSONB, -- Additional structured data (e.g., old_value, new_value, affected_ids)
  
  -- What was affected (optional)
  target_type TEXT, -- 'user', 'invoice', 'system', etc.
  target_id UUID, -- ID of the affected entity
  
  -- IP address and user agent for security tracking
  ip_address TEXT,
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX idx_activity_logs_action_category ON activity_logs(action_category);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_target_type ON activity_logs(target_type);
CREATE INDEX idx_activity_logs_target_id ON activity_logs(target_id);

-- Enable Row Level Security
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only super_admins can view activity logs
CREATE POLICY "Super admins can view activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Policy: Only super_admins can insert activity logs
-- (This allows the system to log actions, but only super_admins can create logs)
CREATE POLICY "Super admins can insert activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Note: We don't allow updates or deletes on activity logs
-- Activity logs are immutable for audit purposes

-- ============================================
-- HELPER FUNCTION: Log activity
-- This function can be called from Edge Functions or with service role
-- ============================================
CREATE OR REPLACE FUNCTION public.log_activity(
  p_user_id UUID,
  p_action_type TEXT,
  p_action_category TEXT,
  p_description TEXT,
  p_details TEXT DEFAULT NULL, -- Accept as TEXT, convert to JSONB
  p_target_type TEXT DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_email TEXT;
  v_user_username TEXT;
  v_user_role TEXT;
  v_log_id UUID;
  v_details_jsonb JSONB;
BEGIN
  -- Get user information for historical reference
  SELECT email, username, role
  INTO v_user_email, v_user_username, v_user_role
  FROM user_profiles
  WHERE id = p_user_id;
  
  -- Convert details from TEXT to JSONB if provided
  IF p_details IS NOT NULL THEN
    BEGIN
      v_details_jsonb := p_details::JSONB;
    EXCEPTION WHEN OTHERS THEN
      -- If JSON parsing fails, store as null
      v_details_jsonb := NULL;
    END;
  ELSE
    v_details_jsonb := NULL;
  END IF;
  
  -- Insert activity log
  INSERT INTO activity_logs (
    user_id,
    user_email,
    user_username,
    user_role,
    action_type,
    action_category,
    description,
    details,
    target_type,
    target_id,
    ip_address,
    user_agent
  )
  VALUES (
    p_user_id,
    v_user_email,
    v_user_username,
    v_user_role,
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
$$;

-- Grant execute permission to authenticated users
-- (RLS will ensure only super_admins can actually use this)
GRANT EXECUTE ON FUNCTION public.log_activity(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT) TO authenticated;
