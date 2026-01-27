-- Lenmed Doctor-Hospital Management System
-- Database Schema for Supabase
-- Based on flume_expanded.csv structure

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Doctors table (matches CSV structure)
CREATE TABLE IF NOT EXISTS doctors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT,                          -- Dr, Mrs, Ms, Prof, etc.
  full_name TEXT NOT NULL,             -- Dr Full Name from CSV
  disciplines TEXT,                    -- Doctors Disciplines (pipe-separated)
  phone1 TEXT,                         -- wpcf-doctor-telephone
  phone2 TEXT,                         -- wpcf-doctor-telephone-2
  phone3 TEXT,                         -- wpcf-doctor-telephone-3
  email TEXT,                          -- wpcf-contact-email
  bio_link BOOLEAN DEFAULT false,      -- wpcf-display-bio-link
  permalink TEXT,                      -- Permalink
  status TEXT DEFAULT 'publish',       -- Status
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Hospitals table
CREATE TABLE IF NOT EXISTS hospitals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,                  -- Hospital Name from CSV
  address TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Doctor-Hospital relationship (many-to-many)
-- A doctor can work at multiple hospitals
CREATE TABLE IF NOT EXISTS doctor_hospitals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(doctor_id, hospital_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_doctors_full_name ON doctors(full_name);
CREATE INDEX IF NOT EXISTS idx_doctors_disciplines ON doctors(disciplines);
CREATE INDEX IF NOT EXISTS idx_hospitals_name ON hospitals(name);
CREATE INDEX IF NOT EXISTS idx_doctor_hospitals_doctor ON doctor_hospitals(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_hospitals_hospital ON doctor_hospitals(hospital_id);

-- Enable Row Level Security (RLS)
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_hospitals ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
-- Doctors: authenticated users can do everything
CREATE POLICY "Authenticated users can view doctors"
  ON doctors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert doctors"
  ON doctors FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update doctors"
  ON doctors FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete doctors"
  ON doctors FOR DELETE
  TO authenticated
  USING (true);

-- Hospitals: authenticated users can do everything
CREATE POLICY "Authenticated users can view hospitals"
  ON hospitals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert hospitals"
  ON hospitals FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update hospitals"
  ON hospitals FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete hospitals"
  ON hospitals FOR DELETE
  TO authenticated
  USING (true);

-- Doctor-Hospital relationships: authenticated users can do everything
CREATE POLICY "Authenticated users can view doctor_hospitals"
  ON doctor_hospitals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert doctor_hospitals"
  ON doctor_hospitals FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete doctor_hospitals"
  ON doctor_hospitals FOR DELETE
  TO authenticated
  USING (true);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_doctors_updated_at
  BEFORE UPDATE ON doctors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hospitals_updated_at
  BEFORE UPDATE ON hospitals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
