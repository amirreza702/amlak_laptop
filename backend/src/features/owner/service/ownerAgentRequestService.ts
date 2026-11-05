import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { authorize } from "../../../shared/authorization/authorization.core";
import type { AuthorizationActor } from "../../../shared/authorization/authorization.types";
import { findAgentProfileByUserId } from "../../agent/repository/agentRepository";
import { findOwnerProfileByUserId } from "../repository/ownerRepository";
import { authorizePropertyAction, getPropertyVisibility } from "../../property/service/propertyAuthorizationService";
import { findPropertyAuthorizationContextById } from "../../property/repository/propertyRepository";
import {
  closeOwnerAgentRequest,
  createOwnerAgentRequest,
  createOwnerRequestAccessLog,
  findActiveOwnerAgentRequests,
  findActiveOwnerRequestForProperty,
  findOwnedProperty,
  findOwnerAgentRequests,
  findOwnerAgentRequestById,
  findOwnerRequestAccessLog,
  findOwnerRequestForAccess,
  findOwnerAgentRequestForResponse,
} from "../repository/ownerAgentRequestRepository";

const isExpiredListing = (listing?: { status?: string | null; confirmUntil?: Date | null } | null) => {
  if (!listing) return false;
  return listing.status === "EXPIRED" ||
    (listing.status === "PUBLISHED" && (!listing.confirmUntil || listing.confirmUntil.getTime() <= Date.now()));
};

const authorizeRequest = (
  actor: AuthorizationActor,
  action: "LIST_OWNER" | "CLOSE" | "LIST_AGENT" | "RESPOND" | "APPROVE_AGENT" | "ACCESS_OWNER_CONTACT",
  request: { id: string; status: string },
  relationship: {
    isOwner?: boolean;
    isAgent?: boolean;
    isVerifiedAgent?: boolean;
    isPropertyActive?: boolean;
    isPropertyDeleted?: boolean;
    isPropertyExpired?: boolean;
    isAcceptedResponse?: boolean;
    isApprovedByRequestOwner?: boolean;
    hasOwnerRelation?: boolean;
    isActiveAgentRelation?: boolean;
    isAgentAccepted?: boolean;
  },
) => authorize("ownerAgentRequest", action, {
  actor,
  resource: { id: request.id, status: request.status, data: { ...relationship, status: request.status } },
});

export async function createOwnerAgentRequestService(
  actor: AuthorizationActor,
  input: { propertyId?: unknown; description?: unknown },
) {
  const userId = actor.id;
  const owner = await findOwnerProfileByUserId(userId);
  if (!owner) throw new Error("OWNER_PROFILE_NOT_FOUND");

  const propertyId = typeof input.propertyId === "string" ? input.propertyId.trim() : "";
  const description = typeof input.description === "string" ? input.description.trim().slice(0, 2000) : "";
  if (!propertyId) throw new Error("Property ID is required");

  return prisma.$transaction(async (tx) => {
    const relation = await findOwnedProperty(owner.id, propertyId, tx);
    if (!relation || !relation.property.isActive || relation.property.deletedAt) {
      throw new Error("Property does not belong to owner");
    }

    const canManage = await authorizePropertyAction(actor, "MANAGE", relation.property);
    if (!canManage) throw new Error("Property does not belong to owner");

    if (await findActiveOwnerRequestForProperty(owner.id, propertyId, tx)) {
      throw new Error("An active request already exists for this property");
    }
    return createOwnerAgentRequest(
      { ownerId: owner.id, propertyId, description: description || null },
      tx,
    );
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

/** فهرست درخواست‌های متعلق به مالک نشست جاری؛ شناسه پروفایل از URL اخذ نمی‌شود. */
export async function getOwnerAgentRequestsService(actor: AuthorizationActor) {
  const userId = actor.id;
  const owner = await findOwnerProfileByUserId(userId);
  if (!owner) throw new Error("OWNER_PROFILE_NOT_FOUND");

  
  const requests = await findOwnerAgentRequests(owner.id);
  const authorized = await Promise.all(requests.map(async (request) => {
    const allowed = await authorizeRequest(actor, "LIST_OWNER", request, {
      isOwner: request.ownerId === owner.id,
    });
    return allowed ? request : null;
  }));
  return authorized.filter((request): request is NonNullable<typeof request> => request !== null);
}

export async function closeOwnerAgentRequestService(actor: AuthorizationActor, requestId: string) {
  const userId = actor.id;
  const owner = await findOwnerProfileByUserId(userId);
  if (!owner) throw new Error("OWNER_PROFILE_NOT_FOUND");

  return prisma.$transaction(async (tx) => {
    const request = await findOwnerAgentRequestById(requestId, tx);
    if (!request) throw new Error("Active owner request not found");

    const allowed = await authorizeRequest(actor, "CLOSE", request, {
      isOwner: request.ownerId === owner.id,
    });
    if (!allowed) throw new Error("Active owner request not found");

    const result = await closeOwnerAgentRequest(owner.id, requestId, tx);
    if (result.count === 0) throw new Error("Active owner request not found");
    return { id: requestId, status: "CLOSED" };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

/** فهرست درخواست‌های فعال برای مشاور تأییدشده صاحب نشست جاری. */
export async function getActiveOwnerAgentRequestsService(actor: AuthorizationActor) {
  const userId = actor.id;
  const agent = await findAgentProfileByUserId(userId);
  if (!agent) throw new Error("AGENT_PROFILE_NOT_FOUND");

  const requests = await findActiveOwnerAgentRequests(agent.id);
  
  const authorized = await Promise.all(requests.map(async (request) => {
    const allowed = await authorizeRequest(actor, "LIST_AGENT", request, {
      isAgent: true,
      isVerifiedAgent: agent.verificationStatus === "VERIFIED",
      isPropertyActive: request.property.isActive,
      isPropertyDeleted: Boolean(request.property.deletedAt),
      isPropertyExpired: isExpiredListing(request.property.listing),
    });
    return allowed ? request : null;
  }));
  return authorized.filter((request): request is NonNullable<typeof request> => request !== null);
}

/**
 * پاسخ هر مشاور به درخواست همکاری مالک.
 * شناسه Agent فقط از User نشست resolve می‌شود و Policy وضعیت درخواست را کنترل می‌کند.
 */
export async function respondToOwnerAgentRequestService(
  actor: AuthorizationActor,
  requestId: string,
  response: "ACCEPTED" | "REJECTED",
) {
  const userId = actor.id;
  const agent = await findAgentProfileByUserId(userId);
  if (!agent) throw new Error("AGENT_PROFILE_NOT_FOUND");

  return prisma.$transaction(async (tx) => {
    const request = await findOwnerAgentRequestForResponse(requestId, tx);
    if (!request) throw new Error("ACTIVE_OWNER_REQUEST_NOT_FOUND");

    const allowed = await authorizeRequest(
      actor,
      "RESPOND",
      request,
      {
        isAgent: true,
        isVerifiedAgent: agent.verificationStatus === "VERIFIED",
        isPropertyActive: request.property.isActive,
        isPropertyDeleted: Boolean(request.property.deletedAt),
        isPropertyExpired: isExpiredListing(request.property.listing),
      },
    );
    if (!allowed) throw new Error("AGENT_NOT_AUTHORIZED_FOR_OWNER_REQUEST");

    const relation = await tx.propertyAgent.findUnique({
      where: { propertyId_agentId: { propertyId: request.propertyId, agentId: agent.id } },
    });

    if (response === "ACCEPTED") {
      if (relation?.status === "REVOKED") {
        await tx.propertyAgent.update({
          where: { propertyId_agentId: { propertyId: request.propertyId, agentId: agent.id } },
          data: { status: "ACTIVE", approvedByOwner: false, approvedByOwnerId: null, approvedAt: null },
        });
      } else if (!relation) {
        const hasAgents = (await tx.propertyAgent.count({ where: { propertyId: request.propertyId } })) > 0;
        await tx.propertyAgent.create({
          data: { propertyId: request.propertyId, agentId: agent.id, isFirstRegistrant: !hasAgents },
        });
      }
    } else if (relation && relation.status === "ACTIVE") {
      await tx.propertyAgent.update({
        where: { propertyId_agentId: { propertyId: request.propertyId, agentId: agent.id } },
        data: { status: "REVOKED", approvedByOwner: false, approvedByOwnerId: null, approvedAt: null },
      });
    }

    return tx.ownerAgentRequestResponse.upsert({
      where: { ownerAgentRequestId_agentId: { ownerAgentRequestId: requestId, agentId: agent.id } },
      create: { ownerAgentRequestId: requestId, agentId: agent.id, status: response },
      update: { status: response },
      select: { id: true, ownerAgentRequestId: true, agentId: true, status: true, updatedAt: true },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

/**
 * دسترسی به اطلاعات مالک فقط برای مشاور پذیرفته‌شده و دارای تأیید نهایی مالک.
 * دسترسی دقیق ملک با Policy ملک و شناسه همان مالک درخواست کنترل می‌شود.
 */
export async function accessOwnerRequestContactService(actor: AuthorizationActor, requestId: string) {
  const userId = actor.id;
  const agent = await findAgentProfileByUserId(userId);
  if (!agent || agent.verificationStatus !== "VERIFIED") {
    throw new Error("AGENT_NOT_APPROVED_FOR_OWNER_REQUEST");
  }

  const request = await findOwnerRequestForAccess(requestId, agent.id);
  if (!request) throw new Error("Active owner request not found");

  const response = await prisma.ownerAgentRequestResponse.findUnique({
    where: { ownerAgentRequestId_agentId: { ownerAgentRequestId: requestId, agentId: agent.id } },
    select: { status: true },
  });
  const agentRelation = request.property.agents.find((item) => item.agentId === agent.id) ?? null;
  const canAccessRequestContact = await authorizeRequest(
    actor,
    "ACCESS_OWNER_CONTACT",
    request,
    {
      isAgent: true,
      isVerifiedAgent: true,
      isPropertyActive: request.property.isActive,
      isPropertyDeleted: Boolean(request.property.deletedAt),
      isPropertyExpired: isExpiredListing(request.property.listing),
      isAcceptedResponse: response?.status === "ACCEPTED",
      isActiveAgentRelation: agentRelation?.status === "ACTIVE",
      isApprovedByRequestOwner: agentRelation?.approvedByOwner === true &&
        agentRelation.approvedByOwnerId === request.ownerId,
      hasOwnerRelation: request.property.owners.some((item) => item.ownerId === request.ownerId),
    },
  );
  if (!canAccessRequestContact) throw new Error("AGENT_NOT_APPROVED_FOR_OWNER_REQUEST");

  const visibility = await getPropertyVisibility(
    actor,
    request.property,
    request.ownerId,
  );
  if (!visibility.canViewExactLocation || !visibility.canViewOwnerDetails) {
    throw new Error("AGENT_NOT_APPROVED_FOR_OWNER_REQUEST");
  }

  const toPayload = (access: unknown) => ({
    access,
    owner: { id: request.ownerId, firstName: request.owner.firstName, lastName: request.owner.lastName },
    property: {
      id: request.propertyId,
      city: request.property.city,
      district: request.property.district,
      address: request.property.address,
      postalCode: request.property.postalCode,
    },
  });

  const access = await prisma.$transaction(async (tx) => {
    const freshRequest = await tx.ownerAgentRequest.findFirst({
      where: { id: requestId, status: "ACTIVE" },
      select: { id: true, ownerId: true, propertyId: true, status: true },
    });
    if (!freshRequest) throw new Error("AGENT_NOT_APPROVED_FOR_OWNER_REQUEST");

    const freshAgent = await tx.agent.findUnique({
      where: { userId },
      select: { id: true, verificationStatus: true },
    });
    const freshProperty = await findPropertyAuthorizationContextById(freshRequest.propertyId, tx);
    if (!freshAgent || freshAgent.id !== agent.id || freshAgent.verificationStatus !== "VERIFIED" ||
        !freshProperty || !freshProperty.isActive || freshProperty.deletedAt) {
      throw new Error("AGENT_NOT_APPROVED_FOR_OWNER_REQUEST");
    }
    const freshResponse = await tx.ownerAgentRequestResponse.findUnique({
      where: { ownerAgentRequestId_agentId: { ownerAgentRequestId: requestId, agentId: freshAgent.id } },
      select: { status: true },
    });
    const freshRelation = freshProperty.agents?.find((item) => item.agent?.userId === userId) ?? null;
    const freshAllowed = await authorizeRequest(actor, "ACCESS_OWNER_CONTACT", freshRequest, {
      isAgent: true,
      isVerifiedAgent: true,
      isPropertyActive: freshProperty.isActive,
      isPropertyDeleted: Boolean(freshProperty.deletedAt),
      isPropertyExpired: isExpiredListing(freshProperty.listing),
      isAcceptedResponse: freshResponse?.status === "ACCEPTED",
      isActiveAgentRelation: freshRelation?.status === "ACTIVE",
      isApprovedByRequestOwner: freshRelation?.approvedByOwner === true &&
        freshRelation.approvedByOwnerId === freshRequest.ownerId,
      hasOwnerRelation: freshProperty.owners?.some((item) => item.ownerId === freshRequest.ownerId) === true,
    });
    const freshVisibility = await getPropertyVisibility(actor, freshProperty, freshRequest.ownerId);
    if (!freshAllowed || !freshVisibility.canViewExactLocation || !freshVisibility.canViewOwnerDetails) {
      throw new Error("AGENT_NOT_APPROVED_FOR_OWNER_REQUEST");
    }

    const existing = await findOwnerRequestAccessLog(freshAgent.id, requestId, tx);
    if (existing) return existing;
    return createOwnerRequestAccessLog(freshAgent.id, requestId, tx);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  return toPayload(access);
}
