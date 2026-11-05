/**
import type { AuthorizationActor } from "../../../shared/authorization/authorization.types";
 * ============================================================
 * Notification Service
 * ============================================================
 *
 * منطق Business مربوط به Notification در این Service قرار دارد.
 *
 * جریان ایجاد اعلان:
 *
 * Feature دیگر
 *      ↓
 * Notification Service
 *      ↓
 * Notification Repository
 *      ↓
 * Prisma
 *
 * ============================================================
 */

import type { Prisma } from "@prisma/client";
import { authorize } from "../../../shared/authorization/authorization.core";

import {
  createNotification,
  findNotificationsByUserId,
  markNotificationAsRead,
} from "../repository/notificationRepository";

export interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  details?: Prisma.InputJsonValue;
}

/**
 * ایجاد اعلان برای User
 */
export async function createNotificationService(
  data: CreateNotificationInput
) {
  if (!data.userId) {
    throw new Error("شناسه کاربر الزامی است.");
  }

  if (!data.title.trim()) {
    throw new Error("عنوان اعلان الزامی است.");
  }

  if (!data.message.trim()) {
    throw new Error("متن اعلان الزامی است.");
  }

  return createNotification({
    user: {
      connect: {
        id: data.userId,
      },
    },
    title: data.title.trim(),
    message: data.message.trim(),
    ...(data.details ? { details: data.details } : {}),
  });
}

/**
 * دریافت اعلان‌های یک User
 */
export async function getUserNotificationsService(
  userId: string,
  actor: AuthorizationActor
) {
  if (!userId) {
    throw new Error("شناسه کاربر الزامی است.");
  }

  const allowed = await authorize("notification", "LIST_OWN", {
    actor,
    resource: { id: userId, data: { isSelf: actor.id === userId } },
  });
  if (!allowed) throw new Error("NOTIFICATION_ACCESS_FORBIDDEN");
  return findNotificationsByUserId(userId);
}

/**
 * علامت‌گذاری اعلان به‌عنوان خوانده‌شده
 */
export async function markNotificationAsReadService(
  notificationId: string,
  userId: string,
  actor: AuthorizationActor
) {
  if (!notificationId) {
    throw new Error("شناسه اعلان الزامی است.");
  }

  if (!userId) {
    throw new Error("شناسه کاربر الزامی است.");
  }

  const allowed = await authorize("notification", "UPDATE", {
    actor,
    resource: { id: notificationId, data: { isSelf: actor.id === userId } },
  });
  if (!allowed) throw new Error("NOTIFICATION_ACCESS_FORBIDDEN");

  const notification = await markNotificationAsRead(notificationId, userId);

  if (!notification) {
    throw new Error("اعلان مورد نظر پیدا نشد.");
  }

  return notification;
}