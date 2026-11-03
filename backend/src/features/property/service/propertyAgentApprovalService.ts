/**
 * ============================================================
 * Property Agent Approval Service
 * ============================================================
 *
 * تأیید مشاور توسط مالک
 *
 * در هر ملک فقط یک ارتباط ACTIVE می‌تواند تأیید نهایی مالک را
 * داشته باشد. تأیید مشاور جدید، تأیید قبلی را لغو می‌کند؛
 * اما ارتباط و سوابق مشاور قبلی حذف نمی‌شود.
 */

import { Prisma, PropertyHistoryAction } from "@prisma/client";

import { findPropertyAgent } from "../repository/propertyAgentRepository";
import { findPropertyById } from "../repository/propertyRepository";
import { findPropertyOwner } from "../repository/propertyOwnerRepository";
import { createPropertyHistory } from "../repository/propertyHistoryRepository";
import { prisma } from "../../../lib/prisma";

export interface ApprovePropertyAgentInput {
  propertyId: string;
  agentId: string;
  ownerId: string;
}

export async function approvePropertyAgentByOwnerService(
  data: ApprovePropertyAgentInput
) {
  const property = await findPropertyById(data.propertyId);
  if (!property) {
    throw new Error("ملک مورد نظر پیدا نشد.");
  }

  const propertyOwner = await findPropertyOwner(data.propertyId, data.ownerId);
  if (!propertyOwner) {
    throw new Error("این مالک به ملک مورد نظر متصل نیست.");
  }

  const propertyAgent = await findPropertyAgent(data.propertyId, data.agentId);
  if (!propertyAgent) {
    throw new Error("این مشاور به ملک مورد نظر متصل نیست.");
  }

  if (propertyAgent.approvedByOwner && propertyAgent.status === "ACTIVE") {
    throw new Error("این مشاور قبلاً توسط مالک تأیید شده است.");
  }

  const acceptedRequest = await prisma.ownerAgentRequestResponse.findFirst({
    where: {
      agentId: data.agentId,
      status: "ACCEPTED",
      ownerRequest: {
        is: {
          propertyId: data.propertyId,
          ownerId: data.ownerId,
          status: "ACTIVE",
        },
      },
    },
    select: { id: true },
  });

  if (!acceptedRequest) {
    throw new Error("این مشاور درخواست همکاری فعال این ملک را نپذیرفته است.");
  }

  return prisma.$transaction(
    async (tx) => {
      // ابتدا هر تأیید قبلی لغو می‌شود؛ سوابق و رابطه مشاور حفظ می‌شوند.
      await tx.propertyAgent.updateMany({
        where: {
          propertyId: data.propertyId,
          approvedByOwner: true,
        },
        data: {
          approvedByOwner: false,
          approvedByOwnerId: null,
          approvedAt: null,
        },
      });

      const updatedPropertyAgent = await tx.propertyAgent.update({
        where: {
          propertyId_agentId: {
            propertyId: data.propertyId,
            agentId: data.agentId,
          },
        },
        data: {
          status: "ACTIVE",
          approvedByOwner: true,
          approvedByOwnerId: data.ownerId,
          approvedAt: new Date(),
        },
      });

      await createPropertyHistory(
        {
          propertyId: data.propertyId,
          action: PropertyHistoryAction.LISTING_CHANGED,
          field: "propertyAgent.approvedByOwner",
          oldValue: "false",
          newValue: "true",
          performedBy: data.ownerId,
          reason: "تأیید نهایی مشاور توسط مالک؛ تأیید مشاور قبلی در صورت وجود لغو شد",
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
            title: "تأیید نهایی همکاری",
            message: `مالک ${actorName} با شماره ${owner?.user.mobile ?? "ثبت‌نشده"} همکاری شما را برای این ملک تأیید نهایی کرد.`,
            details: {
              actorName,
              actorMobile: owner?.user.mobile ?? null,
              actorRole: "OWNER",
              action: "تأیید نهایی همکاری مشاور",
              subject: propertyDetails ? `${propertyDetails.propertyType} در ${propertyDetails.city}، ${propertyDetails.district}` : "ملک",
              subjectType: "ملک",
              occurredAt: new Date().toISOString(),
            },
          },
        });
      }

      return updatedPropertyAgent;
    },
    {
      // از تأیید هم‌زمان دو مشاور برای یک ملک جلوگیری می‌کند.
      // قید یکتای پایگاه داده نیز این قانون را مستقل از لایه برنامه تضمین می‌کند.
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    }
  );
}
