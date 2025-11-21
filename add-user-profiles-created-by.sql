-- Add created_by field to user_profiles table
-- This field tracks who created each user account

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_by ON user_profiles(created_by);

-- Add comment to explain the field
COMMENT ON COLUMN user_profiles.created_by IS 'The user ID of the admin/super_admin who created this user account';


