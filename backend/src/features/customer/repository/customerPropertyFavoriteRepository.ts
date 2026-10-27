/**
 * ============================================================
 * Customer Property Favorite Repository
 * ============================================================
 *
 * این Repository فقط مسئول ارتباط مستقیم با Prisma و دیتابیس است.
 *
 * عملیات:
 *
 * 1. افزودن ملک به علاقه‌مندی
 * 2. حذف ملک از علاقه‌مندی
 * 3. پیدا کردن یک علاقه‌مندی
 * 4. دریافت علاقه‌مندی‌های یک مشتری
 * 5. بررسی وجود علاقه‌مندی
 *
 * منطق Business در Service قرار می‌گیرد.
 * ============================================================
 */

import { prisma } from "../../../lib/prisma";

/**
 * ------------------------------------------------------------
 * ایجاد علاقه‌مندی
 * ------------------------------------------------------------
 */
export const createCustomerPropertyFavorite = async (
  customerId: string,
  propertyId: string
) => {
  return prisma.customerPropertyFavorite.create({
    data: {
      customerId,
      propertyId,
    },
  });
};

/**
 * ------------------------------------------------------------
 * حذف علاقه‌مندی
 * ------------------------------------------------------------
 */
export const deleteCustomerPropertyFavorite = async (
  customerId: string,
  propertyId: string
) => {
  return prisma.customerPropertyFavorite.delete({
    where: {
      customerId_propertyId: {
        customerId,
        propertyId,
      },
    },
  });
};

/**
 * ------------------------------------------------------------
 * پیدا کردن یک علاقه‌مندی
 * ------------------------------------------------------------
 */
export const findCustomerPropertyFavorite = async (
  customerId: string,
  propertyId: string
) => {
  return prisma.customerPropertyFavorite.findUnique({
    where: {
      customerId_propertyId: {
        customerId,
        propertyId,
      },
    },
  });
};

/**
 * ------------------------------------------------------------
 * دریافت تمام علاقه‌مندی‌های یک مشتری
 * ------------------------------------------------------------
 */
export const findCustomerPropertyFavorites = async (
  customerId: string
) => {
  return prisma.customerPropertyFavorite.findMany({
    where: {
      customerId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

/**
 * ------------------------------------------------------------
 * بررسی وجود علاقه‌مندی
 * ------------------------------------------------------------
 */
export const existsCustomerPropertyFavorite = async (
  customerId: string,
  propertyId: string
) => {
  const favorite = await prisma.customerPropertyFavorite.findUnique({
    where: {
      customerId_propertyId: {
        customerId,
        propertyId,
      },
    },
    select: {
      id: true,
    },
  });

  return favorite !== null;
};