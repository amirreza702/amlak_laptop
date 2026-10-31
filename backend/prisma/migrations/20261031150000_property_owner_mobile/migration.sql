-- Store the actual owner's phone separately from the property registrant's phone.
ALTER TABLE "properties" ADD COLUMN "ownerMobile" TEXT;

-- Preserve the owner contact for legacy owner-created properties.
UPDATE "properties"
SET "ownerMobile" = "creatorMobile"
WHERE "createdByRole" = 'OWNER'
  AND "creatorMobile" IS NOT NULL;

-- Backfill properties already linked to a verified or pending owner profile.
UPDATE "properties" AS p
SET "ownerMobile" = u."mobile"
FROM "property_owners" AS po
JOIN "owners" AS o ON o."id" = po."ownerId"
JOIN "users" AS u ON u."id" = o."userId"
WHERE p."id" = po."propertyId"
  AND p."ownerMobile" IS NULL;
