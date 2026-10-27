/**
 * ============================================================
 * VerificationDocument Repository
 * ============================================================
 *
 * مسئول ارتباط مستقیم با Prisma برای VerificationDocument.
 *
 * Repository فقط Data Access را انجام می‌دهد.
 * منطق Business در Service قرار دارد.
 */

import { prisma } from "../../../lib/prisma";

import type { VerificationDocument } from "../types/verificationDocument";

/**
 * ایجاد یک مدرک برای پرونده تأیید
 *
 * توجه:
 * در این مرحله فایل واقعی آپلود نمی‌شود.
 * fileUrl آدرس فایل ذخیره‌شده را دریافت می‌کند.
 */
export const createVerificationDocument = async (
  verificationCaseId: string,
  documentType: string,
  fileUrl: string
): Promise<VerificationDocument> => {
  return prisma.verificationDocument.create({
    data: {
      verificationCaseId,
      documentType,
      fileUrl,
    },
  });
};

/**
 * دریافت تمام مدارک یک پرونده تأیید
 *
 * مدارک بر اساس زمان ایجاد، از قدیمی به جدید
 * برگردانده می‌شوند.
 */
export const findVerificationDocuments = async (
  verificationCaseId: string
): Promise<VerificationDocument[]> => {
  return prisma.verificationDocument.findMany({
    where: {
      verificationCaseId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
};