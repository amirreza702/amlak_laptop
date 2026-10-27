/**
 * ============================================================
 * Notification Controller
 * ============================================================
 *
 * وظیفه:
 *
 * فقط دریافت درخواست HTTP و ارسال پاسخ HTTP.
 *
 * Business Logic در Service قرار دارد.
 *
 * ============================================================
 */

import type { Request, Response } from "express";

import {
  getUserNotificationsService,
  markNotificationAsReadService,
} from "../service/notificationService";

/**
 * دریافت اعلان‌های یک User
 */
export async function getUserNotificationsController(
  req: Request,
  res: Response
) {
  try {
    const userId = req.params.userId;

    if (!userId || Array.isArray(userId)) {
      return res.status(400).json({
        message: "شناسه کاربر نامعتبر است.",
      });
    }

    const notifications =
      await getUserNotificationsService(userId);

    return res.status(200).json(notifications);
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "خطا در دریافت اعلان‌ها.",
    });
  }
}

/**
 * علامت‌گذاری یک اعلان به‌عنوان خوانده‌شده
 */
export async function markNotificationAsReadController(
  req: Request,
  res: Response
) {
  try {
    const notificationId = req.params.id;
    const userId = req.body.userId;

    if (
      !notificationId ||
      Array.isArray(notificationId)
    ) {
      return res.status(400).json({
        message: "شناسه اعلان نامعتبر است.",
      });
    }

    const notification =
      await markNotificationAsReadService(
        notificationId,
        userId
      );

    return res.status(200).json(notification);
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "خطا در خوانده‌شدن اعلان.",
    });
  }
}