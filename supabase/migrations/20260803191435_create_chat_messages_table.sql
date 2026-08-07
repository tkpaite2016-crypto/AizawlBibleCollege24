/*
# Create chat_messages table for global chat

1. New Tables
- `chat_messages`
  - `id` (uuid, primary key)
  - `content` (text, not null) — the message text
  - `user_id` (uuid, nullable) — references auth.users, null for anonymous/guest users
  - `display_name` (text, not null) — name shown with the message (profile name for logged-in users, guest name for others)
  - `role` (text, nullable) — the user's role if logged in (admin, faculty, student, etc.)
  - `avatar_url` (text, nullable) — avatar URL if the user has one
  - `is_deleted` (boolean, default false) — soft-delete flag for admin moderation
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `chat_messages`.
- Allow anon + authenticated to SELECT (public chat — everyone sees all messages).
- Allow anon + authenticated to INSERT (everyone can send messages, including non-logged-in users).
- Allow authenticated admins to DELETE (moderation).
- No UPDATE policies — messages are immutable once sent (soft-delete via admin only).

3. Realtime
- Add table to the supabase_realtime publication so the frontend can subscribe to new messages.
*/

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name text NOT NULL,
  role text,
  avatar_url text,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- SELECT: everyone (anon + authenticated) can read all non-deleted messages
DROP POLICY IF EXISTS "chat_select_all" ON chat_messages;
CREATE POLICY "chat_select_all"
  ON chat_messages FOR SELECT
  TO anon, authenticated
  USING (is_deleted = false);

-- INSERT: everyone (anon + authenticated) can send messages
DROP POLICY IF EXISTS "chat_insert_all" ON chat_messages;
CREATE POLICY "chat_insert_all"
  ON chat_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- DELETE: only admins can delete (moderation)
DROP POLICY IF EXISTS "chat_delete_admin" ON chat_messages;
CREATE POLICY "chat_delete_admin"
  ON chat_messages FOR DELETE
  TO authenticated
  USING (is_admin());

-- Add to realtime publication
ALTER TABLE chat_messages REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  END IF;
END $$;

-- Index for querying messages ordered by time
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages (created_at DESC);
