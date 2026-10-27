-- Additive migration only.
-- IMPORTANT: The existing database migration baseline is intentionally not included here.
-- Do not apply this migration to the existing database until a safe baseline has been prepared and verified.

-- Add a precise review state while retaining the legacy isVerified column.
ALTER TABLE "agents"
  ADD COLUMN "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "verificationReviewedAt" TIMESTAMP(3),
  ADD COLUMN "verificationReviewedBy" TEXT,
  ADD COLUMN "verificationNotes" TEXT;

-- Preserve the existing meaning of rows that were already verified.
UPDATE "agents"
SET "verificationStatus" = 'VERIFIED'
WHERE "isVerified" = TRUE;

CREATE INDEX "agents_verificationStatus_idx"
  ON "agents"("verificationStatus");

ALTER TABLE "agents"
  ADD CONSTRAINT "agents_verificationReviewedBy_fkey"
  FOREIGN KEY ("verificationReviewedBy")
  REFERENCES "users"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- New independent management audit table; no existing table or row is removed.
CREATE TABLE "admin_audit_logs" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT,
  "actorMobile" TEXT,
  "actorRole" "UserRole",
  "action" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT,
  "details" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_audit_logs_createdAt_idx"
  ON "admin_audit_logs"("createdAt");

CREATE INDEX "admin_audit_logs_actorUserId_createdAt_idx"
  ON "admin_audit_logs"("actorUserId", "createdAt");

CREATE INDEX "admin_audit_logs_targetType_targetId_createdAt_idx"
  ON "admin_audit_logs"("targetType", "targetId", "createdAt");

CREATE INDEX "admin_audit_logs_action_createdAt_idx"
  ON "admin_audit_logs"("action", "createdAt");

ALTER TABLE "admin_audit_logs"
  ADD CONSTRAINT "admin_audit_logs_actorUserId_fkey"
  FOREIGN KEY ("actorUserId")
  REFERENCES "users"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
