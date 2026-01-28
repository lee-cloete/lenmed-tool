-- Migration: Add hospital assignment to user_profiles
-- This allows restricting users to only edit doctors at their assigned hospital

-- Add hospital_id column to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_hospital ON user_profiles(hospital_id);

-- Update RLS policy to allow users to see their own profile
-- (Keep existing policies, this is additive)

-- Grant select on hospitals to authenticated users for the dropdown
-- (Should already exist from base schema)

COMMENT ON COLUMN user_profiles.hospital_id IS 'When set, user can only edit doctors linked to this hospital. NULL means admin access to all hospitals.';
