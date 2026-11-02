-- Retire the legacy property verification-case/document workflow.
-- Preserve historical records instead of deleting user-submitted documents.
-- VerificationStatus remains active because it is still used by PropertyOwner verification.

ALTER TABLE IF EXISTS public."verification_documents"
  RENAME TO "legacy_verification_documents";

ALTER TABLE IF EXISTS public."verification_cases"
  RENAME TO "legacy_verification_cases";
