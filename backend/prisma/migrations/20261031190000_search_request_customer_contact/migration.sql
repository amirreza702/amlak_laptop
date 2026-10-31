-- Store the customer's own contact details on search requests.
-- For agent-created legacy requests requesterMobile held the agent's number, not the customer's.
ALTER TABLE "property_search_requests"
  ADD COLUMN IF NOT EXISTS "requesterFirstName" TEXT,
  ADD COLUMN IF NOT EXISTS "requesterLastName" TEXT;

UPDATE "property_search_requests"
SET "requesterMobile" = NULL
WHERE "createdByRole" = 'AGENT';
