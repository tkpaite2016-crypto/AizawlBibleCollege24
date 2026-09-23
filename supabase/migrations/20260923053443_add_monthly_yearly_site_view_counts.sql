/*
# Restore monthly and yearly visitor counters

1. Overview
   Extends the existing single-row `site_stats` counter so the footer can show total,
   current-month, and current-year visitors. Existing total view data is preserved.

2. New columns on `site_stats`
- `monthly_views` (bigint, not null, default 0) — visitors counted in the active month.
- `yearly_views` (bigint, not null, default 0) — visitors counted in the active year.
- `month_key` (text, not null) — active month in YYYY-MM format.
- `year_key` (text, not null) — active year in YYYY format.

3. Modified database behavior
- `increment_site_view()` now increments total, monthly, and yearly counters atomically.
- When the month changes, the monthly counter starts at 1 for the new month.
- When the year changes, the yearly counter starts at 1 for the new year.
- The existing total counter continues increasing without resetting.

4. Security and realtime
- Existing RLS protections and public read policy on `site_stats` are preserved.
- The table is added to the Supabase realtime publication so footer counters update live.
- The RPC remains callable by anonymous and authenticated visitors and only changes the
  single site statistics row.

5. Data safety
- No existing columns or rows are deleted.
- Existing total views remain intact; the new period counters begin from zero and then
  include the current page view when the counter is next incremented.
*/

ALTER TABLE site_stats
  ADD COLUMN IF NOT EXISTS monthly_views bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS yearly_views bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS month_key text NOT NULL DEFAULT to_char(now(), 'YYYY-MM'),
  ADD COLUMN IF NOT EXISTS year_key text NOT NULL DEFAULT to_char(now(), 'YYYY');

CREATE OR REPLACE FUNCTION increment_site_view()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count bigint;
  current_month text := to_char(now(), 'YYYY-MM');
  current_year text := to_char(now(), 'YYYY');
BEGIN
  INSERT INTO site_stats (id, total_views, monthly_views, yearly_views, month_key, year_key)
  VALUES (1, 1, 1, 1, current_month, current_year)
  ON CONFLICT (id)
  DO UPDATE SET
    total_views = site_stats.total_views + 1,
    monthly_views = CASE
      WHEN site_stats.month_key = current_month THEN site_stats.monthly_views + 1
      ELSE 1
    END,
    yearly_views = CASE
      WHEN site_stats.year_key = current_year THEN site_stats.yearly_views + 1
      ELSE 1
    END,
    month_key = current_month,
    year_key = current_year,
    updated_at = now()
  RETURNING total_views INTO new_count;

  RETURN new_count;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_site_view() TO anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'site_stats'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE site_stats;
  END IF;
END $$;
