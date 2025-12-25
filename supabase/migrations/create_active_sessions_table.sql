-- Create active_sessions table to track user sessions
-- This enables single-session-only authentication

CREATE TABLE IF NOT EXISTS public.active_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text NOT NULL UNIQUE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  ip_address text,
  user_agent text,
  last_activity timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id ON public.active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_session_id ON public.active_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_expires_at ON public.active_sessions(expires_at);

-- Enable RLS
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only allow service role to manage sessions
CREATE POLICY "Service role can manage all sessions"
  ON public.active_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own sessions (optional - for future session management UI)
CREATE POLICY "Users can view their own sessions"
  ON public.active_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to terminate all sessions for a user except the current one
CREATE OR REPLACE FUNCTION public.terminate_other_sessions(
  p_user_id uuid,
  p_current_session_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete all sessions for this user except the current one
  DELETE FROM public.active_sessions
  WHERE user_id = p_user_id
    AND session_id != p_current_session_id;
END;
$$;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete sessions that have expired
  DELETE FROM public.active_sessions
  WHERE expires_at < now();
END;
$$;

-- Function to check if a session is valid
CREATE OR REPLACE FUNCTION public.is_session_valid(
  p_user_id uuid,
  p_session_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists boolean;
BEGIN
  -- Check if session exists and hasn't expired
  SELECT EXISTS(
    SELECT 1
    FROM public.active_sessions
    WHERE user_id = p_user_id
      AND session_id = p_session_id
      AND expires_at > now()
  ) INTO v_exists;
  
  RETURN v_exists;
END;
$$;

-- Function to update session activity timestamp
CREATE OR REPLACE FUNCTION public.update_session_activity(
  p_session_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.active_sessions
  SET last_activity = now()
  WHERE session_id = p_session_id;
END;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.terminate_other_sessions TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_sessions TO service_role;
GRANT EXECUTE ON FUNCTION public.is_session_valid TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.update_session_activity TO service_role, authenticated;

-- Comment on table
COMMENT ON TABLE public.active_sessions IS 'Tracks active user sessions for single-session-only authentication';




