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
      property: { is: { isActive: true } },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

/** جست‌وجوی مشاوران تأییدشده‌ای که هنوز در علاقه‌مندی این مشتری نیستند. */
export const searchAgentsForCustomerFavorites = (customerId: string, query: string) =>
  prisma.agent.findMany({
    where: {
      verificationStatus: "VERIFIED",
      user: { isActive: true },
      customerFavorites: { none: { customerId } },
      OR: [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { agencyName: { contains: query, mode: "insensitive" } },
      ],
    },
    take: 20,
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    select: { id: true, firstName: true, lastName: true, agencyName: true },
  });
