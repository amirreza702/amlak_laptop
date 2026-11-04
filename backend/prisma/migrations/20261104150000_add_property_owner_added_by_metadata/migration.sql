ALTER TABLE "property_owners"
ADD COLUMN "addedByUserId" TEXT,
ADD COLUMN "addedByRole" "UserRole",
ADD COLUMN "addedByMobile" TEXT;

CREATE INDEX "property_owners_addedByUserId_idx"
ON "property_owners"("addedByUserId");

ALTER TABLE "property_owners"
ADD CONSTRAINT "property_owners_addedByUserId_fkey"
FOREIGN KEY ("addedByUserId") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
