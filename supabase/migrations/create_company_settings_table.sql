-- Create company_settings table
-- This table stores company-wide settings like VAT toggle
-- Only accessible by super_admin users

CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on setting_key for fast lookups
CREATE INDEX IF NOT EXISTS idx_company_settings_key ON company_settings(setting_key);

-- Enable RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Only super_admins can read company settings
CREATE POLICY "Super admins can view company settings"
  ON company_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Policy: Only super_admins can update company settings
CREATE POLICY "Super admins can update company settings"
  ON company_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Policy: Only super_admins can insert company settings
CREATE POLICY "Super admins can insert company settings"
  ON company_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Insert default VAT setting (disabled by default)
INSERT INTO company_settings (setting_key, setting_value)
VALUES ('vat_enabled', '{"enabled": false, "rate": 0.21}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- Function to get VAT setting (can be called by all authenticated users for reading)
CREATE OR REPLACE FUNCTION get_vat_setting()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  vat_setting JSONB;
BEGIN
  SELECT setting_value INTO vat_setting
  FROM company_settings
  WHERE setting_key = 'vat_enabled';
  
  -- Return default if not found
  IF vat_setting IS NULL THEN
    RETURN '{"enabled": false, "rate": 0.21}'::jsonb;
  END IF;
  
  RETURN vat_setting;
END;
$$;

-- Function to update VAT setting (only super_admins can call this)
CREATE OR REPLACE FUNCTION update_vat_setting(
  p_enabled BOOLEAN,
  p_rate NUMERIC DEFAULT 0.21
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_role TEXT;
  new_setting JSONB;
BEGIN
  -- Check if user is super_admin
  SELECT role INTO current_user_role
  FROM user_profiles
  WHERE id = auth.uid();
  
  IF current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super administrators can update VAT settings';
  END IF;
  
  -- Create new setting value
  new_setting := jsonb_build_object('enabled', p_enabled, 'rate', p_rate);
  
  -- Update or insert setting
  INSERT INTO company_settings (setting_key, setting_value, updated_by)
  VALUES ('vat_enabled', new_setting, auth.uid())
  ON CONFLICT (setting_key)
  DO UPDATE SET
    setting_value = new_setting,
    updated_by = auth.uid(),
    updated_at = NOW();
  
  RETURN new_setting;
END;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_vat_setting() TO authenticated;
GRANT EXECUTE ON FUNCTION update_vat_setting(BOOLEAN, NUMERIC) TO authenticated;

-- Add comment
COMMENT ON TABLE company_settings IS 'Stores company-wide settings accessible only by super_admin';
COMMENT ON FUNCTION get_vat_setting() IS 'Returns current VAT setting (enabled/disabled and rate)';
COMMENT ON FUNCTION update_vat_setting(BOOLEAN, NUMERIC) IS 'Updates VAT setting (super_admin only)';






