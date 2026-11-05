/**
 * ============================================================
 * Exact Location Access Log Repository
 * ============================================================
 *
 * دسترسی به داده‌های مربوط به سابقه مشاهده موقعیت دقیق ملک.
 */

import { prisma } from "../../../lib/prisma";

import type { ExactLocationAccessLog, Prisma } from "@prisma/client";
type Db = typeof prisma | Prisma.TransactionClient;

/**
 * ثبت یک سابقه دسترسی به موقعیت دقیق ملک
 */
export const createExactLocationAccessLog = async (
  propertyId: string,
  userId: string,
  reason: string | null,
  db: Db = prisma,
): Promise<ExactLocationAccessLog> => {
  return db.exactLocationAccessLog.create({
    data: {
      propertyId,
      userId,
      reason,
    },
  });
};

/**
 * دریافت سوابق دسترسی به موقعیت دقیق یک ملک
 */
export const findExactLocationAccessLogs = async (
  propertyId: string
): Promise<ExactLocationAccessLog[]> => {
  return prisma.exactLocationAccessLog.findMany({
    where: {
      propertyId,
    },
    orderBy: {
      accessedAt: "desc",
    },
  });
};