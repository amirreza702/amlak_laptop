/**
 * ============================================================
 * Contact Access Log Repository
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
 * ثبت اولین دسترسی مشاور به اطلاعات تماس یک درخواست مشتری
 */
export const createContactAccessLog = async (
  agentId: string,
  customerId: string,
  searchRequestId: string,
  db: PrismaClientLike = prisma
) => {
  return db.contactAccessLog.create({
    data: {
      agentId,
      customerId,
      searchRequestId,
    },
  });
};

/**
 * بررسی اینکه آیا مشاور قبلاً Contact این درخواست را دیده است یا نه
 */
export const findContactAccessLog = async (
  agentId: string,
  searchRequestId: string,
  db: PrismaClientLike = prisma
) => {
  return db.contactAccessLog.findUnique({
    where: {
      agentId_searchRequestId: {
        agentId,
        searchRequestId,
      },
    },
  });
};

/**
 * دریافت سوابق دسترسی یک مشاور
 */
export const findAgentContactAccessLogs = async (
  agentId: string,
  db: PrismaClientLike = prisma
) => {
  return db.contactAccessLog.findMany({
    where: {
      agentId,
    },
    orderBy: {
      accessedAt: "desc",
    },
  });
};