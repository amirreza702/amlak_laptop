/**
 * تأیید نهایی مشاور توسط مالک مرتبط با ملک.
 * تمام تصمیم‌های دسترسی به ملک از Authorization Core گرفته می‌شوند.
 */

import { Prisma, PropertyHistoryAction } from "@prisma/client";
import type { AuthorizationActor } from "../../../shared/authorization/authorization.types";
import { prisma } from "../../../lib/prisma";
import { authorize } from "../../../shared/authorization/authorization.core";
import { findOwnerProfileByUserId } from "../../owner/repository/ownerRepository";
import { authorizePropertyAction } from "./propertyAuthorizationService";
import { findPropertyAuthorizationContextById } from "../repository/propertyRepository";
import { findPropertyAgent } from "../repository/propertyAgentRepository";
import { createPropertyHistory } from "../repository/propertyHistoryRepository";

export interface ApprovePropertyAgentInput {
  propertyId: string;
  agentId: string;
  actor: AuthorizationActor;
}

export async function approvePropertyAgentByOwnerService(
  data: ApprovePropertyAgentInput,
) {
  const owner = await findOwnerProfileByUserId(data.actor.id);
  if (!owner) throw new Error("OWNER_PROFILE_NOT_FOUND");

  return prisma.$transaction(async (tx) => {
    // Context کامل مالکیت و وضعیت ملک از Repository تهیه می‌شود.
    const property = await findPropertyAuthorizationContextById(data.propertyId, tx);
    if (!property) throw new Error("ملک مورد نظر پیدا نشد.");

    const canManage = await authorizePropertyAction(
      data.actor,
      "MANAGE",
      property,
    );
    if (!canManage) throw new Error("این مالک به ملک مورد نظر متصل نیست.");

    const propertyAgent = await findPropertyAgent(data.propertyId, data.agentId, tx);
    if (!propertyAgent) throw new Error("این مشاور به ملک مورد نظر متصل نیست.");

    const agentProfile = await tx.agent.findUnique({
      where: { id: data.agentId },
      select: { userId: true, verificationStatus: true },
    });
    if (!agentProfile || agentProfile.verificationStatus !== "VERIFIED") {
      throw new Error("AGENT_NOT_VERIFIED");
    }
    if (propertyAgent.approvedByOwner && propertyAgent.status === "ACTIVE") {
      throw new Error("این مشاور قبلاً توسط مالک تأیید شده است.");
    }

    // پذیرش باید متعلق به همین مالک، همین ملک و همین درخواست فعال باشد.
    const acceptedRequest = await tx.ownerAgentRequestResponse.findFirst({
      where: {
        agentId: data.agentId,
        status: "ACCEPTED",
        ownerRequest: {
          is: {
            propertyId: data.propertyId,
            ownerId: owner.id,
            status: "ACTIVE",
          },
        },
      },
      select: { id: true },
    });
    const confirmUntil = property.listing?.confirmUntil
      ? new Date(property.listing.confirmUntil)
      : null;
    const isPropertyExpired =
      property.listing?.status === "EXPIRED" ||
      (property.listing?.status === "PUBLISHED" &&
        (!confirmUntil || confirmUntil.getTime() <= Date.now()));

    const canApproveAgent = await authorize("ownerAgentRequest", "APPROVE_AGENT", {
      actor: data.actor,
      resource: {
        id: acceptedRequest?.id,
        status: "ACTIVE",
        data: {
          isOwner: true,
          isAgentAccepted: Boolean(acceptedRequest),
          isAgentVerified: agentProfile.verificationStatus === "VERIFIED",
          isPropertyActive: property.isActive === true,
          isPropertyDeleted: Boolean(property.deletedAt),
          isPropertyExpired,
          status: "ACTIVE",
        },
      },
    });
    if (!canApproveAgent) {
      throw new Error("این مشاور درخواست همکاری فعال این ملک را نپذیرفته است.");
    }

    // پیش از اعطای تأیید جدید، تأیید قبلی در همان Transaction لغو می‌شود.
    await tx.propertyAgent.updateMany({
      where: { propertyId: data.propertyId, approvedByOwner: true },
      data: { approvedByOwner: false, approvedByOwnerId: null, approvedAt: null },
    });

    const updatedPropertyAgent = await tx.propertyAgent.update({
      where: { propertyId_agentId: { propertyId: data.propertyId, agentId: data.agentId } },
      data: {
        status: "ACTIVE",
        approvedByOwner: true,
        approvedByOwnerId: owner.id,
        approvedAt: new Date(),
      },
    });

    await createPropertyHistory({
      propertyId: data.propertyId,
      action: PropertyHistoryAction.LISTING_CHANGED,
      field: "propertyAgent.approvedByOwner",
      oldValue: "false",
      newValue: "true",
      performedBy: owner.id,
      reason: "تأیید نهایی مشاور توسط مالک؛ تأیید مشاور قبلی در صورت وجود لغو شد",
    }, tx);

    const [ownerDetails, propertyDetails] = await Promise.all([
      tx.owner.findUnique({
        where: { id: owner.id },
        select: { firstName: true, lastName: true, user: { select: { mobile: true } } },
      }),
      tx.property.findUnique({
        where: { id: data.propertyId },
        select: { propertyType: true, city: true, district: true },
      }),
    ]);

    if (agentProfile.userId) {
      const actorName = ownerDetails ? ownerDetails.firstName + " " + ownerDetails.lastName : "مالک";
      await tx.notification.create({
        data: {
          userId: agentProfile.userId,
          title: "تأیید نهایی همکاری",
          message: `مالک ${actorName} با شماره ${ownerDetails?.user.mobile ?? "ثبت‌نشده"} همکاری شما را برای این ملک تأیید نهایی کرد.`,
          details: {
            actorName,
            actorMobile: ownerDetails?.user.mobile ?? null,
            actorRole: "OWNER",
            action: "تأیید نهایی همکاری مشاور",
            subject: propertyDetails
              ? `${propertyDetails.propertyType} در ${propertyDetails.city}، ${propertyDetails.district}`
              : "ملک",
            subjectType: "ملک",
            occurredAt: new Date().toISOString(),
          },
        },
      });
    }

    return updatedPropertyAgent;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
