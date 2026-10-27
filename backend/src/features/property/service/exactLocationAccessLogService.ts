/**
 * ============================================================
 * Exact Location Access Log Service
 * ============================================================
 *
 * منطق ثبت و دریافت سابقه دسترسی به موقعیت دقیق ملک.
 */

import {
  createExactLocationAccessLog,
  findExactLocationAccessLogs,
} from "../repository/exactLocationAccessLogRepository";

import { findPropertyById } from "../repository/propertyRepository";

import type { ExactLocationAccessLog } from "@prisma/client";

/**
 * ============================================================
 * Create Access Log
 * ============================================================
 */

export interface CreateExactLocationAccessLogInput {
  propertyId: string;
  userId: string;
  reason?: string | null;
}

export const createExactLocationAccessLogService = async (
  data: CreateExactLocationAccessLogInput
): Promise<ExactLocationAccessLog> => {
  /**
   * ابتدا بررسی می‌کنیم ملک وجود داشته باشد.
   */
  const property = await findPropertyById(data.propertyId);

  if (!property) {
    throw new Error("ملک مورد نظر پیدا نشد.");
  }

  /**
   * ثبت سابقه دسترسی.
   */
  return createExactLocationAccessLog(
    data.propertyId,
    data.userId,
    data.reason ?? null
  );
};

/**
 * ============================================================
 * Get Access Logs
 * ============================================================
 */

export const getExactLocationAccessLogsService = async (
  propertyId: string
): Promise<ExactLocationAccessLog[]> => {
  /**
   * قبل از دریافت سوابق، وجود ملک بررسی می‌شود.
   */
  const property = await findPropertyById(propertyId);

  if (!property) {
    throw new Error("ملک مورد نظر پیدا نشد.");
  }

  return findExactLocationAccessLogs(propertyId);
};