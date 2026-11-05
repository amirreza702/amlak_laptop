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
import type { AuthenticatedRequest } from "../../auth/middleware/authMiddleware";

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

    const actor = (req as AuthenticatedRequest).user;
    if (!actor) return res.status(401).json({ message: "Authentication required" });
    const notifications = await getUserNotificationsService(userId, {
      id: actor.id, role: actor.role, isActive: actor.isActive,
    });

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
    const actor = (req as AuthenticatedRequest).user;
    if (!actor) return res.status(401).json({ message: "Authentication required" });
    const userId = actor.id;

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
        userId,
        { id: actor.id, role: actor.role, isActive: actor.isActive }
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