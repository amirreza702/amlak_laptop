import {
  ListingStatus,
  Prisma,
  PropertyHistoryAction,
} from "@prisma/client";

import { prisma } from "../../../lib/prisma";

import {
  findPropertyListingByPropertyId,
  updatePropertyListing,
} from "../repository/propertyListingRepository";

import {
  updateProperty,
} from "../repository/propertyRepository";

import {
  createPropertyHistory,
} from "../repository/propertyHistoryRepository";

import type {
  UpdatePropertyListingStatusInput,
} from "../types/updatePropertyListingStatus";

/**
 * وضعیت‌های مجاز برای تغییر Listing
 */
const allowedTransitions: Record<
  ListingStatus,
  ListingStatus[]
> = {
  // ثبت آگهی مستقیماً به صف بررسی هشتی می‌رود؛ تأیید مالک شرط انتشار نیست.
  [ListingStatus.DRAFT]: [
    ListingStatus.PENDING_HASHTI_VERIFICATION,
  ],

  [ListingStatus.PENDING_HASHTI_VERIFICATION]: [
    ListingStatus.PUBLISHED,
    ListingStatus.REJECTED,
  ],

  [ListingStatus.PUBLISHED]: [
    ListingStatus.PAUSED,
    ListingStatus.SOLD,
    ListingStatus.RENTED,
  ],

  [ListingStatus.REJECTED]: [
    ListingStatus.DRAFT,
  ],

  [ListingStatus.EXPIRED]: [
    ListingStatus.DRAFT,
  ],

  [ListingStatus.PAUSED]: [
    ListingStatus.PUBLISHED,
  ],

  [ListingStatus.SOLD]: [],

  [ListingStatus.RENTED]: [],
};

/**
 * مدت اعتبار تأیید ملک
 */
const PROPERTY_CONFIRMATION_DAYS = 31;

/**
 * محاسبه تاریخ پایان مهلت تأیید
 */
function calculateConfirmUntil(
  from: Date
): Date {
  const confirmUntil = new Date(from);

  confirmUntil.setDate(
    confirmUntil.getDate() +
      PROPERTY_CONFIRMATION_DAYS
  );

  return confirmUntil;
}

/**
 * بازگرداندن آگهی به صف بررسی هشتی پس از هر تغییر محتوای منتشرشده.
 * این تابع در تراکنش فراخوان قابل استفاده است و در نبود Listing کاری انجام نمی‌دهد.
 */
export async function queuePropertyListingForHashtiReview(
  propertyId: string,
  transaction?: Prisma.TransactionClient
) {
  const apply = async (tx: Prisma.TransactionClient) => {
    const listing = await findPropertyListingByPropertyId(propertyId, tx);
    if (!listing || listing.status === ListingStatus.PENDING_HASHTI_VERIFICATION) {
      return { queued: false, listing };
    }

    const updatedListing = await updatePropertyListing(
      listing.id,
      {
        status: ListingStatus.PENDING_HASHTI_VERIFICATION,
        publishedAt: null,
      },
      tx
    );
    await createPropertyHistory(
      {
        propertyId,
        action: PropertyHistoryAction.LISTING_CHANGED,
        field: "listing.status",
        oldValue: listing.status,
        newValue: ListingStatus.PENDING_HASHTI_VERIFICATION,
        reason: "تغییر اطلاعات آگهی؛ نیازمند بررسی مجدد هشتی پیش از انتشار",
      },
      tx
    );
    return { queued: true, listing: updatedListing };
  };

  return transaction ? apply(transaction) : prisma.$transaction(apply);
}

export async function updatePropertyListingStatus(
  propertyId: string,
  data: UpdatePropertyListingStatusInput,
) {
  const listing =
    await findPropertyListingByPropertyId(propertyId);

  if (!listing) {
    throw new Error(
      "برای این ملک اطلاعات معامله ثبت نشده است."
    );
  }

  /**
   * اگر وضعیت جدید با وضعیت فعلی یکی باشد،
   * هیچ تغییری انجام نمی‌دهیم.
   */
  if (listing.status === data.status) {
    return {
      listing,
      statusChanged: false,
    };
  }

  /**
   * بررسی Transition مجاز
   */
  const allowedStatuses =
    allowedTransitions[listing.status];
  if (!allowedStatuses.includes(data.status)) {
    throw new Error(
      `تغییر وضعیت از ${listing.status} به ${data.status} مجاز نیست.`
    );
  }

  const updateData: Parameters<
    typeof updatePropertyListing
  >[1] = {
    status: data.status,
  };

  /**
   * وقتی Listing منتشر می‌شود،
   * publishedAt ثبت می‌شود.
   */
  if (data.status === ListingStatus.PUBLISHED) {
    updateData.publishedAt =
      listing.publishedAt ?? new Date();
  }

  /**
   * تمام تغییرات وابسته به تغییر وضعیت
   * باید اتمیک باشند:
   *
   * 1. تغییر وضعیت Listing
   * 2. تغییر confirmUntil در صورت انتشار
   * 3. ثبت History
   */
  return prisma.$transaction(
    async (
      tx: Prisma.TransactionClient
    ) => {
      const updatedListing =
        await updatePropertyListing(
          listing.id,
          updateData,
          tx
        );

      let confirmUntil:
        Date | undefined;

      /**
       * انتشار Listing باعث می‌شود
       * اعتبار Property برای ۳۱ روز تنظیم شود.
       */
      if (
        data.status === ListingStatus.PUBLISHED
      ) {
        confirmUntil =
          calculateConfirmUntil(new Date());

        await updateProperty(
          propertyId,
          {
            confirmUntil,
          },
          tx
        );
      }

      /**
       * ثبت تغییر وضعیت Listing در History
       *
       * performedBy فعلاً NULL است،
       * چون قرارداد ورودی فعلی شناسه کاربر را دریافت نمی‌کند.
       */
      await createPropertyHistory(
        {
          propertyId,
          action:
            PropertyHistoryAction.LISTING_CHANGED,
          field: "listing.status",
          oldValue: listing.status,
          newValue: data.status,
          reason: "تغییر وضعیت آگهی",
        },
        tx
      );

      return {
        listing: updatedListing,
        statusChanged: true,
        ...(confirmUntil
          ? { confirmUntil }
          : {}),
      };
    }
  );
}