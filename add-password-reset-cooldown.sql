-- Add last_password_reset_sent column to user_profiles table
-- This tracks when password reset emails were sent to prevent spam

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS last_password_reset_sent TIMESTAMP WITH TIME ZONE;

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.last_password_reset_sent IS 'Timestamp of when the last password reset email was sent to this user. Used for cooldown (10 minutes) to prevent spam.';

