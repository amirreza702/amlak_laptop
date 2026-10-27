-- Owner requests are broadcast to all verified agents.
CREATE TABLE "owner_agent_requests" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "owner_agent_requests_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "owner_agent_request_access_logs" (
  "id" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "ownerAgentRequestId" TEXT NOT NULL,
  "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "owner_agent_request_access_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "owner_agent_requests_ownerId_createdAt_idx" ON "owner_agent_requests"("ownerId", "createdAt");
CREATE INDEX "owner_agent_requests_propertyId_status_idx" ON "owner_agent_requests"("propertyId", "status");
CREATE INDEX "owner_agent_requests_status_createdAt_idx" ON "owner_agent_requests"("status", "createdAt");
CREATE UNIQUE INDEX "owner_agent_request_access_logs_agentId_ownerAgentRequestId_key" ON "owner_agent_request_access_logs"("agentId", "ownerAgentRequestId");
CREATE INDEX "owner_agent_request_access_logs_agentId_accessedAt_idx" ON "owner_agent_request_access_logs"("agentId", "accessedAt");
CREATE INDEX "owner_agent_request_access_logs_ownerAgentRequestId_idx" ON "owner_agent_request_access_logs"("ownerAgentRequestId");
ALTER TABLE "owner_agent_requests" ADD CONSTRAINT "owner_agent_requests_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "owners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "owner_agent_requests" ADD CONSTRAINT "owner_agent_requests_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "owner_agent_request_access_logs" ADD CONSTRAINT "owner_agent_request_access_logs_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "owner_agent_request_access_logs" ADD CONSTRAINT "owner_agent_request_access_logs_ownerAgentRequestId_fkey" FOREIGN KEY ("ownerAgentRequestId") REFERENCES "owner_agent_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
