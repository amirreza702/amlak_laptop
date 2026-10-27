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

export const getActiveOwnerAgentRequestsService = () => findActiveOwnerAgentRequests();

/**
 * دسترسی مشاور تأییدشده به اطلاعات مالک بدون اشتراک پولی یا سهمیه ماهانه.
 * دسترسی‌ها ثبت می‌شوند و درخواست تکراری دوباره‌شماری نمی‌شود.
 */
export async function accessOwnerRequestContactService(agentId: string, requestId: string) {
  const request = await findOwnerRequestForAccess(requestId);
  if (!request) throw new Error("Active owner request not found");

  const toPayload = (access: unknown) => ({
    access,
    owner: { firstName: request.owner.firstName, lastName: request.owner.lastName, mobile: request.owner.user.mobile },
    property: { city: request.property.city, district: request.property.district, address: request.property.address, postalCode: request.property.postalCode },
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
