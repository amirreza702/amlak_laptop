-- Track the original creator of owner and customer profiles.
-- Historical creator identity is unknown, so legacy rows intentionally remain NULL.
ALTER TABLE "owners"
  ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "createdByRole" "UserRole";

ALTER TABLE "customers"
  ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "createdByRole" "UserRole";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'owners_createdByUserId_fkey') THEN
    ALTER TABLE "owners"
      ADD CONSTRAINT "owners_createdByUserId_fkey"
      FOREIGN KEY ("createdByUserId") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_createdByUserId_fkey') THEN
    ALTER TABLE "customers"
      ADD CONSTRAINT "customers_createdByUserId_fkey"
      FOREIGN KEY ("createdByUserId") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "owners_createdByUserId_idx" ON "owners"("createdByUserId");
CREATE INDEX IF NOT EXISTS "owners_createdByRole_idx" ON "owners"("createdByRole");
CREATE INDEX IF NOT EXISTS "customers_createdByUserId_idx" ON "customers"("createdByUserId");
CREATE INDEX IF NOT EXISTS "customers_createdByRole_idx" ON "customers"("createdByRole");
