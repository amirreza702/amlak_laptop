/**
 * ============================================================
 * Property Listing Repository
 * ============================================================
 *
 * مسئول دسترسی مستقیم به جدول PropertyListing در دیتابیس.
 *
 * قیمت فعلی ملک در PropertyListing نگهداری می‌شود.
 *
 * منطق Business مربوط به قیمت و PriceHistory
 * در Service قرار دارد، نه Repository.
 *
 * این Repository قابلیت اجرای عملیات داخل
 * Prisma Transaction را نیز دارد.
 *
 * ============================================================
 */

import { prisma } from "../../../lib/prisma";

import type {
  Prisma,
  PropertyListing,
} from "@prisma/client";

/**
 * ============================================================
 * نوع Client دیتابیس
 * ============================================================
 *
 * در حالت عادی:
 *
 * prisma
 *
 * و داخل Transaction:
 *
 * transaction
 *
 * هر دو این APIهای موردنیاز Repository را دارند.
 *
 * بنابراین Repository می‌تواند با هر دو کار کند.
 * ============================================================
 */
type DatabaseClient =
  | typeof prisma
  | Prisma.TransactionClient;

/**
 * ============================================================
 * پیدا کردن Listing بر اساس Property ID
 * ============================================================
 */
export const findPropertyListingByPropertyId = async (
  propertyId: string,
  db: DatabaseClient = prisma
): Promise<PropertyListing | null> => {
  return db.propertyListing.findUnique({
    where: {
      propertyId,
    },
  });
};

/**
 * ============================================================
 * ایجاد PropertyListing
 * ============================================================
 */
export const createPropertyListing = async (
  data: Parameters<
    typeof prisma.propertyListing.create
  >[0]["data"],
  db: DatabaseClient = prisma
): Promise<PropertyListing> => {
  return db.propertyListing.create({
    data,
  });
};

/**
 * ============================================================
 * تغییر PropertyListing
 * ============================================================
 */
export const updatePropertyListing = async (
  id: string,
  data: Parameters<
    typeof prisma.propertyListing.update
  >[0]["data"],
  db: DatabaseClient = prisma
): Promise<PropertyListing> => {
  return db.propertyListing.update({
    where: {
      id,
    },
    data,
  });
};