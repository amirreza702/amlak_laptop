-- Additive-only migration for a separate elevated Hashti permission.
ALTER TABLE "users"
  ADD COLUMN "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;
