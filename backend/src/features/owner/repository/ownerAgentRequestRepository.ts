import { prisma } from "../../../lib/prisma";
import { Prisma } from "@prisma/client";

type Db = typeof prisma | Prisma.TransactionClient;

export const findOwnedProperty = (ownerId: string, propertyId: string) =>
  prisma.propertyOwner.findUnique({
    where: { propertyId_ownerId: { ownerId, propertyId } },
    include: { property: { select: { id: true, isActive: true } } },
  });

export const findActiveOwnerRequestForProperty = (ownerId: string, propertyId: string) =>
  prisma.ownerAgentRequest.findFirst({ where: { ownerId, propertyId, status: "ACTIVE" } });

export const createOwnerAgentRequest = (data: { ownerId: string; propertyId: string; description: string | null }) =>
  prisma.$transaction(async (tx) => {
    const existing = await tx.ownerAgentRequest.findFirst({
      where: { ownerId: data.ownerId, propertyId: data.propertyId, status: "ACTIVE" },
      select: { id: true },
    });
    if (existing) throw new Error("An active request already exists for this property");
    return tx.ownerAgentRequest.create({
      data,
      select: {
        id: true, ownerId: true, propertyId: true, description: true, status: true, createdAt: true,
        property: { select: { propertyType: true, city: true, district: true, area: true } },
      },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

export const findOwnerAgentRequests = (ownerId: string) =>
  prisma.ownerAgentRequest.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, propertyId: true, description: true, status: true, createdAt: true, updatedAt: true,
      property: { select: { propertyType: true, city: true, district: true, area: true } },
    },
  });

export const closeOwnerAgentRequest = (ownerId: string, requestId: string) =>
  prisma.ownerAgentRequest.updateMany({
    where: { id: requestId, ownerId, status: "ACTIVE" },
    data: { status: "CLOSED" },
  });

export const findActiveOwnerAgentRequests = () =>
  prisma.ownerAgentRequest.findMany({
    where: {
      status: "ACTIVE",
      property: { isActive: true },
      owner: { user: { isActive: true } },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, ownerId: true, propertyId: true, description: true, status: true, createdAt: true,
      property: {
        select: {
          propertyType: true, city: true, district: true, area: true, rooms: true,
          listing: { select: { transactionType: true } },
        },
      },
    },
  });

export const findOwnerRequestForAccess = (requestId: string) =>
  prisma.ownerAgentRequest.findFirst({
    where: { id: requestId, status: "ACTIVE", property: { isActive: true } },
    select: {
      id: true, ownerId: true, propertyId: true, status: true,
      owner: { select: { firstName: true, lastName: true, user: { select: { mobile: true } } } },
      property: { select: { address: true, postalCode: true, city: true, district: true } },
    },
  });

export const findOwnerRequestAccessLog = (agentId: string, requestId: string, db: Db = prisma) =>
  db.ownerAgentRequestAccessLog.findUnique({
    where: { agentId_ownerAgentRequestId: { agentId, ownerAgentRequestId: requestId } },
  });

export const createOwnerRequestAccessLog = (agentId: string, requestId: string, db: Db = prisma) =>
  db.ownerAgentRequestAccessLog.create({ data: { agentId, ownerAgentRequestId: requestId } });
