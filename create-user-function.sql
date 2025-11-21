-- ============================================
-- FUNCTION: Create User in Auth and User Profiles
-- ============================================
-- This function creates a user in auth.users and user_profiles table
-- Must be called with SECURITY DEFINER to have admin privileges
-- ============================================

CREATE OR REPLACE FUNCTION public.create_user_account(
  p_email TEXT,
  p_password TEXT,
  p_username TEXT,
  p_role TEXT DEFAULT 'employee',
  p_status TEXT DEFAULT 'active'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Validate role
  IF p_role NOT IN ('employee', 'admin', 'super_admin') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  -- Validate status
  IF p_status NOT IN ('active', 'inactive', 'suspended') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;

  -- Create user in auth.users using Supabase auth admin functions
  -- Note: This requires the function to be called with proper permissions
  -- The actual auth user creation should be done via Supabase Admin API or Edge Function
  -- For now, we'll create the profile assuming the auth user exists
  -- You'll need to create the auth user first using Supabase Admin API
  
  -- This is a placeholder - you'll need to create the auth user via:
  -- 1. Supabase Admin API (requires service role key - server-side only)
  -- 2. Supabase Edge Function
  -- 3. Or use supabase.auth.admin.createUser() in a server-side function
  
  -- For now, return an error indicating auth user must be created first
  RAISE EXCEPTION 'Auth user must be created first via Supabase Admin API or Edge Function. User ID should be passed as parameter.';
  
  RETURN v_user_id;
END;
$$;

-- Alternative function that accepts an existing user_id
-- This assumes the auth user has already been created
CREATE OR REPLACE FUNCTION public.create_user_profile(
  p_user_id UUID,
  p_email TEXT,
  p_username TEXT,
  p_role TEXT DEFAULT 'employee',
  p_status TEXT DEFAULT 'active',
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate role
  IF p_role NOT IN ('employee', 'admin', 'super_admin') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  -- Validate status
  IF p_status NOT IN ('active', 'inactive', 'suspended') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;

  -- Insert into user_profiles
  INSERT INTO user_profiles (id, email, username, role, status, created_by)
  VALUES (p_user_id, p_email, p_username, p_role, p_status, p_created_by)
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    created_by = EXCLUDED.created_by,
    updated_at = NOW();

  RETURN p_user_id;
END;
$$;

-- Grant execute permission to authenticated users (admins only via RLS)
-- Note: Must match the full function signature including all parameters
GRANT EXECUTE ON FUNCTION public.create_user_profile(UUID, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;


