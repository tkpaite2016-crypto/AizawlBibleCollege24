/*
# Add student_name and course_override to student_marksheets

1. Modified Tables
- `student_marksheets`: add `student_name` (text, nullable) — overrides the student's profile name on the generated transcript without changing their profile.
- `student_marksheets`: add `course_override` (text, nullable) — overrides the student's course on the generated transcript without changing their profile.
2. Notes
- Both columns are optional. When null, the transcript falls back to the student's profile name and course.
- RLS unchanged: existing policies already govern access.
*/

ALTER TABLE student_marksheets
  ADD COLUMN IF NOT EXISTS student_name text,
  ADD COLUMN IF NOT EXISTS course_override text;
