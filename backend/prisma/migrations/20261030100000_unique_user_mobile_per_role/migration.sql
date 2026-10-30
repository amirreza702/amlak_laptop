-- A mobile number may own one account for each role, but not multiple accounts for the same role.
DROP INDEX IF EXISTS "users_mobile_key";

CREATE UNIQUE INDEX "users_mobile_role_key"
ON "users"("mobile", "role");

CREATE INDEX "users_mobile_idx"
ON "users"("mobile");
