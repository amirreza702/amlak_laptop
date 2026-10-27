/**
 * ============================================================
 * VerificationCase Repository
 * ============================================================
 *
 * مسئول ارتباط مستقیم با Prisma برای VerificationCase.
 *
 * Repository فقط عملیات Data Access را انجام می‌دهد
 * و منطق Business در Service قرار دارد.
 */

import { prisma } from "../../../lib/prisma";

import type {
  Prisma,
  VerificationCase,
} from "@prisma/client";

import { VerificationStatus } from "@prisma/client";

/**
 * نوع Client دیتابیس
 *
 * می‌تواند:
 * 1. Prisma اصلی باشد
 * 2. TransactionClient باشد
 *
 * این باعث می‌شود Repository هم به صورت عادی
 * و هم داخل Transaction قابل استفاده باشد.
 */
type DatabaseClient =
  | typeof prisma
  | Prisma.TransactionClient;

/**
 * پیدا کردن VerificationCase با شناسه
 */
export const findVerificationCaseById = async (
  id: string
): Promise<VerificationCase | null> => {
  return prisma.verificationCase.findUnique({
    where: {
      id,
    },
  });
};

/**
 * پیدا کردن آخرین پرونده تأیید یک Property
 */
export const findLatestVerificationCase = async (
  propertyId: string
): Promise<VerificationCase | null> => {
  return prisma.verificationCase.findFirst({
    where: {
      propertyId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

/**
 * ایجاد پرونده تأیید برای یک Property
 */
export const createVerificationCase = async (
  propertyId: string
): Promise<VerificationCase> => {
  return prisma.verificationCase.create({
    data: {
      propertyId,
    },
  });
};

/**
 * بررسی و تغییر وضعیت VerificationCase
 *
 * db به صورت پیش‌فرض Prisma اصلی است.
 *
 * در حالت عادی:
 *   reviewVerificationCase(...)
 *
 * در Transaction:
 *   reviewVerificationCase(..., tx)
 */
export const reviewVerificationCase = async (
  id: string,
  status: VerificationStatus,
  reviewedBy: string,
  notes: string | null,
  db: DatabaseClient = prisma
): Promise<VerificationCase> => {
  return db.verificationCase.update({
    where: {
      id,
    },
    data: {
      status,
      reviewedBy,
      reviewedAt: new Date(),
      notes,
    },
  });
};