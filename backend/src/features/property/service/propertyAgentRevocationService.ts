/**
 * ============================================================
 * Property Agent Revocation Service
 * ============================================================
 *
 * لغو همکاری Agent با Property توسط Owner
 *
 * جریان:
 *
 * Owner
 *   ↓
 * بررسی Property
 *   ↓
 * بررسی PropertyOwner
 *   ↓
 * بررسی VERIFIED بودن Owner
 *   ↓
 * بررسی PropertyAgent
 *   ↓
 * ACTIVE → REVOKED
 *   ↓
 * ثبت PropertyHistory
 */

import {
  PropertyAgentStatus,
  VerificationStatus,
  PropertyHistoryAction,
} from "@prisma/client";

import {
  findPropertyAgent,
} from "../repository/propertyAgentRepository";

import {
  findPropertyById,
} from "../repository/propertyRepository";

import {
  findPropertyOwner,
} from "../repository/propertyOwnerRepository";

import {
  createPropertyHistory,
} from "../repository/propertyHistoryRepository";

import { prisma } from "../../../lib/prisma";

export interface RevokePropertyAgentInput {
  propertyId: string;
  agentId: string;
  ownerId: string;
}

export async function revokePropertyAgent(
  data: RevokePropertyAgentInput
) {
  /**
   * ----------------------------------------------------------
   * 1. بررسی وجود ملک
   * ----------------------------------------------------------
   */

  const property = await findPropertyById(
    data.propertyId
  );

  if (!property) {
    throw new Error(
      "ملک مورد نظر پیدا نشد."
    );
  }

  /**
   * ----------------------------------------------------------
   * 2. بررسی ارتباط مالک با ملک
   * ----------------------------------------------------------
   *
   * دسترسی به PropertyOwner از طریق Repository انجام می‌شود.
   */

  const propertyOwner =
    await findPropertyOwner(
      data.propertyId,
      data.ownerId
    );

  if (!propertyOwner) {
    throw new Error(
      "این مالک به ملک مورد نظر متصل نیست."
    );
  }

  /**
   * ----------------------------------------------------------
   * 3. مالک باید VERIFIED باشد
   * ----------------------------------------------------------
   */

  if (
    propertyOwner.verificationStatus !==
    VerificationStatus.VERIFIED
  ) {
    throw new Error(
      "مالک هنوز توسط هشتی تأیید نشده است."
    );
  }

  /**
   * ----------------------------------------------------------
   * 4. بررسی ارتباط مشاور با ملک
   * ----------------------------------------------------------
   */

  const propertyAgent =
    await findPropertyAgent(
      data.propertyId,
      data.agentId
    );

  if (!propertyAgent) {
    throw new Error(
      "این مشاور به ملک مورد نظر متصل نیست."
    );
  }

  /**
   * ----------------------------------------------------------
   * 5. فقط Agent فعال قابل لغو است
   * ----------------------------------------------------------
   */

  if (
    propertyAgent.status ===
    PropertyAgentStatus.REVOKED
  ) {
    throw new Error(
      "همکاری این مشاور با ملک قبلاً لغو شده است."
    );
  }

  /**
   * ----------------------------------------------------------
   * 6. تغییر وضعیت + ثبت History
   *
   * هر دو عملیات داخل یک Transaction هستند.
   * ----------------------------------------------------------
   */

  return prisma.$transaction(async (tx) => {
    const updatedPropertyAgent =
      await tx.propertyAgent.update({
        where: {
          propertyId_agentId: {
            propertyId: data.propertyId,
            agentId: data.agentId,
          },
        },
        data: {
          status: PropertyAgentStatus.REVOKED,
          approvedByOwner: false,
          approvedAt: null,
        },
      });

    await createPropertyHistory(
      {
        propertyId: data.propertyId,
        action:
          PropertyHistoryAction.LISTING_CHANGED,
        field: "propertyAgent.status",
        oldValue: propertyAgent.status,
        newValue: PropertyAgentStatus.REVOKED,
        performedBy: data.ownerId,
        reason:
          "لغو همکاری مشاور توسط مالک",
      },
      tx
    );

    const [agent, owner, propertyDetails] = await Promise.all([
      tx.agent.findUnique({ where: { id: data.agentId }, select: { userId: true } }),
      tx.owner.findUnique({ where: { id: data.ownerId }, select: { firstName: true, lastName: true, user: { select: { mobile: true } } } }),
      tx.property.findUnique({ where: { id: data.propertyId }, select: { propertyType: true, city: true, district: true } }),
    ]);
    if (agent?.userId) {
      const actorName = owner ? owner.firstName + " " + owner.lastName : "مالک";
      await tx.notification.create({
        data: {
          userId: agent.userId,
          title: "لغو همکاری توسط مالک",
          message: `مالک ${actorName} با شماره ${owner?.user.mobile ?? "ثبت‌نشده"} همکاری شما را برای این ملک لغو کرد.`,
          details: {
            actorName,
            actorMobile: owner?.user.mobile ?? null,
            actorRole: "OWNER",
            action: "لغو همکاری مشاور",
            subject: propertyDetails ? `${propertyDetails.propertyType} در ${propertyDetails.city}، ${propertyDetails.district}` : "ملک",
            subjectType: "ملک",
            occurredAt: new Date().toISOString(),
          },
        },
      });
    }

    return updatedPropertyAgent;
  });
}

/**
 * لغو رابطه همکاری توسط خود مشاور از پنل مدیریت مالک.
 * این عمل تأیید نهایی را نیز باطل و مالک مرتبط را مطلع می‌کند.
 */
export async function revokePropertyAgentByAgent(propertyId: string, userId: string) {
  const agent = await prisma.agent.findUnique({ where: { userId }, select: { id: true } });
  if (!agent) throw new Error("AGENT_PROFILE_NOT_FOUND");

  const relation = await prisma.propertyAgent.findUnique({
    where: { propertyId_agentId: { propertyId, agentId: agent.id } },
    select: {
      status: true,
      approvedByOwner: true,
      property: {
        select: {
          owners: {
            select: {
              owner: { select: { userId: true, firstName: true, lastName: true } },
            },
          },
        },
      },
    },
  });
  if (!relation || relation.status !== PropertyAgentStatus.ACTIVE || !relation.approvedByOwner) {
    throw new Error("APPROVED_AGENT_RELATION_NOT_FOUND");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.propertyAgent.update({
      where: { propertyId_agentId: { propertyId, agentId: agent.id } },
      data: {
        status: PropertyAgentStatus.REVOKED,
        approvedByOwner: false,
        approvedAt: null,
      },
    });

    await createPropertyHistory(
      {
        propertyId,
        action: PropertyHistoryAction.LISTING_CHANGED,
        field: "propertyAgent.status",
        oldValue: PropertyAgentStatus.ACTIVE,
        newValue: PropertyAgentStatus.REVOKED,
        performedBy: userId,
        reason: "مشاور، رابطه همکاری تأییدشده را لغو کرد.",
      },
      tx
    );

    const [ownerUserIds, propertyDetails] = await Promise.all([
      Promise.resolve([...new Set(relation.property.owners.map((item) => item.owner.userId))]),
      tx.property.findUnique({ where: { id: propertyId }, select: { propertyType: true, city: true, district: true } }),
    ]);
    const actorProfile = await tx.agent.findUnique({
      where: { id: agent.id },
      select: { firstName: true, lastName: true, user: { select: { mobile: true } } },
    });
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
            subject: propertyDetails ? `${propertyDetails.propertyType} در ${propertyDetails.city}، ${propertyDetails.district}` : "ملک",
            subjectType: "ملک",
            occurredAt: new Date().toISOString(),
          },
        })),
      });
    }

    return updated;
  });
}
