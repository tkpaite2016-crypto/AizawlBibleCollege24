-- Grant INSERT privilege to anon role so non-logged-in users can send chat messages
-- The RLS policy "chat_insert_all" already allows anon inserts (WITH CHECK true),
-- but the table-level grant was missing INSERT for anon.
GRANT INSERT ON chat_messages TO anon;
