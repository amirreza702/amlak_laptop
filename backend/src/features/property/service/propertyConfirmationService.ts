import {
  findPropertyById,
} from "../repository/propertyRepository";

/**
 * بررسی می‌کند که اعتبار تأیید ملک تمام شده است یا نه.
 *
 * منطق:
 *
 * confirmUntil
 *      ↓
 * تاریخ گذشته؟
 *      ↓
 *    بله → نیاز به تأیید مجدد
 *    خیر → هنوز معتبر است
 */
export async function checkPropertyConfirmation(
  propertyId: string
) {
  const property = await findPropertyById(propertyId);

  if (!property) {
    throw new Error(
      "ملک مورد نظر پیدا نشد."
    );
  }

  /**
   * اگر confirmUntil هنوز تعیین نشده باشد،
   * فعلاً ملک را منقضی‌شده در نظر نمی‌گیریم.
   */
  if (!property.confirmUntil) {
    return {
      isExpired: false,
      needsConfirmation: false,
      confirmUntil: null,
    };
  }

  const now = new Date();

  const isExpired =
    property.confirmUntil <= now;

  return {
    isExpired,
    needsConfirmation: isExpired,
    confirmUntil: property.confirmUntil,
  };
}