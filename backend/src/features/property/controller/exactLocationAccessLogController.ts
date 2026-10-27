/**
 * ============================================================
 * Exact Location Access Log Controller
 * ============================================================
 *
 * مسئول دریافت درخواست HTTP و فراخوانی Service مربوط به
 * سابقه دسترسی به موقعیت دقیق ملک است.
 */

import type { Request, Response } from "express";

import {
  createExactLocationAccessLogService,
  getExactLocationAccessLogsService,
} from "../service/exactLocationAccessLogService";

/**
 * ============================================================
 * Create Access Log
 * ============================================================
 *
 * POST /properties/:id/exact-location-access-logs
 *
 * ثبت سابقه دسترسی به موقعیت دقیق ملک
 */
export async function createExactLocationAccessLogController(
  req: Request<
    { id: string },
    unknown,
    {
      userId: string;
      reason?: string | null;
    }
  >,
  res: Response
) {
  try {
    const propertyId = req.params.id;

    const {
      userId,
      reason = null,
    } = req.body;

    const accessLog =
      await createExactLocationAccessLogService({
        propertyId,
        userId,
        reason,
      });

    return res.status(201).json({
      accessLog,
    });
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "خطایی در ثبت سابقه دسترسی به موقعیت دقیق رخ داد.",
    });
  }
}

/**
 * ============================================================
 * Get Access Logs
 * ============================================================
 *
 * GET /properties/:id/exact-location-access-logs
 *
 * دریافت سوابق دسترسی به موقعیت دقیق ملک
 */
export async function getExactLocationAccessLogsController(
  req: Request<{ id: string }>,
  res: Response
) {
  try {
    const propertyId = req.params.id;

    const accessLogs =
      await getExactLocationAccessLogsService(propertyId);

    return res.status(200).json({
      accessLogs,
    });
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "خطایی در دریافت سوابق دسترسی به موقعیت دقیق رخ داد.",
    });
  }
}