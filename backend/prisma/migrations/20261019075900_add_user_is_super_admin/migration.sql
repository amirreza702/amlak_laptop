-- Additive migration: give existing Hashti accounts a separate super-admin flag.
-- IF NOT EXISTS keeps this migration safe when a development db already received the column via db push.
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;
