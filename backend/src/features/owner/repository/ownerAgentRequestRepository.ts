import { prisma } from "../../../lib/prisma";
import { Prisma } from "@prisma/client";

type Db = typeof prisma | Prisma.TransactionClient;

export const findOwnedProperty = (ownerId: string, propertyId: string, db: Db = prisma) =>
  db.propertyOwner.findUnique({
    where: { propertyId_ownerId: { ownerId, propertyId } },
    include: {
      property: {
        select: {
          id: true, isActive: true, registrationSource: true, createdByUserId: true, deletedAt: true,
          listing: { select: { status: true, confirmUntil: true } },
          owners: { select: { ownerId: true, owner: { select: { userId: true } } } },
        },
      },
    },
  });

export const findActiveOwnerRequestForProperty = (ownerId: string, propertyId: string, db: Db = prisma) =>
  db.ownerAgentRequest.findFirst({ where: { ownerId, propertyId, status: "ACTIVE" } });

export const createOwnerAgentRequest = (
  data: { ownerId: string; propertyId: string; description: string | null },
  db: Db = prisma,
) => db.ownerAgentRequest.create({
  data,
  select: {
    id: true, ownerId: true, propertyId: true, description: true, status: true, createdAt: true,
    property: { select: { propertyType: true, city: true, district: true, area: true, agents: { select: { agentId: true, status: true, approvedByOwner: true } } } },
  },
});

export const findOwnerAgentRequests = (ownerId: string) =>
  prisma.ownerAgentRequest.findMany({
    where: { ownerId, status: { not: "DELETED" }, property: { is: { deletedAt: null } } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, ownerId: true, propertyId: true, description: true, status: true, createdAt: true, updatedAt: true,
      property: { select: { propertyType: true, city: true, district: true, area: true, agents: { select: { agentId: true, status: true, approvedByOwner: true } } } },
      responses: {
        select: {
          status: true,
          agent: { select: { id: true, firstName: true, lastName: true, agencyName: true, verificationStatus: true, user: { select: { mobile: true, isActive: true } } } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

export const findOwnerAgentRequestById = (requestId: string, db: Db = prisma) =>
  db.ownerAgentRequest.findUnique({
    where: { id: requestId },
    select: { id: true, ownerId: true, propertyId: true, status: true },
  });

export const closeOwnerAgentRequest = (ownerId: string, requestId: string, db: Db = prisma) =>
  db.ownerAgentRequest.updateMany({
    where: { id: requestId, ownerId, status: "ACTIVE" },
    data: { status: "CLOSED" },
  });

export const findActiveOwnerAgentRequests = (agentId: string) =>
  prisma.ownerAgentRequest.findMany({
    where: {
      status: "ACTIVE",
      property: { isActive: true, deletedAt: null },
      owner: { user: { isActive: true } },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, ownerId: true, propertyId: true, description: true, status: true, createdAt: true,
      owner: { select: { createdByRole: true } },
      property: {
        select: {
          isActive: true, deletedAt: true,
          createdByRole: true, propertyType: true, city: true, district: true, area: true, rooms: true,
          listing: { select: { transactionType: true, status: true, confirmUntil: true } },
          agents: { where: { agentId }, select: { status: true, approvedByOwner: true } },
        },
      },
      responses: {
        where: { agentId },
        select: {
          status: true,
          agent: { select: { id: true, firstName: true, lastName: true, agencyName: true, user: { select: { mobile: true } } } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

export const findOwnerRequestForAccess = (requestId: string, agentId: string, db: Db = prisma) =>
  db.ownerAgentRequest.findFirst({
    where: { id: requestId, status: "ACTIVE", property: { isActive: true, deletedAt: null } },
    select: {
      id: true, ownerId: true, propertyId: true, status: true,
      owner: { select: { firstName: true, lastName: true, user: { select: { mobile: true, isActive: true } } } },
      property: {
        select: {
          id: true, isActive: true, registrationSource: true, createdByUserId: true, deletedAt: true,
          address: true, postalCode: true, city: true, district: true,
          listing: { select: { status: true, confirmUntil: true } },
          owners: {
            select: { ownerId: true, owner: { select: { userId: true } } },
          },
          agents: {
            where: { agentId, status: "ACTIVE" },
            select: {
              agentId: true, status: true, approvedByOwner: true, approvedByOwnerId: true,
              agent: { select: { userId: true } },
            },
          },
        },
      },
    },
  });

export const findOwnerAgentRequestForResponse = (requestId: string, db: Db = prisma) =>
  db.ownerAgentRequest.findFirst({
    where: { id: requestId, status: "ACTIVE", property: { isActive: true, deletedAt: null } },
    select: {
      id: true,
      propertyId: true,
      status: true,
      property: {
        select: {
          isActive: true,
          deletedAt: true,
          listing: { select: { status: true, confirmUntil: true } },
        },
      },
    },
  });

export const upsertOwnerAgentRequestResponse = (
  ownerAgentRequestId: string,
  agentId: string,
  status: string,
  db: Db = prisma,
) => db.ownerAgentRequestResponse.upsert({
  where: { ownerAgentRequestId_agentId: { ownerAgentRequestId, agentId } },
  create: { ownerAgentRequestId, agentId, status },
  update: { status },
});

export const findOwnerRequestAccessLog = (agentId: string, requestId: string, db: Db = prisma) =>
  db.ownerAgentRequestAccessLog.findUnique({
    where: { agentId_ownerAgentRequestId: { agentId, ownerAgentRequestId: requestId } },
  });

export const createOwnerRequestAccessLog = (agentId: string, requestId: string, db: Db = prisma) =>
  db.ownerAgentRequestAccessLog.create({ data: { agentId, ownerAgentRequestId: requestId } });
