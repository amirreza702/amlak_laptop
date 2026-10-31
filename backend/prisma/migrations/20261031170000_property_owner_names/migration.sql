-- Store the property owner name separately from the account or agent that registered the property.
ALTER TABLE "properties"
  ADD COLUMN "ownerFirstName" TEXT,
  ADD COLUMN "ownerLastName" TEXT;
