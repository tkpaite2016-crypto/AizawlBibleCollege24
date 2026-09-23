/*
# Allow staff to create student profiles

1. Overview
   Currently the `profiles` INSERT policy requires `auth.uid() = id`, so only the
   user themselves can create their own profile row. Finance and faculty staff
   need to add unenrolled students so they can record transactions for them.

2. New function
   - `create_student_profile(p_full_name text, p_email text, p_phone text, p_student_year text, p_course text)`
     SECURITY DEFINER function that inserts a new `profiles` row with role 'student'
     and a generated UUID id. Callable only by authenticated users whose own profile
     role is admin, faculty, or finance. Returns the new profile row.

3. Security
   - The function checks the caller's role via `is_faculty_or_admin()` before inserting.
   - The new row is inserted with role = 'student' (never elevated to staff).
   - The function bypasses RLS (SECURITY DEFINER) but only inserts the safe student
     columns — full_name, email, phone, student_year, course, role.
   - Email uniqueness is not enforced at the DB level (profiles.email has no unique
     constraint), so the function allows duplicate emails. The frontend will warn
     if a profile with the same email already exists.

4. Data safety
   - No existing data is modified or deleted.
   - No schema changes to existing tables.
*/

CREATE OR REPLACE FUNCTION create_student_profile(
  p_full_name text,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_student_year text DEFAULT NULL,
  p_course text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid := gen_random_uuid();
BEGIN
  IF NOT is_faculty_or_admin() THEN
    RAISE EXCEPTION 'Permission denied: only admin, faculty, or finance can create student profiles';
  END IF;

  INSERT INTO profiles (id, full_name, email, phone, student_year, course, role)
  VALUES (new_id, p_full_name, p_email, p_phone, p_student_year, p_course, 'student');

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_student_profile(text, text, text, text, text) TO authenticated;
