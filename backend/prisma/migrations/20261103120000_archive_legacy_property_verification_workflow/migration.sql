-- Retire the legacy property verification-case/document workflow.
-- Preserve historical records instead of deleting user-submitted documents.
-- VerificationStatus remains active because it is still used by PropertyOwner verification.

DO $$
BEGIN
  IF to_regclass('public.verification_documents') IS NOT NULL
     AND to_regclass('public.legacy_verification_documents') IS NULL THEN
    ALTER TABLE public."verification_documents"
      RENAME TO "legacy_verification_documents";
  END IF;

  IF to_regclass('public.verification_cases') IS NOT NULL
     AND to_regclass('public.legacy_verification_cases') IS NULL THEN
    ALTER TABLE public."verification_cases"
      RENAME TO "legacy_verification_cases";
  END IF;
END
$$;
