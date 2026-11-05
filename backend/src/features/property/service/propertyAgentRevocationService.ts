/**
 * لغو همکاری مالک یا مشاور با ملک.
 * تصمیم مجوز در هر دو مسیر از Authorization Core گرفته می‌شود.
 */

import { Prisma, PropertyAgentStatus, PropertyHistoryAction } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { findOwnerProfileByUserId } from "../../owner/repository/ownerRepository";
import { findAgentProfileByUserId } from "../../agent/repository/agentRepository";
import { authorizePropertyAction } from "./propertyAuthorizationService";
import { findPropertyAuthorizationContextById } from "../repository/propertyRepository";
import { findPropertyAgent } from "../repository/propertyAgentRepository";
import { createPropertyHistory } from "../repository/propertyHistoryRepository";

export interface RevokePropertyAgentInput {
  propertyId: string;
  agentId: string;
  ownerUserId: string;
}

export async function revokePropertyAgent(data: RevokePropertyAgentInput) {
  const owner = await findOwnerProfileByUserId(data.ownerUserId);
  if (!owner) throw new Error("OWNER_PROFILE_NOT_FOUND");

  return prisma.$transaction(async (tx) => {
    const property = await findPropertyAuthorizationContextById(data.propertyId, tx);
    if (!property) throw new Error("ملک مورد نظر پیدا نشد.");

    const allowed = await authorizePropertyAction(
      { id: data.ownerUserId, role: "OWNER", isActive: true },
      "MANAGE",
      property,
    );
    if (!allowed) throw new Error("این مالک به ملک مورد نظر متصل نیست.");

    const propertyAgent = await findPropertyAgent(data.propertyId, data.agentId, tx);
    if (!propertyAgent) throw new Error("این مشاور به ملک مورد نظر متصل نیست.");
    if (propertyAgent.status === PropertyAgentStatus.REVOKED) {
      throw new Error("همکاری این مشاور با ملک قبلاً لغو شده است.");
    }

    const updated = await tx.propertyAgent.update({
      where: { propertyId_agentId: { propertyId: data.propertyId, agentId: data.agentId } },
      data: {
        status: PropertyAgentStatus.REVOKED,
        approvedByOwner: false,
        approvedByOwnerId: null,
        approvedAt: null,
      },
    });

    await createPropertyHistory({
      propertyId: data.propertyId,
      action: PropertyHistoryAction.LISTING_CHANGED,
      field: "propertyAgent.status",
      oldValue: propertyAgent.status,
      newValue: PropertyAgentStatus.REVOKED,
      performedBy: owner.id,
      reason: "لغو همکاری مشاور توسط مالک",
    }, tx);

    return updated;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

/** لغو رابطه تأییدشده توسط خود مشاور؛ مجوز رابطه از Policy مرکزی گرفته می‌شود. */
export async function revokePropertyAgentByAgent(propertyId: string, userId: string) {
  const agent = await findAgentProfileByUserId(userId);
  if (!agent) throw new Error("AGENT_PROFILE_NOT_FOUND");

  return prisma.$transaction(async (tx) => {
    const property = await findPropertyAuthorizationContextById(propertyId, tx);
    if (!property) throw new Error("APPROVED_AGENT_RELATION_NOT_FOUND");

    const allowed = await authorizePropertyAction(
      { id: userId, role: "AGENT", isActive: true },
      "REVOKE_OWN_RELATION",
      property,
    );
    if (!allowed) throw new Error("APPROVED_AGENT_RELATION_NOT_FOUND");

    const relation = await findPropertyAgent(propertyId, agent.id, tx);
    if (!relation || relation.status !== PropertyAgentStatus.ACTIVE || !relation.approvedByOwner) {
      throw new Error("APPROVED_AGENT_RELATION_NOT_FOUND");
    }

    const updated = await tx.propertyAgent.update({
      where: { propertyId_agentId: { propertyId, agentId: agent.id } },
      data: {
        status: PropertyAgentStatus.REVOKED,
        approvedByOwner: false,
        approvedByOwnerId: null,
        approvedAt: null,
      },
    });

    await createPropertyHistory({
      propertyId,
      action: PropertyHistoryAction.LISTING_CHANGED,
      field: "propertyAgent.status",
      oldValue: PropertyAgentStatus.ACTIVE,
      newValue: PropertyAgentStatus.REVOKED,
      performedBy: userId,
      reason: "مشاور، رابطه همکاری تأییدشده را لغو کرد.",
    }, tx);

    const [propertyDetails, actorProfile] = await Promise.all([
      tx.property.findUnique({
        where: { id: propertyId },
        select: { propertyType: true, city: true, district: true },
      }),
      tx.agent.findUnique({
        where: { id: agent.id },
        select: { firstName: true, lastName: true, user: { select: { mobile: true } } },
      }),
    ]);

    const ownerUserIds = [...new Set(
      property.owners?.map((item) => item.owner?.userId).filter((id): id is string => Boolean(id)) ?? [],
    )];

    if (ownerUserIds.length) {
      const actorName = [actorProfile?.firstName, actorProfile?.lastName].filter(Boolean).join(" ") || "مشاور";
      await tx.notification.createMany({
        data: ownerUserIds.map((ownerUserId) => ({
          userId: ownerUserId,
          title: "لغو همکاری مشاور",
          message: `مشاور ${actorName} با شماره ${actorProfile?.user.mobile ?? "ثبت‌نشده"} همکاری تأییدشده خود را برای این ملک لغو کرد.`,
          details: {
            actorName,
            actorMobile: actorProfile?.user.mobile ?? null,
            actorRole: "AGENT",
            action: "لغو همکاری تأییدشده",
            subject: propertyDetails
              ? `${propertyDetails.propertyType} در ${propertyDetails.city}، ${propertyDetails.district}`
              : "ملک",
            subjectType: "ملک",
            occurredAt: new Date().toISOString(),
          },
        })),
      });
    }

    return updated;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
