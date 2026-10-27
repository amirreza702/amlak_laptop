import { prisma } from "../../../lib/prisma";

import {
  findPropertyArchive,
} from "../repository/propertyArchiveRepository";

import { findPropertyById } from "../repository/propertyRepository";

import type { PropertyArchive } from "../types/propertyArchive";

import { PropertyHistoryAction } from "@prisma/client";

/**
 * ============================================================
 * Archive Property Service
 * ============================================================
 *
 * جریان آرشیو:
 *
 * Property
 *   ↓
 * ایجاد PropertyArchive
 *   ↓
 * حذف اطلاعات مصرفی:
 *   ├── PropertyListing
 *   ├── PropertyMedia
 *   └── VirtualTour360
 *   ↓
 * غیرفعال کردن Property
 *   ↓
 * ثبت PropertyHistory با action = ARCHIVED
 *
 * تمام عملیات داخل یک Transaction انجام می‌شوند.
 *
 * نکته:
 * اطلاعات تاریخی و آماری ملک حذف نمی‌شوند:
 *
 * - PropertyOwner
 * - PropertyAgent
 * - PropertyHistory
 * - PriceHistory
 * - VerificationCase
 * - VerificationDocument
 * - DuplicateReview
 * - ExactLocationAccessLog
 * - PropertyArchive
 *
 * فقط اطلاعات مصرفی و حجیم حذف می‌شوند.
 */
export interface ArchivePropertyInput {
  propertyId: string;
  archivedReason?: string | null;
}

export const archivePropertyService = async (
  data: ArchivePropertyInput
): Promise<PropertyArchive> => {
  /**
   * ابتدا وجود ملک را بررسی می‌کنیم.
   */
  const property = await findPropertyById(data.propertyId);

  if (!property) {
    throw new Error("ملک مورد نظر پیدا نشد.");
  }

  /**
   * اگر قبلاً آرشیو شده باشد، دوباره آرشیو نمی‌کنیم.
   */
  const existingArchive = await findPropertyArchive(
    data.propertyId
  );

  if (existingArchive) {
    throw new Error("این ملک قبلاً آرشیو شده است.");
  }

  /**
   * آرشیو، حذف اطلاعات مصرفی، غیرفعال‌سازی ملک
   * و ثبت تاریخچه باید یک عملیات اتمیک باشند.
   */
  const archive = await prisma.$transaction(async (tx) => {
    /**
     * --------------------------------------------------------
     * 1. ایجاد Snapshot آرشیو
     * --------------------------------------------------------
     */
    const createdArchive = await tx.propertyArchive.create({
      data: {
        propertyId: property.id,
        propertyType: property.propertyType,
        city: property.city,
        district: property.district,
        transactionType:
          property.listing?.transactionType ?? null,
        archivedReason:
          data.archivedReason ?? null,
      },
    });

    /**
     * --------------------------------------------------------
     * 2. حذف اطلاعات آگهی فعلی
     * --------------------------------------------------------
     *
     * PropertyListing اطلاعات وضعیت فعلی آگهی است.
     * سابقه تغییرات مهم آن در PropertyHistory باقی می‌ماند.
     */
    await tx.propertyListing.deleteMany({
      where: {
        propertyId: property.id,
      },
    });

  

    /**
     * --------------------------------------------------------
     * 3. حذف رسانه‌های ملک
     * --------------------------------------------------------
     *
     * تصاویر و Floor Plan ارزش تاریخی مستقلی ندارند
     * و برای آزادسازی فضای ذخیره‌سازی حذف می‌شوند.
     */
    await tx.propertyMedia.deleteMany({
      where: {
        propertyId: property.id,
      },
    });

    /**
     * --------------------------------------------------------
     * 4. حذف تورهای 360 درجه
     * --------------------------------------------------------
     *
     * VirtualTour360 اطلاعات مصرفی/حجیم است.
     *
     * با حذف VirtualTour360، رکوردهای TourOrder وابسته
     * نیز به دلیل onDelete: Cascade حذف خواهند شد.
     */
    await tx.virtualTour360.deleteMany({
      where: {
        propertyId: property.id,
      },
    });

    /**
     * --------------------------------------------------------
     * 5. غیرفعال کردن ملک
     * --------------------------------------------------------
     */
    await tx.property.update({
      where: {
        id: property.id,
      },
      data: {
        isActive: false,
      },
    });

    /**
     * --------------------------------------------------------
     * 6. ثبت رویداد آرشیو
     * --------------------------------------------------------
     */
    await tx.propertyHistory.create({
      data: {
        propertyId: property.id,
        action: PropertyHistoryAction.ARCHIVED,
        field: "isActive",
        oldValue: "true",
        newValue: "false",
        reason:
          data.archivedReason ??
          "آرشیو ملک",
      },
    });

    return createdArchive;
  });

  return archive;
};

/**
 * ============================================================
 * Get Property Archive
 * ============================================================
 */
export const getPropertyArchiveService = async (
  propertyId: string
): Promise<PropertyArchive> => {
  const archive = await findPropertyArchive(propertyId);

  if (!archive) {
    throw new Error("آرشیو این ملک پیدا نشد.");
  }

  return archive;
};

/**
 * ============================================================
 * Restore Property
 * ============================================================
 *
 * نکته مهم:
 *
 * هنگام Restore:
 *
 * - Property دوباره فعال می‌شود.
 * - PropertyArchive حذف می‌شود.
 * - History ثبت می‌شود.
 *
 * اطلاعات مصرفی حذف‌شده هنگام Archive
 * برنمی‌گردند و باید در صورت نیاز دوباره ایجاد شوند.
 */
export const restorePropertyService = async (
  propertyId: string
): Promise<PropertyArchive> => {
  const archive = await findPropertyArchive(propertyId);

  if (!archive) {
    throw new Error("آرشیو این ملک پیدا نشد.");
  }

  const restoredArchive = await prisma.$transaction(
    async (tx) => {
      /**
       * فعال کردن مجدد ملک
       */
      await tx.property.update({
        where: {
          id: propertyId,
        },
        data: {
          isActive: true,
        },
      });

      /**
       * ثبت تاریخچه بازگردانی
       */
      await tx.propertyHistory.create({
        data: {
          propertyId,
          action: PropertyHistoryAction.RESTORED,
          field: "isActive",
          oldValue: "false",
          newValue: "true",
          reason: "بازگردانی ملک از آرشیو",
        },
      });

      /**
       * حذف رکورد آرشیو
       */
      await tx.propertyArchive.delete({
        where: {
          propertyId,
        },
      });

      return archive;
    }
  );

  return restoredArchive;
};