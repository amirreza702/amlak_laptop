ALTER TYPE "ListingStatus" ADD VALUE 'DELETED';
ALTER TYPE "PropertyHistoryAction" ADD VALUE 'DELETED';

ALTER TABLE "properties" ADD COLUMN "deletedAt" TIMESTAMP(3);
CREATE INDEX "properties_deletedAt_idx" ON "properties"("deletedAt");
