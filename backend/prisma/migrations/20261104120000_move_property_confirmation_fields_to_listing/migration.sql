DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "properties" p
    LEFT JOIN "property_listings" pl ON pl."propertyId" = p."id"
    WHERE (p."lastConfirmedAt" IS NOT NULL OR p."confirmUntil" IS NOT NULL)
      AND pl."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot move property confirmation timestamps: a property with confirmation data has no PropertyListing row.';
  END IF;
END $$;

ALTER TABLE "property_listings"
  ADD COLUMN "lastConfirmedAt" TIMESTAMP(3),
  ADD COLUMN "confirmUntil" TIMESTAMP(3);

UPDATE "property_listings" pl
SET
  "lastConfirmedAt" = p."lastConfirmedAt",
  "confirmUntil" = p."confirmUntil"
FROM "properties" p
WHERE p."id" = pl."propertyId";

DROP INDEX IF EXISTS "properties_confirmUntil_idx";

ALTER TABLE "properties"
  DROP COLUMN "lastConfirmedAt",
  DROP COLUMN "confirmUntil";

CREATE INDEX "property_listings_confirmUntil_idx" ON "property_listings"("confirmUntil");
CREATE INDEX "property_listings_status_expiredAt_idx" ON "property_listings"("status", "expiredAt");
