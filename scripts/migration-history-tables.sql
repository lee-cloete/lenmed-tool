-- Migration: Add history tracking tables and relationship tracking columns
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/yjphsjjqrgzntfirwogh/sql

-- 0. Add tracking columns to doctor_hospitals table
ALTER TABLE doctor_hospitals
ADD COLUMN IF NOT EXISTS status TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS created_by TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS updated_by TEXT;

-- 1. Doctor Change History Table
CREATE TABLE IF NOT EXISTS doctor_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'restored'
  changes JSONB, -- Store what fields changed: {"field": {"old": "x", "new": "y"}}
  changed_by TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups by doctor
CREATE INDEX IF NOT EXISTS idx_doctor_history_doctor_id ON doctor_history(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_history_changed_at ON doctor_history(changed_at DESC);

-- 2. Hospital Relationship History Table
CREATE TABLE IF NOT EXISTS relationship_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'linked', 'unlinked', 'transferred'
  old_hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
  new_hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
  old_hospital_name TEXT, -- Store name in case hospital is deleted
  new_hospital_name TEXT,
  changed_by TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_relationship_history_doctor_id ON relationship_history(doctor_id);
CREATE INDEX IF NOT EXISTS idx_relationship_history_changed_at ON relationship_history(changed_at DESC);

-- 3. User profiles table (for easy user management)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT NOT NULL,
  display_name TEXT,
  role TEXT DEFAULT 'user', -- 'admin', 'user', 'viewer'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

-- Enable RLS on all new tables
ALTER TABLE doctor_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow authenticated users to read/write
CREATE POLICY "Allow authenticated read doctor_history" ON doctor_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert doctor_history" ON doctor_history
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated read relationship_history" ON relationship_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert relationship_history" ON relationship_history
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated read user_profiles" ON user_profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert user_profiles" ON user_profiles
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update user_profiles" ON user_profiles
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated delete user_profiles" ON user_profiles
  FOR DELETE TO authenticated USING (true);

-- Verify tables were created
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('doctor_history', 'relationship_history', 'user_profiles');
