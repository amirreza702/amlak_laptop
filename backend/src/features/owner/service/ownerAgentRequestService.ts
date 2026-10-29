import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import {
  closeOwnerAgentRequest,
  createOwnerAgentRequest,
  createOwnerRequestAccessLog,
  findActiveOwnerAgentRequests,
  findActiveOwnerRequestForProperty,
  findOwnedProperty,
  findOwnerAgentRequests,
  findOwnerRequestAccessLog,
  findOwnerRequestForAccess,
  findOwnerAgentRequestForResponse,
} from "../repository/ownerAgentRequestRepository";

export async function createOwnerAgentRequestService(ownerId: string, input: { propertyId?: unknown; description?: unknown }) {
  const propertyId = typeof input.propertyId === "string" ? input.propertyId.trim() : "";
  const description = typeof input.description === "string" ? input.description.trim().slice(0, 2000) : "";
  if (!propertyId) throw new Error("Property ID is required");
  const relation = await findOwnedProperty(ownerId, propertyId);
  if (!relation || !relation.property.isActive) throw new Error("Property does not belong to owner");
  if (await findActiveOwnerRequestForProperty(ownerId, propertyId)) throw new Error("An active request already exists for this property");
  return createOwnerAgentRequest({ ownerId, propertyId, description: description || null });
}

export const getOwnerAgentRequestsService = (ownerId: string) => findOwnerAgentRequests(ownerId);

export async function closeOwnerAgentRequestService(ownerId: string, requestId: string) {
  const result = await closeOwnerAgentRequest(ownerId, requestId);
  if (result.count === 0) throw new Error("Active owner request not found");
  return { id: requestId, status: "CLOSED" };
}

export const getActiveOwnerAgentRequestsService = (agentId: string) => findActiveOwnerAgentRequests(agentId);

/**
 * ثبت پاسخ مستقل هر مشاور به درخواست همکاری مالک.
 * در صورت پذیرش، ارتباط مشاور و ملک برای تصمیم نهایی مالک آماده می‌شود.
 */
export async function respondToOwnerAgentRequestService(agentId: string, requestId: string, response: "ACCEPTED" | "REJECTED") {
  const request = await findOwnerAgentRequestForResponse(requestId);
  if (!request) throw new Error("ACTIVE_OWNER_REQUEST_NOT_FOUND");

  return prisma.$transaction(async (tx) => {
    const relation = await tx.propertyAgent.findUnique({
      where: { propertyId_agentId: { propertyId: request.propertyId, agentId } },
    });

    if (response === "ACCEPTED") {
      if (relation?.status === "REVOKED") {
        await tx.propertyAgent.update({
          where: { propertyId_agentId: { propertyId: request.propertyId, agentId } },
          data: { status: "ACTIVE", approvedByOwner: false, approvedAt: null },
        });
      } else if (!relation) {
        const hasAgents = (await tx.propertyAgent.count({ where: { propertyId: request.propertyId } })) > 0;
        await tx.propertyAgent.create({
          data: { propertyId: request.propertyId, agentId, isFirstRegistrant: !hasAgents },
        });
      }
    } else if (relation && relation.status === "ACTIVE") {
      await tx.propertyAgent.update({
        where: { propertyId_agentId: { propertyId: request.propertyId, agentId } },
        data: { status: "REVOKED", approvedByOwner: false, approvedAt: null },
      });
    }

    return tx.ownerAgentRequestResponse.upsert({
      where: { ownerAgentRequestId_agentId: { ownerAgentRequestId: requestId, agentId } },
      create: { ownerAgentRequestId: requestId, agentId, status: response },
      update: { status: response },
      select: { id: true, ownerAgentRequestId: true, agentId: true, status: true, updatedAt: true },
    });
  });
}

/**
 * دسترسی مشاور تأییدشده به اطلاعات مالک بدون اشتراک پولی یا سهمیه ماهانه.
 * دسترسی‌ها ثبت می‌شوند و درخواست تکراری دوباره‌شماری نمی‌شود.
 */
export async function accessOwnerRequestContactService(agentId: string, requestId: string) {
  const request = await findOwnerRequestForAccess(requestId);
  if (!request) throw new Error("Active owner request not found");

  const [response, relation] = await Promise.all([
    prisma.ownerAgentRequestResponse.findUnique({
      where: { ownerAgentRequestId_agentId: { ownerAgentRequestId: requestId, agentId } },
      select: { status: true },
    }),
    prisma.propertyAgent.findUnique({
      where: { propertyId_agentId: { propertyId: request.propertyId, agentId } },
      select: { status: true, approvedByOwner: true },
    }),
  ]);
  if (response?.status !== "ACCEPTED" || relation?.status !== "ACTIVE" || !relation.approvedByOwner) {
    throw new Error("AGENT_NOT_APPROVED_FOR_OWNER_REQUEST");
  }

  const toPayload = (access: unknown) => ({
    access,
    owner: { id: request.ownerId, firstName: request.owner.firstName, lastName: request.owner.lastName, mobile: request.owner.user.mobile },
    property: { id: request.propertyId, city: request.property.city, district: request.property.district, address: request.property.address, postalCode: request.property.postalCode },
  });

  const prior = await findOwnerRequestAccessLog(agentId, requestId);
  if (prior) return toPayload(prior);

  const access = await prisma.$transaction(async (tx) => {
    const existing = await findOwnerRequestAccessLog(agentId, requestId, tx);
    if (existing) return existing;
    return createOwnerRequestAccessLog(agentId, requestId, tx);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  return toPayload(access);
}
