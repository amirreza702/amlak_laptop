-- Create private notes scoped to a single agent and entity.
CREATE TABLE "agent_private_notes" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "agent_private_notes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "agent_private_notes_agentId_entityType_entityId_key"
ON "agent_private_notes"("agentId", "entityType", "entityId");

CREATE INDEX "agent_private_notes_entityType_entityId_idx"
ON "agent_private_notes"("entityType", "entityId");

CREATE INDEX "agent_private_notes_agentId_updatedAt_idx"
ON "agent_private_notes"("agentId", "updatedAt");

ALTER TABLE "agent_private_notes"
ADD CONSTRAINT "agent_private_notes_agentId_fkey"
FOREIGN KEY ("agentId") REFERENCES "agents"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
