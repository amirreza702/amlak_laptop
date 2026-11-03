-- Persist the exact owner who selected the agent. The approved collaboration
-- must not depend on the lifecycle (ACTIVE/CLOSED) of the invitation request.
ALTER TABLE "property_agents"
  ADD COLUMN "approvedByOwnerId" TEXT;

UPDATE "property_agents" AS pa
SET "approvedByOwnerId" = (
  SELECT oar."ownerId"
  FROM "owner_agent_request_responses" AS response
  INNER JOIN "owner_agent_requests" AS oar
    ON oar."id" = response."ownerAgentRequestId"
  WHERE response."agentId" = pa."agentId"
    AND oar."propertyId" = pa."propertyId"
    AND response."status" = 'ACCEPTED'
  ORDER BY response."updatedAt" DESC, response."createdAt" DESC, oar."id" ASC
  LIMIT 1
)
WHERE pa."approvedByOwner" = TRUE
  AND pa."status" = 'ACTIVE';

-- Old approvals without a verifiable accepted owner request cannot safely
-- confer owner-contact or expired-listing access.
UPDATE "property_agents"
SET "approvedByOwner" = FALSE,
    "approvedAt" = NULL
WHERE "approvedByOwner" = TRUE
  AND "approvedByOwnerId" IS NULL;

CREATE INDEX "property_agents_approvedByOwnerId_idx"
  ON "property_agents"("approvedByOwnerId");
