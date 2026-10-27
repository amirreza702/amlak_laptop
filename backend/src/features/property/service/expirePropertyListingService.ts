import {
  ListingStatus,
} from "@prisma/client";
import { PropertyHistoryAction, UserRole } from "@prisma/client";
import { prisma } from "../../../lib/prisma";

import {
  findPropertyById,
} from "../repository/propertyRepository";

import {
  findPropertyListingByPropertyId,
  updatePropertyListing,
} from "../repository/propertyListingRepository";

/**
 * بررسی می‌کند که آیا اعتبار تأیید ملک تمام شده
 * و در صورت نیاز Listing را منقضی می‌کند.
 *
 * منطق:
 *
 * Property.confirmUntil
 *        ↓
 * آیا تاریخ گذشته؟
 *        ↓
 *       بله
 *        ↓
 * Listing → EXPIRED
 */
export async function expirePropertyListing(
  propertyId: string,
  performedBy?: string
) {
  const property =
    await findPropertyById(propertyId);

  if (!property) {
    throw new Error(
      "ملک مورد نظر پیدا نشد."
    );
  }

  const listing =
    await findPropertyListingByPropertyId(
      propertyId
    );

  if (!listing) {
    throw new Error(
      "برای این ملک اطلاعات معامله ثبت نشده است."
    );
  }

  /**
   * اگر ملک هنوز مهلت تأیید ندارد،
   * چیزی برای منقضی کردن وجود ندارد.
   */
  if (!property.confirmUntil) {
    return {
      expired: false,
      statusChanged: false,
      listing,
      confirmUntil: null,
    };
  }

  const now = new Date();

  /**
   * اگر هنوز زمان تأیید تمام نشده باشد،
   * Listing را تغییر نمی‌دهیم.
   */
  if (property.confirmUntil > now) {
    return {
      expired: false,
      statusChanged: false,
      listing,
      confirmUntil: property.confirmUntil,
    };
  }

  /**
   * فقط Listingهایی که در وضعیت PUBLISHED هستند
   * با پایان اعتبار ملک، EXPIRED می‌شوند.
   *
   * اگر مثلاً قبلاً PAUSED یا SOLD شده باشد،
   * نباید وضعیت آن را به EXPIRED تغییر دهیم.
   */
  if (listing.status !== ListingStatus.PUBLISHED) {
    return {
      expired: true,
      statusChanged: false,
      listing,
      confirmUntil: property.confirmUntil,
    };
  }

  if (performedBy) {
    return prisma.$transaction(async (tx) => {
      const actor = await tx.user.findUnique({
        where: { id: performedBy },
        select: { id: true, mobile: true, role: true, isActive: true },
      });
      if (!actor || actor.role !== UserRole.HASHTI || !actor.isActive) {
        throw new Error("HASHTI_PERMISSION_REQUIRED");
      }

      const updatedListing = await tx.propertyListing.update({
        where: { id: listing.id },
        data: {
          status: ListingStatus.EXPIRED,
          expiredAt: now,
        },
      });

      await tx.propertyHistory.create({
        data: {
          propertyId,
          action: PropertyHistoryAction.LISTING_CHANGED,
          field: "listing.status",
          oldValue: listing.status,
          newValue: ListingStatus.EXPIRED,
          performedBy: actor.id,
          reason: "انقضای آگهی توسط هشتی پس از پایان مهلت تأیید ملک",
        },
      });

      await tx.adminAuditLog.create({
        data: {
          actorUserId: actor.id,
          actorMobile: actor.mobile,
          actorRole: UserRole.HASHTI,
          action: "PROPERTY_LISTING_EXPIRED_BY_HASHTI",
          targetType: "PROPERTY_LISTING",
          targetId: listing.id,
          details: {
            propertyId,
            previousStatus: listing.status,
            newStatus: ListingStatus.EXPIRED,
            confirmUntil: property.confirmUntil?.toISOString() ?? null,
            previousExpiredAt: listing.expiredAt?.toISOString() ?? null,
            newExpiredAt: now.toISOString(),
          },
        },
      });

      return {
        expired: true,
        statusChanged: true,
        listing: updatedListing,
        confirmUntil: property.confirmUntil,
      };
    }, { isolationLevel: "Serializable" });
  }

  const updatedListing =
    await updatePropertyListing(
      listing.id,
      {
        status: ListingStatus.EXPIRED,
        expiredAt: now,
      }
    );

  return {
    expired: true,
    statusChanged: true,
    listing: updatedListing,
    confirmUntil: property.confirmUntil,
  };
}