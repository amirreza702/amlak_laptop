import { prisma } from "../../../lib/prisma";
import type { Prisma } from "@prisma/client";

type Db = typeof prisma | Prisma.TransactionClient;

export const findAgentSearchRequestOwner = (requestId: string, userId: string, db: Db = prisma) =>
  db.propertySearchRequest.findFirst({
    where: { id: requestId, createdByUserId: userId, createdByRole: "AGENT" },
    select: { id: true, status: true, createdByUserId: true, createdByRole: true },
  });

export const updateAgentSearchRequest = (
  requestId: string,
  userId: string,
  data: Prisma.PropertySearchRequestUpdateManyMutationInput,
  db: Db = prisma,
) => db.propertySearchRequest.updateMany({
  where: { id: requestId, createdByUserId: userId, createdByRole: "AGENT" },
  data,
});

export const deleteAgentSearchRequest = (requestId: string, userId: string, db: Db = prisma) =>
  db.propertySearchRequest.deleteMany({
    where: { id: requestId, createdByUserId: userId, createdByRole: "AGENT" },
  });

export const findActiveAgentSearchRequests = (db: Db = prisma) =>
  db.propertySearchRequest.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true, customerId: true, requesterMobile: true, requesterFirstName: true, requesterLastName: true,
      customer: { select: { firstName: true, lastName: true, user: { select: { mobile: true } } } },
      transactionType: true, propertyType: true, city: true, budget: true,
      description: true, hashtiVerified: true, status: true,
      createdByRole: true, createdByUserId: true,
      createdByUser: { select: { mobile: true, agent: { select: { firstName: true, lastName: true } } } },
      createdAt: true, updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
