
-- Allow admins to select all notices (published and unpublished)
-- Without this, admins can't update or toggle unpublished notices
-- because the existing SELECT policy only allows is_published = true
CREATE POLICY "notices_select_admin"
  ON notices
  FOR SELECT
  TO authenticated
  USING (is_admin());
