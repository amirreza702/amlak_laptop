-- Track the authenticated account that initially registered each property.
-- Existing creator identity/mobile are intentionally left NULL because historical
-- records cannot reliably prove which linked owner/agent submitted the property.
ALTER TABLE "properties"
  ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "createdByRole" "UserRole",
  ADD COLUMN IF NOT EXISTS "creatorMobile" TEXT;

-- The existing registration source reliably identifies the historical role,
-- but does not identify a specific user.
UPDATE "properties"
SET "createdByRole" = "registrationSource"::text::"UserRole"
WHERE "createdByRole" IS NULL
  AND "registrationSource"::text IN ('OWNER', 'AGENT', 'HASHTI');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'properties_createdByUserId_fkey'
  ) THEN
    ALTER TABLE "properties"
      ADD CONSTRAINT "properties_createdByUserId_fkey"
      FOREIGN KEY ("createdByUserId") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "properties_createdByUserId_idx"
  ON "properties"("createdByUserId");
CREATE INDEX IF NOT EXISTS "properties_createdByRole_idx"
  ON "properties"("createdByRole");
