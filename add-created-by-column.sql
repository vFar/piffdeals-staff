-- ============================================
-- Migration: Add created_by column to user_profiles
-- ============================================
-- This migration adds the created_by column to track which user created each account.
-- This is needed for the Dashboard to show who created each user account.

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.created_by IS 'UUID of the user who created this account. NULL if created by system or unknown.';


