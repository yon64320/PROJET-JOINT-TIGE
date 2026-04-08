-- 011_session_selected_fields.sql
-- Allow users to select which fields to survey per session.
-- NULL = all fields (retrocompatible with existing sessions).
ALTER TABLE field_sessions
  ADD COLUMN IF NOT EXISTS selected_fields TEXT[] DEFAULT NULL;
