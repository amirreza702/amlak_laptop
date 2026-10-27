/**
 * ============================================================
 * VerificationCase
 * ============================================================
 *
 * قرارداد داده‌ای پرونده تأیید ملک توسط هشتی.
 *
 * VerificationCase خودِ مدارک نیست.
 * مدارک در VerificationDocument نگهداری می‌شوند
 * و به این پرونده متصل هستند.
 */

import type { VerificationStatus } from "@prisma/client";

export interface VerificationCase {
  id: string;

  propertyId: string;

  status: VerificationStatus;

  reviewedBy: string | null;
  reviewedAt: Date | null;

  notes: string | null;

  createdAt: Date;
  updatedAt: Date;
}