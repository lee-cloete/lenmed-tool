-- Migration: Update status column for change tracking
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/yjphsjjqrgzntfirwogh/sql

-- Step 1: Reset all existing status values to NULL (removes 'publish' values)
UPDATE doctors SET status = NULL WHERE status IS NOT NULL;

-- Step 2: Find and show duplicate doctors (run this first to see them)
SELECT full_name, COUNT(*) as count
FROM doctors
GROUP BY full_name
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Step 3: Remove duplicate doctors (keeps the oldest entry based on created_at)
-- This deletes all but the first occurrence of each duplicate name
DELETE FROM doctors
WHERE id NOT IN (
  SELECT DISTINCT ON (LOWER(TRIM(full_name))) id
  FROM doctors
  ORDER BY LOWER(TRIM(full_name)), created_at ASC
);

-- Step 4: Verify - show remaining doctors count
SELECT COUNT(*) as total_doctors FROM doctors;

-- Step 5: Show status distribution
SELECT status, COUNT(*) as count FROM doctors GROUP BY status;
