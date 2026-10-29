CREATE TABLE "owner_agent_request_responses" (
    "id" TEXT NOT NULL,
    "ownerAgentRequestId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "owner_agent_request_responses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "owner_agent_request_responses_ownerAgentRequestId_agentId_key"
ON "owner_agent_request_responses"("ownerAgentRequestId", "agentId");

CREATE INDEX "owner_agent_request_responses_agentId_status_idx"
ON "owner_agent_request_responses"("agentId", "status");

CREATE INDEX "owner_agent_request_responses_ownerAgentRequestId_status_idx"
ON "owner_agent_request_responses"("ownerAgentRequestId", "status");

ALTER TABLE "owner_agent_request_responses"
ADD CONSTRAINT "owner_agent_request_responses_ownerAgentRequestId_fkey"
FOREIGN KEY ("ownerAgentRequestId") REFERENCES "owner_agent_requests"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "owner_agent_request_responses"
ADD CONSTRAINT "owner_agent_request_responses_agentId_fkey"
FOREIGN KEY ("agentId") REFERENCES "agents"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
