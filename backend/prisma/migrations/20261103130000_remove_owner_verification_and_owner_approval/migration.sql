-- Ownership is represented by the PropertyOwner relation only; Hashti does not verify ownership.
-- Listing publication remains an independent Hashti review workflow.
BEGIN;

ALTER TABLE public."property_owners"
  DROP COLUMN IF EXISTS "verificationStatus",
  DROP COLUMN IF EXISTS "verifiedAt";

-- Legacy owner-approval listings are now publication-review listings.
ALTER TABLE public."property_listings"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TYPE public."ListingStatus" RENAME TO "ListingStatus_legacy";

CREATE TYPE public."ListingStatus" AS ENUM (
  'DRAFT',
  'PENDING_HASHTI_VERIFICATION',
  'PUBLISHED',
  'REJECTED',
  'EXPIRED',
  'PAUSED',
  'SOLD',
  'RENTED'
);

ALTER TABLE public."property_listings"
  ALTER COLUMN "status" TYPE public."ListingStatus"
  USING (
    CASE
      WHEN "status"::text = 'PENDING_OWNER_APPROVAL' THEN 'PENDING_HASHTI_VERIFICATION'
      ELSE "status"::text
    END
  )::public."ListingStatus";

DROP TYPE public."ListingStatus_legacy";

ALTER TABLE public."property_listings"
  ALTER COLUMN "status" SET DEFAULT 'DRAFT'::public."ListingStatus";

-- Old verification-case tables were archived previously only to preserve test data.
DROP TABLE IF EXISTS public."legacy_verification_documents";
DROP TABLE IF EXISTS public."legacy_verification_cases";
DROP TABLE IF EXISTS public."verification_documents";
DROP TABLE IF EXISTS public."verification_cases";

COMMIT;
