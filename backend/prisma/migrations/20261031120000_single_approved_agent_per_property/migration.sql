-- Enforce at most one active, owner-approved agent per property.
-- Keep all historical PropertyAgent rows; only normalize duplicate approvals.
WITH ranked_approvals AS (
  SELECT
    "propertyId",
    "agentId",
    ROW_NUMBER() OVER (
      PARTITION BY "propertyId"
      ORDER BY "approvedAt" DESC NULLS LAST, "registeredAt" ASC, "agentId" ASC
    ) AS approval_rank
  FROM "property_agents"
  WHERE "approvedByOwner" = TRUE
    AND "status" = 'ACTIVE'
)
UPDATE "property_agents" AS pa
SET
  "approvedByOwner" = FALSE,
  "approvedAt" = NULL
FROM ranked_approvals AS ranked
WHERE pa."propertyId" = ranked."propertyId"
  AND pa."agentId" = ranked."agentId"
  AND ranked.approval_rank > 1;

CREATE UNIQUE INDEX "property_agents_one_active_owner_approval_per_property"
ON "property_agents" ("propertyId")
WHERE "approvedByOwner" = TRUE AND "status" = 'ACTIVE';
