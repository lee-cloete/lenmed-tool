-- Migration: Add tracking fields for created/updated info
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/yjphsjjqrgzntfirwogh/sql

-- Add tracking columns to doctors table
ALTER TABLE doctors
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS created_by TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS updated_by TEXT;

-- Set created_at for existing records if null
UPDATE doctors SET created_at = NOW() WHERE created_at IS NULL;

-- Verify columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'doctors'
AND column_name IN ('created_at', 'created_by', 'updated_at', 'updated_by');
