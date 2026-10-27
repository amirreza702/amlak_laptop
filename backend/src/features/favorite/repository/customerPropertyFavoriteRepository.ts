/**
 * ============================================================
 * Customer Property Favorite Repository
 * ============================================================
 *
 * وظیفه:
 *
 * فقط ارتباط با جدول CustomerPropertyFavorite.
 *
 * Business Logic در Service قرار دارد.
 * HTTP Logic در Controller قرار دارد.
 *
 * ============================================================
 */

import { prisma } from "../../../lib/prisma";

import type {
  CustomerPropertyFavorite,
  Prisma,
} from "@prisma/client";

type DatabaseClient =
  | typeof prisma
  | Prisma.TransactionClient;

/**
 * ایجاد علاقه‌مندی
 */
export const createCustomerPropertyFavorite = async (
  data: Prisma.CustomerPropertyFavoriteCreateInput,
  db: DatabaseClient = prisma
): Promise<CustomerPropertyFavorite> => {
  return db.customerPropertyFavorite.create({
    data,
  });
};

/**
 * پیدا کردن علاقه‌مندی یک مشتری برای یک ملک
 */
export const findCustomerPropertyFavorite = async (
  customerId: string,
  propertyId: string
): Promise<CustomerPropertyFavorite | null> => {
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
 * حذف علاقه‌مندی
 */
export const deleteCustomerPropertyFavorite = async (
  customerId: string,
  propertyId: string,
  db: DatabaseClient = prisma
): Promise<CustomerPropertyFavorite> => {
  return db.customerPropertyFavorite.delete({
    where: {
      customerId_propertyId: {
        customerId,
        propertyId,
      },
    },
  });
};

/**
 * دریافت تمام علاقه‌مندی‌های یک مشتری
 */
export const findCustomerPropertyFavorites = async (
  customerId: string
): Promise<CustomerPropertyFavorite[]> => {
  return prisma.customerPropertyFavorite.findMany({
    where: {
      customerId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};