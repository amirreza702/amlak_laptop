-- Track who submitted each property-search request.
-- IF NOT EXISTS makes this safe for development databases where Prisma db push
-- may have already created the additive columns and relation.
ALTER TABLE "property_search_requests"
  ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "createdByRole" "UserRole",
  ADD COLUMN IF NOT EXISTS "requesterMobile" TEXT;

-- Backfill older customer-created requests without overwriting newer metadata.
UPDATE "property_search_requests" AS request
SET
  "createdByUserId" = customer."userId",
  "createdByRole" = 'CUSTOMER'::"UserRole",
  "requesterMobile" = app_user."mobile"
FROM "customers" AS customer
JOIN "users" AS app_user ON app_user."id" = customer."userId"
WHERE request."customerId" = customer."id"
  AND (request."createdByUserId" IS NULL
    OR request."createdByRole" IS NULL
    OR request."requesterMobile" IS NULL);

-- Agent-created requests do not have a customer profile linked.
ALTER TABLE "property_search_requests"
  ALTER COLUMN "customerId" DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'property_search_requests_createdByUserId_fkey'
  ) THEN
    ALTER TABLE "property_search_requests"
      ADD CONSTRAINT "property_search_requests_createdByUserId_fkey"
      FOREIGN KEY ("createdByUserId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "property_search_requests_createdByUserId_idx"
  ON "property_search_requests"("createdByUserId");
CREATE INDEX IF NOT EXISTS "property_search_requests_createdByRole_idx"
  ON "property_search_requests"("createdByRole");

ALTER TABLE "contact_access_logs"
  ALTER COLUMN "customerId" DROP NOT NULL;
ALTER TABLE "contact_access_logs"
  DROP CONSTRAINT IF EXISTS "contact_access_logs_customerId_fkey";
ALTER TABLE "contact_access_logs"
  ADD CONSTRAINT "contact_access_logs_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
