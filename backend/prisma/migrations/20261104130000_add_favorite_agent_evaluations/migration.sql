WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "evaluatorUserId", "propertyId", type ORDER BY "createdAt" ASC, id ASC) AS position
  FROM evaluations WHERE "propertyId" IS NOT NULL
)
DELETE FROM evaluations e USING ranked r WHERE e.id = r.id AND r.position > 1;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "evaluatorUserId", "agentId", type ORDER BY "createdAt" ASC, id ASC) AS position
  FROM evaluations WHERE "agentId" IS NOT NULL
)
DELETE FROM evaluations e USING ranked r WHERE e.id = r.id AND r.position > 1;

DROP INDEX IF EXISTS "evaluations_evaluatorUserId_propertyId_key";
CREATE UNIQUE INDEX "evaluations_evaluatorUserId_propertyId_type_key" ON evaluations ("evaluatorUserId", "propertyId", type);
CREATE UNIQUE INDEX "evaluations_evaluatorUserId_agentId_type_key" ON evaluations ("evaluatorUserId", "agentId", type);

CREATE TABLE "customer_agent_favorites" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_agent_favorites_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "customer_agent_favorites_customerId_agentId_key" ON "customer_agent_favorites" ("customerId", "agentId");
CREATE INDEX "customer_agent_favorites_customerId_createdAt_idx" ON "customer_agent_favorites" ("customerId", "createdAt");
CREATE INDEX "customer_agent_favorites_agentId_idx" ON "customer_agent_favorites" ("agentId");
ALTER TABLE "customer_agent_favorites" ADD CONSTRAINT "customer_agent_favorites_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_agent_favorites" ADD CONSTRAINT "customer_agent_favorites_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
