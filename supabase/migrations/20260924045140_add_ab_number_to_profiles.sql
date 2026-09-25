/*
# Add AB Number column to profiles

1. Changes
- Adds `ab_number` (text, nullable) to the `profiles` table.
- This stores the student's AB ID number (e.g., "AB256") which connects
  the student's data across the website/app.
- No security changes needed — the column is covered by existing profiles RLS policies.
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ab_number text;
