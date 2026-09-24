/*
# Add protected academic records and staff-only management actions

1. New academic tables
- `academic_subjects` stores reusable subjects for an academic year, year of study, and semester.
- `student_marksheets` stores one private transcript summary for a graduated student.
- `student_marks` stores each transcript subject row, including marks, credits, grade, and display position.

2. Academic workflow
- Faculty and admin users can create, edit, reorder, and delete subjects.
- Faculty and admin users can create and revise graduated-student marksheets and subject marks.
- Marksheets are linked to `profiles` and cannot be read by students, visitors, or anonymous users.

3. Protected actions
- `update_gallery_photo` allows only admin or faculty to edit gallery metadata.
- `delete_application` allows only admin or faculty to delete submitted applications.

4. Security
- RLS is enabled on every new academic table.
- Academic records are readable and writable only by authenticated admin/faculty users.
- Gallery and application mutations validate the caller's role inside SECURITY DEFINER functions.
- Anonymous execution is revoked for both functions.

5. Data safety
- No existing rows, columns, or tables are deleted or changed.
- Foreign keys cascade only for academic child rows when their parent academic record is intentionally removed.
*/

CREATE TABLE IF NOT EXISTS academic_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year text NOT NULL,
  year_of_study smallint NOT NULL CHECK (year_of_study BETWEEN 1 AND 3),
  semester smallint NOT NULL CHECK (semester IN (1, 2)),
  subject_name text NOT NULL,
  credit_hours numeric(5,2) NOT NULL DEFAULT 3 CHECK (credit_hours > 0 AND credit_hours <= 20),
  display_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS academic_subjects_order_idx ON academic_subjects (academic_year, year_of_study, semester, display_order);

CREATE TABLE IF NOT EXISTS student_marksheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course text,
  study_year_label text,
  class_result text,
  final_grade text,
  gpa numeric(4,2) CHECK (gpa IS NULL OR (gpa >= 0 AND gpa <= 4)),
  remarks text,
  issued_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id)
);

CREATE TABLE IF NOT EXISTS student_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marksheet_id uuid NOT NULL REFERENCES student_marksheets(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  year_of_study smallint NOT NULL CHECK (year_of_study BETWEEN 1 AND 3),
  semester smallint NOT NULL CHECK (semester IN (1, 2)),
  subject_name text NOT NULL,
  credit_hours numeric(5,2) NOT NULL DEFAULT 3 CHECK (credit_hours > 0 AND credit_hours <= 20),
  marks numeric(5,2) NOT NULL CHECK (marks >= 0 AND marks <= 100),
  grade text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS student_marks_marksheet_order_idx ON student_marks (marksheet_id, year_of_study, semester, display_order);

ALTER TABLE academic_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_marksheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_marks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_select_academic_subjects" ON academic_subjects;
CREATE POLICY "staff_select_academic_subjects" ON academic_subjects FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty')));
DROP POLICY IF EXISTS "staff_insert_academic_subjects" ON academic_subjects;
CREATE POLICY "staff_insert_academic_subjects" ON academic_subjects FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty')) AND created_by = auth.uid());
DROP POLICY IF EXISTS "staff_update_academic_subjects" ON academic_subjects;
CREATE POLICY "staff_update_academic_subjects" ON academic_subjects FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty')));
DROP POLICY IF EXISTS "staff_delete_academic_subjects" ON academic_subjects;
CREATE POLICY "staff_delete_academic_subjects" ON academic_subjects FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty')));

DROP POLICY IF EXISTS "staff_select_student_marksheets" ON student_marksheets;
CREATE POLICY "staff_select_student_marksheets" ON student_marksheets FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty')));
DROP POLICY IF EXISTS "staff_insert_student_marksheets" ON student_marksheets;
CREATE POLICY "staff_insert_student_marksheets" ON student_marksheets FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty')) AND issued_by = auth.uid());
DROP POLICY IF EXISTS "staff_update_student_marksheets" ON student_marksheets;
CREATE POLICY "staff_update_student_marksheets" ON student_marksheets FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty')));
DROP POLICY IF EXISTS "staff_delete_student_marksheets" ON student_marksheets;
CREATE POLICY "staff_delete_student_marksheets" ON student_marksheets FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty')));

DROP POLICY IF EXISTS "staff_select_student_marks" ON student_marks;
CREATE POLICY "staff_select_student_marks" ON student_marks FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty')));
DROP POLICY IF EXISTS "staff_insert_student_marks" ON student_marks;
CREATE POLICY "staff_insert_student_marks" ON student_marks FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty')));
DROP POLICY IF EXISTS "staff_update_student_marks" ON student_marks;
CREATE POLICY "staff_update_student_marks" ON student_marks FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty')));
DROP POLICY IF EXISTS "staff_delete_student_marks" ON student_marks;
CREATE POLICY "staff_delete_student_marks" ON student_marks FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty')));

CREATE OR REPLACE FUNCTION update_gallery_photo(
  p_photo_id uuid,
  p_title text,
  p_description text,
  p_album text,
  p_link_url text,
  p_is_published boolean
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE photos SET title = NULLIF(trim(p_title), ''), description = NULLIF(trim(p_description), ''), album = NULLIF(trim(p_album), ''), link_url = NULLIF(trim(p_link_url), ''), is_published = p_is_published WHERE id = p_photo_id;
END;
$$;
REVOKE ALL ON FUNCTION update_gallery_photo(uuid, text, text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_gallery_photo(uuid, text, text, text, text, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION delete_application(p_application_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  DELETE FROM applications WHERE id = p_application_id;
END;
$$;
REVOKE ALL ON FUNCTION delete_application(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_application(uuid) TO authenticated;
