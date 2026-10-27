/**
 * ============================================================
 * Contact Access Usage Repository
 * ============================================================
 */

import { prisma } from "../../../lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * نوع Client قابل استفاده برای Repository
 *
 * می‌تواند:
 * - Prisma معمولی
 * - یا Transaction Client
 * باشد.
 */
type PrismaClientLike =
  | typeof prisma
  | Prisma.TransactionClient;

/**
 * پیدا کردن مصرف Agent در یک دوره
 */
export const findContactAccessUsage = async (
  agentId: string,
  periodStart: Date,
  db: PrismaClientLike = prisma
) => {
  return db.contactAccessUsage.findUnique({
    where: {
      agentId_periodStart: {
        agentId,
        periodStart,
      },
    },
  });
};

/**
 * ایجاد رکورد مصرف برای یک دوره
 */
export const createContactAccessUsage = async (
  agentId: string,
  periodStart: Date,
  db: PrismaClientLike = prisma
) => {
  return db.contactAccessUsage.create({
    data: {
      agentId,
      periodStart,
      usedCount: 0,
    },
  });
};

/**
 * افزایش تعداد Contactهای مصرف‌شده
 */
export const incrementContactAccessUsage = async (
  agentId: string,
  periodStart: Date,
  db: PrismaClientLike = prisma
) => {
  return db.contactAccessUsage.update({
    where: {
      agentId_periodStart: {
        agentId,
        periodStart,
      },
    },
    data: {
      usedCount: {
        increment: 1,
      },
    },
  });
};