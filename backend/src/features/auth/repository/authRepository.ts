import { UserRole } from "@prisma/client";
import { prisma } from "../../../lib/prisma";

/** یافتن کاربر با شماره موبایل */
export async function findUserByMobile(mobile: string) {
  return prisma.user.findUnique({ where: { mobile } });
}

/**
 * ایجاد حساب و پروفایل نقش‌محور در یک تراکنش.
 * در صورت شکست ایجاد پروفایل، حساب ناقص باقی نمی‌ماند.
 */
export async function createUser(data: {
  mobile: string;
  passwordHash: string;
  role: UserRole;
  firstName: string;
  lastName: string;
}) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        mobile: data.mobile,
        passwordHash: data.passwordHash,
        role: data.role,
      },
      select: {
        id: true,
        mobile: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    let profileId: string;
    if (data.role === UserRole.CUSTOMER) {
      const profile = await tx.customer.create({
        data: { userId: user.id, firstName: data.firstName, lastName: data.lastName },
        select: { id: true },
      });
      profileId = profile.id;
    } else if (data.role === UserRole.OWNER) {
      const profile = await tx.owner.create({
        data: { userId: user.id, firstName: data.firstName, lastName: data.lastName },
        select: { id: true },
      });
      profileId = profile.id;
    } else if (data.role === UserRole.AGENT) {
      const profile = await tx.agent.create({
        data: { userId: user.id, firstName: data.firstName, lastName: data.lastName },
        select: { id: true },
      });
      profileId = profile.id;
    } else {
      throw new Error("ROLE_NOT_ALLOWED");
    }

    return { ...user, profileId };
  });
}

/** ایجاد Session در دیتابیس */
export async function createSession(data: {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
}) {
  return prisma.session.create({
    data: {
      tokenHash: data.tokenHash,
      userId: data.userId,
      expiresAt: data.expiresAt,
    },
  });
}

/** یافتن Session همراه با اطلاعات کاربر */
export async function findSessionByTokenHash(tokenHash: string) {
  return prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
}

/**
 * تمدید مهلت Session هنگام فعالیت معتبر.
 * نشست منقضی‌شده تمدید نمی‌شود.
 */
export async function extendSessionExpiry(
  tokenHash: string,
  activeAt: Date,
  expiresAt: Date
): Promise<boolean> {
  const result = await prisma.session.updateMany({
    where: {
      tokenHash,
      expiresAt: { gt: activeAt },
    },
    data: { expiresAt },
  });

  return result.count > 0;
}

/** حذف Session بر اساس هش توکن */
export async function deleteSessionByTokenHash(tokenHash: string) {
  return prisma.session.deleteMany({ where: { tokenHash } });
}

/** بازنشانی رمز عبور و حذف تمام Sessionهای کاربر در یک تراکنش */
export async function resetUserPasswordAndSessions(
  userId: string,
  passwordHash: string
) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, mobile: true, role: true },
    });

    if (!user) throw new Error("USER_NOT_FOUND");

    await tx.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await tx.session.deleteMany({ where: { userId } });
    return user;
  });
}


/**
 * Administrative password reset with an audit record in the same transaction.
 * The password itself and its hash are never written to the audit details.
 */
export async function resetUserPasswordAndSessionsWithAudit(input: {
  userId: string;
  passwordHash: string;
  actorUserId: string;
  actorMobile: string;
  ipAddress?: string;
  userAgent?: string;
  reason?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({
      where: { id: input.userId },
      select: { id: true, mobile: true, role: true, isActive: true },
    });

    if (!target) throw new Error("USER_NOT_FOUND");
    if (target.id === input.actorUserId) throw new Error("CANNOT_RESET_OWN_PASSWORD");

    await tx.user.update({
      where: { id: target.id },
      data: { passwordHash: input.passwordHash },
    });

    // Invalidate every existing session for the target account.
    await tx.session.deleteMany({ where: { userId: target.id } });

    const actor = await tx.user.findUnique({
      where: { id: input.actorUserId },
      select: { id: true, mobile: true, role: true, isActive: true, isSuperAdmin: true },
    });
    if (!actor || actor.role !== UserRole.HASHTI || !actor.isActive || !actor.isSuperAdmin) {
      throw new Error("SUPER_ADMIN_PERMISSION_REQUIRED");
    }

    await tx.adminAuditLog.create({
      data: {
        actorUserId: actor.id,
        actorMobile: input.actorMobile,
        actorRole: UserRole.HASHTI,
        action: "ADMIN_USER_PASSWORD_RESET",
        operation: "PASSWORD_RESET",
        targetUserId: target.id,
        reason: input.reason?.trim() || "Administrative password reset",
        before: {
          role: target.role,
          isActive: target.isActive,
        },
        after: {
          role: target.role,
          isActive: target.isActive,
          sessionsRevoked: true,
        },
        targetType: "USER",
        targetId: target.id,
        details: {
          targetMobile: target.mobile,
          targetRole: target.role,
          targetWasActive: target.isActive,
          sessionsRevoked: true,
          reason: input.reason ?? null,
        },
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });

    return { id: target.id, mobile: target.mobile, role: target.role };
  }, { isolationLevel: "Serializable" });
}


export async function listAdminUsers(data: {
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  skip: number;
  take: number;
}) {
  const where: import("@prisma/client").Prisma.UserWhereInput = {};

  if (data.role) {
    where.role = data.role;
  }

  if (typeof data.isActive === "boolean") {
    where.isActive = data.isActive;
  }

  const search = data.search?.trim();
  if (search) {
    where.OR = [
      { mobile: { contains: search } },
      { customer: { is: { firstName: { contains: search, mode: "insensitive" } } } },
      { customer: { is: { lastName: { contains: search, mode: "insensitive" } } } },
      { owner: { is: { firstName: { contains: search, mode: "insensitive" } } } },
      { owner: { is: { lastName: { contains: search, mode: "insensitive" } } } },
      { agent: { is: { firstName: { contains: search, mode: "insensitive" } } } },
      { agent: { is: { lastName: { contains: search, mode: "insensitive" } } } },
      { agent: { is: { agencyName: { contains: search, mode: "insensitive" } } } },
    ];
  }

  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip: data.skip,
      take: data.take,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        mobile: true,
        role: true,
        isActive: true,
        isSuperAdmin: true,
        adminPermissions: true,
        createdAt: true,
        updatedAt: true,
        customer: { select: { id: true, firstName: true, lastName: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
        agent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            agencyName: true,
            isVerified: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { items, total };
}
