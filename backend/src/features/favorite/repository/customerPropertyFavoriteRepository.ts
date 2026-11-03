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

/** ایجاد علاقه‌مندی مشاور برای مشتری */
export const createCustomerAgentFavorite = (customerId: string, agentId: string) =>
  prisma.customerAgentFavorite.create({
    data: { customerId, agentId },
    include: { agent: { select: { id: true, firstName: true, lastName: true, agencyName: true } } },
  });

/** یافتن علاقه‌مندی مشاور */
export const findCustomerAgentFavorite = (customerId: string, agentId: string) =>
  prisma.customerAgentFavorite.findUnique({
    where: { customerId_agentId: { customerId, agentId } },
  });

/** حذف علاقه‌مندی مشاور */
export const deleteCustomerAgentFavorite = (customerId: string, agentId: string) =>
  prisma.customerAgentFavorite.delete({
    where: { customerId_agentId: { customerId, agentId } },
  });

/** دریافت مشاوران علاقه‌مندی‌شده */
export const findCustomerAgentFavorites = (customerId: string) =>
  prisma.customerAgentFavorite.findMany({
    where: { customerId, agent: { user: { isActive: true } } },
    orderBy: { createdAt: "desc" },
    include: {
      agent: {
        select: {
          id: true, firstName: true, lastName: true, agencyName: true,
          verificationStatus: true,
        },
      },
    },
  });
