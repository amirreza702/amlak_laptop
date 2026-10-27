import { prisma } from "../../../lib/prisma";

import type { PropertyMedia } from "@prisma/client";

/**
 * ============================================================
 * Create Property Media
 * ============================================================
 *
 * ثبت یک رسانه برای ملک.
 *
 * این تابع فقط مسئول ارتباط با دیتابیس است
 * و هیچ تصمیم Business در آن قرار نمی‌گیرد.
 */
export const createPropertyMedia = async (
  propertyId: string,
  type: PropertyMedia["type"],
  url: string,
  sortOrder: number = 0
): Promise<PropertyMedia> => {
  return prisma.propertyMedia.create({
    data: {
      propertyId,
      type,
      url,
      sortOrder,
    },
  });
};

/**
 * ============================================================
 * Find Property Media
 * ============================================================
 *
 * دریافت رسانه‌های فعال یک ملک.
 *
 * ترتیب بر اساس sortOrder و سپس زمان ایجاد است.
 */
export const findPropertyMedia = async (
  propertyId: string
): Promise<PropertyMedia[]> => {
  return prisma.propertyMedia.findMany({
    where: {
      propertyId,
      isActive: true,
    },
    orderBy: [
      { sortOrder: "asc" },
      { createdAt: "asc" },
    ],
  });
};