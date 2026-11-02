import { ListingStatus, PropertyHistoryAction, UserRole } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { findExpiredProperties } from "../repository/propertyRepository";

/**
 * تنها نقطه اجرای انقضای آگهی‌هاست؛ هم Job زمان‌بندی‌شده و هم
 * درخواست دستی هشتی از همین مسیر استفاده می‌کنند.
 */
export async function expireExpiredProperties(input: {
  propertyId?: string;
  performedBy?: string;
  force?: boolean;
} = {}) {
  const now = new Date();
  const actor = input.performedBy
    ? await prisma.user.findUnique({
        where: { id: input.performedBy },
        select: { id: true, mobile: true, role: true, isActive: true },
      })
    : null;

  if (input.performedBy && (!actor || actor.role !== UserRole.HASHTI || !actor.isActive)) {
    throw new Error("HASHTI_PERMISSION_REQUIRED");
  }
  if (input.force && (!actor || !input.propertyId)) throw new Error("HASHTI_PERMISSION_REQUIRED");

  const expiredProperties = await findExpiredProperties(now, input.propertyId, input.force === true);
  let expiredCount = 0;

  for (const property of expiredProperties) {
    if (!property.listing) continue;

    const changed = await prisma.$transaction(async (tx) => {
      const result = await tx.propertyListing.updateMany({
        where: { id: property.listing!.id, status: ListingStatus.PUBLISHED },
        data: { status: ListingStatus.EXPIRED, expiredAt: now },
      });
      if (result.count === 0) return false;

      const recipientIds = Array.from(new Set([
        property.createdByUserId,
        ...property.agents.map((relation) => relation.agent.userId),
      ].filter((id): id is string => Boolean(id))));

      if (recipientIds.length > 0) {
        await tx.notification.createMany({
          data: recipientIds.map((userId) => ({
            userId,
            title: "مهلت انتشار ملک به پایان رسید",
            message: `مهلت ۳۱ روزه انتشار ملک در ${property.city}، ${property.district} به پایان رسیده است. برای نمایش دوباره، آگهی را تمدید کنید.`,
            details: {
              action: "PROPERTY_LISTING_EXPIRED",
              propertyId: property.id,
              listingId: property.listing!.id,
              occurredAt: now.toISOString(),
            },
          })),
        });
      }

      await tx.propertyHistory.create({
        data: {
          propertyId: property.id,
          action: PropertyHistoryAction.LISTING_CHANGED,
          field: "listing.status",
          oldValue: ListingStatus.PUBLISHED,
          newValue: ListingStatus.EXPIRED,
          performedBy: actor?.id ?? null,
          reason: input.force ? "انقضای دستی آگهی توسط هشتی" : "پایان مهلت ۳۱ روزه انتشار آگهی",
        },
      });

      if (actor) {
        await tx.adminAuditLog.create({
          data: {
            actorUserId: actor.id,
            actorMobile: actor.mobile,
            actorRole: UserRole.HASHTI,
            action: input.force ? "PROPERTY_LISTING_EXPIRED_BY_HASHTI" : "PROPERTY_LISTING_EXPIRED",
            targetType: "PROPERTY_LISTING",
            targetId: property.listing!.id,
            details: {
              propertyId: property.id,
              previousStatus: ListingStatus.PUBLISHED,
              newStatus: ListingStatus.EXPIRED,
              expiredAt: now.toISOString(),
              forced: input.force === true,
            },
          },
        });
      }
      return true;
    });

    if (changed) expiredCount++;
  }

  return {
    processedCount: expiredProperties.length,
    expiredCount,
  };
}
