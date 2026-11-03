import { findPropertyById } from "../repository/propertyRepository";

/** بررسی اعتبار تأیید آگهی بر اساس مهلت ذخیره‌شده در PropertyListing. */
export async function checkPropertyConfirmation(propertyId: string) {
  const property = await findPropertyById(propertyId);
  if (!property) throw new Error("ملک مورد نظر پیدا نشد.");

  const confirmUntil = property.listing?.confirmUntil ?? null;
  if (!confirmUntil) {
    return { isExpired: false, needsConfirmation: false, confirmUntil: null };
  }

  const isExpired = confirmUntil <= new Date();
  return { isExpired, needsConfirmation: isExpired, confirmUntil };
}
