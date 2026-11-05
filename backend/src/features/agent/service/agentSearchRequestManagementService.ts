import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { authorize } from "../../../shared/authorization/authorization.core";
import type { AuthorizationActor } from "../../../shared/authorization/authorization.types";
import {
  deleteAgentSearchRequest,
  findActiveAgentSearchRequests,
  findAgentSearchRequestOwner,
  updateAgentSearchRequest,
} from "../repository/agentSearchRequestManagementRepository";

function requestData(row: Awaited<ReturnType<typeof findActiveAgentSearchRequests>>[number], viewerUserId: string) {
  const {
    createdByUserId, requesterMobile, requesterFirstName, requesterLastName,
    customer, createdByUser, ...request
  } = row;
  const isCreatedByMe = createdByUserId === viewerUserId;
  const isAgentCreated = request.createdByRole === "AGENT";
  const mayViewCustomer = !isAgentCreated || isCreatedByMe;
  const customerFirstName = mayViewCustomer ? (requesterFirstName ?? customer?.firstName ?? null) : null;
  const customerLastName = mayViewCustomer ? (requesterLastName ?? customer?.lastName ?? null) : null;
  const customerMobile = mayViewCustomer ? (requesterMobile ?? customer?.user.mobile ?? null) : null;
  const creatorFirstName = createdByUser?.agent?.firstName ?? null;
  const creatorLastName = createdByUser?.agent?.lastName ?? null;
  const creatorMobile = isAgentCreated ? createdByUser?.mobile ?? null : customerMobile;
  const customerName = [customerFirstName, customerLastName].filter(Boolean).join(" ");
  const creatorName = [creatorFirstName, creatorLastName].filter(Boolean).join(" ");

  return {
    ...request,
    customerId: mayViewCustomer ? request.customerId : null,
    requesterFirstName: customerFirstName,
    requesterLastName: customerLastName,
    requesterMobile: customerMobile,
    contactName: isAgentCreated && !isCreatedByMe ? (creatorName || "مشاور ثبت‌کننده") : (customerName || "مشتری"),
    contactMobile: isAgentCreated && !isCreatedByMe ? creatorMobile : customerMobile,
    registrantFirstName: isAgentCreated ? creatorFirstName : customerFirstName,
    registrantLastName: isAgentCreated ? creatorLastName : customerLastName,
    registrantMobile: creatorMobile,
    isCreatedByMe,
  };
}

async function getVerifiedAgentActor(tx: Prisma.TransactionClient, actor: AuthorizationActor) {
  const user = await tx.user.findUnique({
    where: { id: actor.id },
    select: { id: true, role: true, isActive: true },
  });
  if (!user || user.role !== "AGENT" || user.isActive !== true || actor.role !== "AGENT") {
    throw new Error("AGENT_SEARCH_REQUEST_FORBIDDEN");
  }
  const agent = await tx.agent.findUnique({
    where: { userId: actor.id },
    select: { id: true, verificationStatus: true },
  });
  if (!agent || agent.verificationStatus !== "VERIFIED") {
    throw new Error("AGENT_VERIFICATION_REQUIRED");
  }
  return { actor: { ...actor, role: user.role, isActive: user.isActive }, agent };
}

export async function updateOwnAgentSearchRequestService(
  actor: AuthorizationActor,
  requestId: string,
  input: {
    transactionType?: "SALE" | "FULL_DEPOSIT" | "RENT" | "DEPOSIT_AND_RENT";
    propertyType?: "APARTMENT" | "HOUSE" | "VILLA" | "LAND" | "SHOP" | "OFFICE" | "GARDEN";
    city?: string;
    budget?: number;
    description?: string | null;
    requesterFirstName?: string | null;
    requesterLastName: string;
    requesterMobile: string;
  },
) {
  return prisma.$transaction(async (tx) => {
    const verified = await getVerifiedAgentActor(tx, actor);
    const existing = await findAgentSearchRequestOwner(requestId, actor.id, tx);
    if (!existing) throw new Error("SEARCH_REQUEST_NOT_FOUND");
    const allowed = await authorize("searchRequest", "MANAGE_OWN", {
      actor: verified.actor,
      resource: {
        id: existing.id,
        status: existing.status,
        data: {
          isCreator: existing.createdByUserId === actor.id,
          createdByRole: existing.createdByRole,
          status: existing.status,
          isVerifiedAgent: true,
        },
      },
    });
    if (!allowed) throw new Error("SEARCH_REQUEST_MANAGEMENT_FORBIDDEN");

    const result = await updateAgentSearchRequest(requestId, actor.id, {
      ...(input.transactionType !== undefined ? { transactionType: input.transactionType } : {}),
      ...(input.propertyType !== undefined ? { propertyType: input.propertyType } : {}),
      ...(input.city !== undefined ? { city: input.city.trim() } : {}),
      ...(input.budget !== undefined ? { budget: input.budget } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      requesterFirstName: input.requesterFirstName?.trim() || null,
      requesterLastName: input.requesterLastName.trim(),
      requesterMobile: input.requesterMobile.trim(),
    }, tx);
    if (!result.count) throw new Error("SEARCH_REQUEST_NOT_FOUND");
    return tx.propertySearchRequest.findUniqueOrThrow({ where: { id: requestId } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function deleteOwnAgentSearchRequestService(actor: AuthorizationActor, requestId: string) {
  return prisma.$transaction(async (tx) => {
    const verified = await getVerifiedAgentActor(tx, actor);
    const existing = await findAgentSearchRequestOwner(requestId, actor.id, tx);
    if (!existing) throw new Error("SEARCH_REQUEST_NOT_FOUND");
    const allowed = await authorize("searchRequest", "MANAGE_OWN", {
      actor: verified.actor,
      resource: {
        id: existing.id,
        status: existing.status,
        data: {
          isCreator: existing.createdByUserId === actor.id,
          createdByRole: existing.createdByRole,
          status: existing.status,
          isVerifiedAgent: true,
        },
      },
    });
    if (!allowed) throw new Error("SEARCH_REQUEST_MANAGEMENT_FORBIDDEN");
    const result = await deleteAgentSearchRequest(requestId, actor.id, tx);
    if (!result.count) throw new Error("SEARCH_REQUEST_NOT_FOUND");
    return { deleted: true };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function getAllAgentSearchRequestsService(actor: AuthorizationActor) {
  const verified = await prisma.$transaction(async (tx) => getVerifiedAgentActor(tx, actor));
  const allowed = await authorize("searchRequest", "MARKETPLACE_LIST", {
    actor: verified.actor,
    resource: { status: "ACTIVE", data: { status: "ACTIVE", isVerifiedAgent: true } },
  });
  if (!allowed) throw new Error("SEARCH_REQUEST_MARKETPLACE_FORBIDDEN");
  const rows = await findActiveAgentSearchRequests();
  return rows.map((row) => requestData(row, actor.id));
}
