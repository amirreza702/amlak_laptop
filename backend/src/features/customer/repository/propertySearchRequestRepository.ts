/**
 * ============================================================
 * Property Search Request Repository
 * ============================================================
 *
 * این Repository فقط مسئول ارتباط با Prisma و دیتابیس است.
 *
 * عملیات:
 *
 * 1. ایجاد درخواست جستجو
 * 2. دریافت درخواست‌های یک مشتری
 * 3. دریافت یک درخواست
 * 4. تغییر وضعیت درخواست
 *
 * منطق Business در Service قرار می‌گیرد.
 * ============================================================
 */

import { prisma } from "../../../lib/prisma";
import { Prisma } from "@prisma/client";

type DatabaseClient = typeof prisma | Prisma.TransactionClient;

/**
 * ایجاد درخواست جستجوی ملک
 */
export const createPropertySearchRequest = async (
  data: Parameters<
    typeof prisma.propertySearchRequest.create
  >[0]["data"],
  db: DatabaseClient = prisma,
) => {
  return db.propertySearchRequest.create({
    data,
  });
};

/**
 * دریافت یک درخواست جستجو
 */
export const findPropertySearchRequestById = async (
  id: string,
  db: DatabaseClient = prisma,
) => {
  return db.propertySearchRequest.findUnique({
    where: {
      id,
    },
  });
};

/**
 * دریافت تمام درخواست‌های جستجوی یک مشتری
 *
 * جدیدترین درخواست ابتدا نمایش داده می‌شود.
 */
export const findPropertySearchRequestsByCustomerId =
  async (
    customerId: string,
    db: DatabaseClient = prisma,
  ) => {
    return db.propertySearchRequest.findMany({
      where: {
        customerId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  };

/**
 * تغییر وضعیت درخواست جستجو
 */
export const updatePropertySearchRequestStatus =
  async (
    id: string,
    status: string,
    db: DatabaseClient = prisma,
  ) => {
    return db.propertySearchRequest.update({
      where: {
        id,
      },
      data: {
        status,
      },
    });
  };

 /**
 * ویرایش اطلاعات درخواست جستجو
 *
 * وضعیت درخواست در این عملیات تغییر نمی‌کند.
 *
 * نوع data مستقیماً از Prisma گرفته می‌شود
 * تا Enumهای transactionType و propertyType
 * دقیقاً با Schema هماهنگ باشند.
 */
export const updatePropertySearchRequest = async (
  id: string,
  data: Parameters<
    typeof prisma.propertySearchRequest.update
  >[0]["data"],
  db: DatabaseClient = prisma,
) => {
  return db.propertySearchRequest.update({
    where: {
      id,
    },
    data,
  });
};

 /**
  * دریافت درخواست‌های فعال جستجوی ملک
  *
  * این Query برای نمایش درخواست‌های قابل مشاهده
  * به Agent استفاده می‌شود.
  *
  * فقط اطلاعات مورد نیاز Agent برگردانده می‌شود.
  *
  * customerId عمداً در خروجی وجود ندارد.
  */
export const findActivePropertySearchRequests =
  async (filters: {
    city?: string; transactionType?: string; propertyType?: string;
    minBudget?: number; maxBudget?: number; hashtiVerified?: boolean;
    createdFrom?: Date; createdTo?: Date;
  } = {},
    db: DatabaseClient = prisma,
  ) => {
    const where: Prisma.PropertySearchRequestWhereInput = { status: "ACTIVE" };
    if (filters.city) where.city = { contains: filters.city, mode: "insensitive" };
    if (filters.transactionType) where.transactionType = filters.transactionType as "SALE" | "FULL_DEPOSIT" | "RENT" | "DEPOSIT_AND_RENT";
    if (filters.propertyType) where.propertyType = filters.propertyType as "APARTMENT" | "HOUSE" | "VILLA" | "LAND" | "SHOP" | "OFFICE" | "GARDEN";
    if (filters.hashtiVerified !== undefined) where.hashtiVerified = filters.hashtiVerified;
    if (filters.minBudget !== undefined || filters.maxBudget !== undefined) {
      where.budget = {
        ...(filters.minBudget !== undefined ? { gte: filters.minBudget } : {}),
        ...(filters.maxBudget !== undefined ? { lte: filters.maxBudget } : {}),
      };
    }
    if (filters.createdFrom || filters.createdTo) {
      where.createdAt = {
        ...(filters.createdFrom ? { gte: filters.createdFrom } : {}),
        ...(filters.createdTo ? { lte: filters.createdTo } : {}),
      };
    }
    return db.propertySearchRequest.findMany({
      where,

      select: {
        id: true,
        transactionType: true,
        propertyType: true,
        city: true,
        budget: true,
        description: true,
        hashtiVerified: true,
        status: true,
        createdByRole: true,
        createdByUserId: true,
        createdAt: true,
        updatedAt: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });
  };

  /**
 * دریافت جزئیات یک درخواست فعال برای Agent
 *
 * این Query مخصوص Marketplace Agent است.
 *
 * فقط درخواست ACTIVE قابل مشاهده است.
 *
 * customerId عمداً در خروجی وجود ندارد.
 * بنابراین اطلاعات هویتی Customer وارد Service
 * و سپس Controller نمی‌شود.
 */
export const findActivePropertySearchRequestById =
  async (
    id: string,
    db: DatabaseClient = prisma,
  ) => {
    return db.propertySearchRequest.findFirst({
      where: {
        id,
        status: "ACTIVE",
      },

      select: {
        id: true,
        transactionType: true,
        propertyType: true,
        city: true,
        budget: true,
        description: true,
        hashtiVerified: true,
        status: true,
        createdByRole: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  };

  