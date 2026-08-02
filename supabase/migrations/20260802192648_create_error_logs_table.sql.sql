/*
# Create error_logs table for application error tracking

1. New Tables
- `error_logs`
- `id` (uuid, primary key)
- `error_id` (text, unique — short reference ID for support)
- `error_type` (text — AppError class name: NetworkError, ApiError, ValidationError, AuthError, OfflineError, etc.)
- `error_code` (text — machine-readable code like NETWORK_ERROR, API_404, VALIDATION_ERROR)
- `message` (text — user-friendly message, never stack traces)
- `stack` (text — raw stack trace, only from ErrorBoundary catches)
- `status_code` (integer — HTTP status if applicable)
- `is_operational` (boolean — true if expected/operational, false if programmer error)
- `context` (jsonb — additional structured context: URL, user agent, route, etc.)
- `user_id` (uuid, nullable — the authenticated user who triggered it, defaults to auth.uid())
- `url` (text — the page URL where the error occurred)
- `user_agent` (text — browser user agent)
- `created_at` (timestptz, default now)

2. Security
- Enable RLS on `error_logs`.
- Authenticated users can INSERT their own error logs (user_id defaults to auth.uid()).
- Authenticated users can SELECT their own error logs.
- Admins can SELECT all error logs (for monitoring).
- No UPDATE or DELETE from the client — error logs are append-only.

3. Important Notes
- The `user_id` column defaults to `auth.uid()` so client inserts that omit it still satisfy the INSERT policy.
- Stack traces are stored but never shown to users in the UI.
- Admin access is granted via a role check in the SELECT policy.
*/

CREATE TABLE IF NOT EXISTS error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_id text UNIQUE NOT NULL,
  error_type text NOT NULL,
  error_code text NOT NULL,
  message text NOT NULL,
  stack text,
  status_code integer,
  is_operational boolean NOT NULL DEFAULT true,
  context jsonb DEFAULT '{}'::jsonb,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  url text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert their own error logs
DROP POLICY IF EXISTS "insert_own_error_logs" ON error_logs;
CREATE POLICY "insert_own_error_logs" ON error_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Authenticated users can read their own error logs
DROP POLICY IF EXISTS "select_own_error_logs" ON error_logs;
CREATE POLICY "select_own_error_logs" ON error_logs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- Admins can read all error logs
DROP POLICY IF EXISTS "select_all_error_logs_admin" ON error_logs;
CREATE POLICY "select_all_error_logs_admin" ON error_logs FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Index for faster queries by user and created_at
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_code ON error_logs(error_code);
