/**
 * ============================================================
 * Expire Expired Properties Service
 * ============================================================
 *
 * این Service برای منقضی کردن گروهی ملک‌هایی است
 * که مهلت تأیید آنها (`confirmUntil`) گذشته است.
 *
 * جریان:
 *
 * Repository
 *     ↓
 * پیدا کردن ملک‌های منقضی‌شده
 *     ↓
 * بررسی Listing
 *     ↓
 * تغییر وضعیت به EXPIRED
 *     ↓
 * ثبت expiredAt
 *
 * این Service بعداً توسط Job/Cron فراخوانی خواهد شد.
 */

import {
  ListingStatus,
} from "@prisma/client";

import {
  findExpiredProperties,
} from "../repository/propertyRepository";

import {
  updatePropertyListing,
} from "../repository/propertyListingRepository";

/**
 * منقضی کردن تمام Listingهایی که
 * مهلت تأیید ملک آنها گذشته است.
 */
export async function expireExpiredProperties() {
  /**
   * ملک‌هایی که:
   *
   * confirmUntil <= now
   * و
   * Listing آنها PUBLISHED است
   *
   * توسط Repository پیدا می‌شوند.
   */
  const expiredProperties =
    await findExpiredProperties();

  /**
   * اگر هیچ ملکی منقضی نشده باشد،
   * کاری انجام نمی‌دهیم.
   */
  if (expiredProperties.length === 0) {
    return {
      processedCount: 0,
      expiredCount: 0,
    };
  }

  let expiredCount = 0;

  /**
   * هر ملک منقضی‌شده را پردازش می‌کنیم.
   */
  for (const property of expiredProperties) {
    /**
     * چون Repository فقط Listingهای PUBLISHED
     * را برگردانده، Listing باید وجود داشته باشد.
     *
     * با این حال برای حفظ ایمنی کد،
     * وجود آن را بررسی می‌کنیم.
     */
    if (!property.listing) {
      continue;
    }

    /**
     * تغییر وضعیت Listing به EXPIRED
     *
     * و ثبت زمان انقضا.
     */
    await updatePropertyListing(
      property.listing.id,
      {
        status: ListingStatus.EXPIRED,
        expiredAt: new Date(),
      }
    );

    expiredCount++;
  }

  return {
    processedCount: expiredProperties.length,
    expiredCount,
  };
}