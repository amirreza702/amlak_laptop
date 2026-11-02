-- Remove obsolete in-app viewing and messaging workflow.
ALTER TABLE IF EXISTS "messages" DROP CONSTRAINT IF EXISTS "messages_conversationId_fkey";
ALTER TABLE IF EXISTS "messages" DROP CONSTRAINT IF EXISTS "messages_senderId_fkey";
ALTER TABLE IF EXISTS "conversations" DROP CONSTRAINT IF EXISTS "conversations_viewingRequestId_fkey";
ALTER TABLE IF EXISTS "viewing_requests" DROP CONSTRAINT IF EXISTS "viewing_requests_propertyId_fkey";
ALTER TABLE IF EXISTS "viewing_requests" DROP CONSTRAINT IF EXISTS "viewing_requests_customerId_fkey";
DROP TABLE IF EXISTS "messages";
DROP TABLE IF EXISTS "conversations";
DROP TABLE IF EXISTS "viewing_requests";
DROP TYPE IF EXISTS "ConversationStatus";
DROP TYPE IF EXISTS "ViewingRequestStatus";

-- Hashti staff accounts are represented by User(role = HASHTI), not a parallel table.
DROP TABLE IF EXISTS "hashti_staff";

-- Agent verification has one source of truth: verificationStatus.
ALTER TABLE "agents" DROP COLUMN IF EXISTS "isVerified";

-- Ratings use a five-point decimal scale and one property rating per evaluator.
ALTER TABLE "evaluations" ALTER COLUMN "score" TYPE DOUBLE PRECISION USING "score"::DOUBLE PRECISION;
ALTER TYPE "EvaluationType" ADD VALUE IF NOT EXISTS 'OWNER_TO_PROPERTY';

-- Keep the newest rating if historical duplicate property ratings already exist.
DELETE FROM "evaluations" older
USING "evaluations" newer
WHERE older."propertyId" IS NOT NULL
  AND older."evaluatorUserId" = newer."evaluatorUserId"
  AND older."propertyId" = newer."propertyId"
  AND (older."createdAt" < newer."createdAt"
       OR (older."createdAt" = newer."createdAt" AND older."id" < newer."id"));

CREATE UNIQUE INDEX IF NOT EXISTS "evaluations_evaluatorUserId_propertyId_key"
ON "evaluations"("evaluatorUserId", "propertyId");


-- Normalize existing published listings to the single 31-day publication window.
-- This also backfills legacy rows whose confirmUntil was never populated.
UPDATE "properties" AS property
SET "confirmUntil" = COALESCE(listing."publishedAt", listing."createdAt") + INTERVAL '31 days'
FROM "property_listings" AS listing
WHERE listing."propertyId" = property."id"
  AND listing."status" = 'PUBLISHED';
