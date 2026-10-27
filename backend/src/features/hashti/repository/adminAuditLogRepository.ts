import { UserRole, type Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";

export interface CreateAdminAuditLogInput {
  actorUserId: string;
  actorMobile: string;
  actorRole: UserRole;
  action: string;
  targetType: string;
  targetId?: string | null;
  details?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AdminAuditLogQuery {
  actorUserId?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  from?: Date;
  to?: Date;
  limit: number;
  offset: number;
}

/**
 * ثبت یک رویداد مدیریتی؛ اطلاعات snapshot باعث می‌شود نام/شماره عامل
 * حتی پس از حذف حساب نیز در خود رویداد باقی بماند.
 */
export async function createAdminAuditLog(input: CreateAdminAuditLogInput) {
  return prisma.adminAuditLog.create({
    data: {
      actorUserId: input.actorUserId,
      actorMobile: input.actorMobile,
      actorRole: input.actorRole,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      ...(input.details !== undefined ? { details: input.details } : {}),
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}

/**
 * گزارش صفحه‌بندی‌شده رویدادهای مدیریتی برای کارکنان هشتی.
 */
export async function findAdminAuditLogs(query: AdminAuditLogQuery) {
  const where: Prisma.AdminAuditLogWhereInput = {
    ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
    ...(query.action ? { action: { contains: query.action, mode: "insensitive" } } : {}),
    ...(query.targetType ? { targetType: query.targetType } : {}),
    ...(query.targetId ? { targetId: query.targetId } : {}),
    ...(query.from || query.to
      ? {
          createdAt: {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lte: query.to } : {}),
          },
        }
      : {}),
  };

  const [total, logs] = await Promise.all([
    prisma.adminAuditLog.count({ where }),
    prisma.adminAuditLog.findMany({
      where,
      skip: query.offset,
      take: query.limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        actorUserId: true,
        actorMobile: true,
        actorRole: true,
        action: true,
        targetType: true,
        targetId: true,
        details: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
      },
    }),
  ]);

  return { logs, total };
}
