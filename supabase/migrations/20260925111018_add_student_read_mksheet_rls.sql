/*
# Allow students to read their own marksheets

1. Security changes
- Add SELECT policy on `student_marksheets` so a student can read their own marksheet (for profile status display).
- Add SELECT policy on `student_marks` so a student can read marks belonging to their own marksheet.
- Existing staff (admin/faculty) policies remain unchanged.

2. Notes
- Students can only READ their own marksheets and marks — no insert/update/delete.
- Staff policies are unchanged and still allow full CRUD for admin/faculty.
*/

DROP POLICY IF EXISTS "student_select_own_marksheet" ON student_marksheets;
CREATE POLICY "student_select_own_marksheet" ON student_marksheets FOR SELECT
  TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "student_select_own_marks" ON student_marks;
CREATE POLICY "student_select_own_marks" ON student_marks FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM student_marksheets sm
      WHERE sm.id = student_marks.marksheet_id AND sm.student_id = auth.uid()
    )
  );
