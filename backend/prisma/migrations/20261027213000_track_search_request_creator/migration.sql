-- Record the authenticated user who created each search request.
-- Existing requests were submitted by the customer account linked to customerId.
ALTER TABLE "property_search_requests"
  ADD COLUMN "createdByUserId" TEXT,
  ADD COLUMN "createdByRole" "UserRole",
  ADD COLUMN "requesterMobile" TEXT;

UPDATE "property_search_requests" AS request
SET
  "createdByUserId" = customer."userId",
  "createdByRole" = 'CUSTOMER'::"UserRole",
  "requesterMobile" = app_user."mobile"
FROM "customers" AS customer
JOIN "users" AS app_user ON app_user."id" = customer."userId"
WHERE request."customerId" = customer."id";

ALTER TABLE "property_search_requests"
  ALTER COLUMN "createdByUserId" SET NOT NULL,
  ALTER COLUMN "createdByRole" SET NOT NULL,
  ALTER COLUMN "requesterMobile" SET NOT NULL,
  ALTER COLUMN "customerId" DROP NOT NULL;

ALTER TABLE "property_search_requests"
  ADD CONSTRAINT "property_search_requests_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "property_search_requests_createdByUserId_idx"
  ON "property_search_requests"("createdByUserId");

CREATE INDEX "property_search_requests_createdByRole_idx"
  ON "property_search_requests"("createdByRole");

ALTER TABLE "contact_access_logs"
  ALTER COLUMN "customerId" DROP NOT NULL;

ALTER TABLE "contact_access_logs"
  DROP CONSTRAINT IF EXISTS "contact_access_logs_customerId_fkey";

ALTER TABLE "contact_access_logs"
  ADD CONSTRAINT "contact_access_logs_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
