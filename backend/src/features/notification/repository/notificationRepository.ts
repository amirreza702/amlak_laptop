/**
 * ============================================================
 * Notification Repository
 * ============================================================
 *
 * وظیفه:
 *
 * فقط ارتباط با جدول Notification.
 *
 * Business Logic در Service قرار دارد.
 * HTTP Logic در Controller قرار دارد.
 *
 * ============================================================
 */

import { prisma } from "../../../lib/prisma";

import type {
  Notification,
  Prisma,
} from "@prisma/client";

type DatabaseClient =
  | typeof prisma
  | Prisma.TransactionClient;

/**
 * ایجاد اعلان برای یک User
 */
export const createNotification = async (
  data: Prisma.NotificationCreateInput,
  db: DatabaseClient = prisma
): Promise<Notification> => {
  return db.notification.create({
    data,
  });
};

/**
 * دریافت اعلان‌های یک User
 */
export const findNotificationsByUserId = async (
  userId: string
): Promise<Notification[]> => {
  return prisma.notification.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

/**
 * دریافت یک اعلان متعلق به یک User
 *
 * userId عمداً در شرط جستجو قرار دارد.
 *
 * بنابراین یک User نمی‌تواند با داشتن notificationId
 * اعلان User دیگری را دریافت کند.
 */
export const findNotificationById = async (
  notificationId: string,
  userId: string
): Promise<Notification | null> => {
  return prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
  });
};

/**
 * علامت‌گذاری اعلان به‌عنوان خوانده‌شده
 */
export const markNotificationAsRead = async (
  notificationId: string,
  userId: string
): Promise<Notification | null> => {
  const notification =
    await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

  if (!notification) {
    return null;
  }

  return prisma.notification.update({
    where: {
      id: notificationId,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
};