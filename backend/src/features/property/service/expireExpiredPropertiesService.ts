import { ListingStatus, PropertyHistoryAction, UserRole } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { findExpiredProperties } from "../repository/propertyRepository";
import { authorize } from "../../../shared/authorization/authorization.core";

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
        select: { id: true, mobile: true, role: true, isActive: true, isSuperAdmin: true, adminPermissions: true },
      })
    : null;

  if (input.performedBy) {
    const allowed = Boolean(actor) && await authorize("admin", "PERMISSION", {
      actor: { id: actor!.id, role: actor!.role, isActive: actor!.isActive },
      resource: { data: {
        isActive: actor!.isActive,
        isSuperAdmin: actor!.isSuperAdmin,
        permissions: actor!.adminPermissions,
      } },
      metadata: { permission: "PROPERTIES_MANAGE" },
    });
    if (!allowed) throw new Error("HASHTI_PERMISSION_REQUIRED");
  }
  if (input.force && (!actor || !input.propertyId)) throw new Error("HASHTI_PERMISSION_REQUIRED");

  const expiredProperties = await findExpiredProperties(now, input.propertyId, input.force === true);
  let expiredCount = 0;

  for (const property of expiredProperties) {
    if (!property.listing) continue;

    const changed = await prisma.$transaction(async (tx) => {
      if (input.performedBy) {
        const freshActor = await tx.user.findUnique({
          where: { id: input.performedBy },
          select: { id: true, role: true, isActive: true, isSuperAdmin: true, adminPermissions: true },
        });
        const freshAllowed = Boolean(freshActor) && await authorize("admin", "PERMISSION", {
          actor: { id: freshActor!.id, role: freshActor!.role, isActive: freshActor!.isActive },
          resource: { data: {
            isActive: freshActor!.isActive,
            isSuperAdmin: freshActor!.isSuperAdmin,
            permissions: freshActor!.adminPermissions,
          } },
          metadata: { permission: "PROPERTIES_MANAGE" },
        });
        if (!freshAllowed) throw new Error("HASHTI_PERMISSION_REQUIRED");
      }

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
