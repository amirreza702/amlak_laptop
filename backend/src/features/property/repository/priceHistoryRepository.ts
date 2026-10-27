/**
 * ============================================================
 * Price History Repository
 * ============================================================
 *
 * مسئول دسترسی مستقیم به جدول PriceHistory در دیتابیس.
 *
 * این Repository فقط وظیفه Data Access دارد و منطق Business
 * مربوط به تغییر قیمت در Service قرار دارد.
 *
 * Repository می‌تواند هم با Prisma اصلی و هم با
 * Prisma Transaction Client کار کند.
 *
 * ساختار:
 *
 * Property
 *    │
 *    └── PriceHistory
 *          ├── INITIAL
 *          └── PRICE_CHANGE
 *
 * ============================================================
 */

import { prisma } from "../../../lib/prisma";

import type {
  Prisma,
  PriceHistory,
} from "@prisma/client";

/**
 * ============================================================
 * نوع Client دیتابیس
 * ============================================================
 *
 * دو حالت ممکن است:
 *
 * 1. Prisma اصلی
 * 2. Client مربوط به یک Transaction
 *
 * بنابراین Repository می‌تواند در هر دو حالت
 * عملیات Data Access را انجام دهد.
 */
type DatabaseClient =
  | typeof prisma
  | Prisma.TransactionClient;

/**
 * ============================================================
 * ایجاد رکورد تاریخچه قیمت
 * ============================================================
 *
 * یک رکورد جدید در PriceHistory ایجاد می‌کند.
 *
 * این تابع درباره مجاز بودن تغییر قیمت تصمیم نمی‌گیرد.
 * تصمیم‌های Business در Service انجام می‌شوند.
 */
export const createPriceHistory = async (
  data: Parameters<
    typeof prisma.priceHistory.create
  >[0]["data"],
  db: DatabaseClient = prisma
): Promise<PriceHistory> => {
  return db.priceHistory.create({
    data,
  });
};

/**
 * ============================================================
 * دریافت تاریخچه قیمت یک ملک
 * ============================================================
 *
 * سوابق قیمت بر اساس جدیدترین تغییر مرتب می‌شوند.
 *
 * این عملیات معمولاً خارج از Transaction استفاده می‌شود،
 * بنابراین نیازی به ارسال Client از طرف Service ندارد.
 */
export const findPriceHistoryByPropertyId = async (
  propertyId: string
): Promise<PriceHistory[]> => {
  return prisma.priceHistory.findMany({
    where: {
      propertyId,
    },
    orderBy: {
      changedAt: "desc",
    },
  });
};