import { UserRole, type Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";

export interface ManagedUserQuery {
  query?: string;
  role?: UserRole;
  isActive?: boolean;
  limit: number;
  offset: number;
}
export type ManagedProfileType = "customer" | "owner" | "agent" | "hashti";
export interface ManagedProfileUpdate {
  profileType: ManagedProfileType;
  profileId: string;
  firstName: string;
  lastName: string;
  agencyName?: string | null;
  address?: string | null;
  reason: string;
  actorUserId: string;
  actorMobile: string;
}

export async function getSuperAdminAccess(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, isActive: true, isSuperAdmin: true },
  });
  return Boolean(user && user.role === UserRole.HASHTI && user.isActive && user.isSuperAdmin);
}

/** Search user accounts and role-specific profiles without selecting password data. */
export async function findManagedUsers(query: ManagedUserQuery) {
  const search = query.query?.trim();
  const contains = (value: string) => ({ contains: value, mode: "insensitive" as const });
  const staffMatches = search
    ? await prisma.hashtiStaff.findMany({
        where: { OR: [{ firstName: contains(search) }, { lastName: contains(search) }] },
        select: { mobile: true },
      })
    : [];

  const where: Prisma.UserWhereInput = {
    ...(query.role ? { role: query.role } : {}),
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(search ? {
      OR: [
        { mobile: contains(search) },
        { customer: { is: { firstName: contains(search) } } },
        { customer: { is: { lastName: contains(search) } } },
        { owner: { is: { firstName: contains(search) } } },
        { owner: { is: { lastName: contains(search) } } },
        { agent: { is: { firstName: contains(search) } } },
        { agent: { is: { lastName: contains(search) } } },
        { agent: { is: { agencyName: contains(search) } } },
        ...(staffMatches.length ? [{ mobile: { in: staffMatches.map((staff) => staff.mobile) } }] : []),
      ],
    } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip: query.offset,
      take: query.limit,
      orderBy: [{ isSuperAdmin: "desc" }, { createdAt: "desc" }],
      select: {
        id: true, mobile: true, role: true, isActive: true, isSuperAdmin: true, createdAt: true, updatedAt: true,
        customer: { select: { id: true, firstName: true, lastName: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
        agent: { select: {
          id: true, firstName: true, lastName: true, agencyName: true, address: true,
          isVerified: true, verificationStatus: true, verificationReviewedAt: true, verificationNotes: true,
        } },
      },
    }),
  ]);

  const staffMobiles = rows.filter((row) => row.role === UserRole.HASHTI).map((row) => row.mobile);
  const staffRows = staffMobiles.length
    ? await prisma.hashtiStaff.findMany({
        where: { mobile: { in: staffMobiles } },
        select: { id: true, mobile: true, firstName: true, lastName: true, isActive: true },
      })
    : [];
  const staffByMobile = new Map(staffRows.map((staff) => [staff.mobile, staff]));
  return { users: rows.map((row) => ({ ...row, staffProfile: staffByMobile.get(row.mobile) ?? null })), total };
}

export async function updateManagedUserStatus(input: {
  userId: string; isActive: boolean; reason: string; actorUserId: string; actorMobile: string;
}) {
  return prisma.$transaction(async (tx) => {
    const actor = await tx.user.findUnique({
      where: { id: input.actorUserId },
      select: { role: true, isActive: true, isSuperAdmin: true },
    });
    if (!actor || actor.role !== UserRole.HASHTI || !actor.isActive) {
      throw new Error("HASHTI_PERMISSION_REQUIRED");
    }

    const current = await tx.user.findUnique({
      where: { id: input.userId },
      select: { id: true, mobile: true, role: true, isActive: true, isSuperAdmin: true },
    });
    if (!current) throw new Error("USER_NOT_FOUND");
    if (current.role === UserRole.HASHTI && !actor.isSuperAdmin) {
      throw new Error("SUPER_ADMIN_PERMISSION_REQUIRED");
    }
    if (current.id === input.actorUserId) throw new Error("CANNOT_CHANGE_OWN_STATUS");

    if (!input.isActive && current.isSuperAdmin && current.isActive) {
      const others = await tx.user.count({
        where: { isSuperAdmin: true, isActive: true, id: { not: current.id } },
      });
      if (others === 0) throw new Error("LAST_SUPER_ADMIN_REQUIRED");
    }
    if (current.isActive === input.isActive) return { user: current, changed: false };

    const updated = await tx.user.update({
      where: { id: current.id },
      data: { isActive: input.isActive },
      select: { id: true, mobile: true, role: true, isActive: true, isSuperAdmin: true, updatedAt: true },
    });
    if (current.role === UserRole.HASHTI) {
      await tx.hashtiStaff.updateMany({ where: { mobile: current.mobile }, data: { isActive: input.isActive } });
    }

    await tx.adminAuditLog.create({
      data: {
        actorUserId: input.actorUserId, actorMobile: input.actorMobile, actorRole: UserRole.HASHTI,
        action: "USER_STATUS_CHANGED", targetType: "USER", targetId: current.id,
        details: {
          previousIsActive: current.isActive, newIsActive: input.isActive, reason: input.reason,
          targetMobile: current.mobile, targetRole: current.role,
        },
      },
    });
    return { user: updated, changed: true };
  });
}

export async function createManagedHashtiUser(input: {
  mobile: string; firstName: string; lastName: string; passwordHash: string; actorUserId: string; actorMobile: string;
}) {
  return prisma.$transaction(async (tx) => {
    const actor = await tx.user.findUnique({
      where: { id: input.actorUserId },
      select: { role: true, isActive: true, isSuperAdmin: true },
    });
    if (!actor || actor.role !== UserRole.HASHTI || !actor.isActive || !actor.isSuperAdmin) {
      throw new Error("SUPER_ADMIN_PERMISSION_REQUIRED");
    }
    const existingUser = await tx.user.findUnique({ where: { mobile: input.mobile }, select: { id: true } });
    if (existingUser) throw new Error("USER_ALREADY_EXISTS");
    const existingStaff = await tx.hashtiStaff.findUnique({
      where: { mobile: input.mobile },
      select: { id: true, mobile: true, firstName: true, lastName: true, isActive: true },
    });

    const user = await tx.user.create({
      data: { mobile: input.mobile, passwordHash: input.passwordHash, role: UserRole.HASHTI, isActive: true, isSuperAdmin: false },
      select: { id: true, mobile: true, role: true, isActive: true, isSuperAdmin: true, createdAt: true },
    });
    const staffProfile = existingStaff
      ? await tx.hashtiStaff.update({
          where: { mobile: input.mobile },
          data: { firstName: input.firstName, lastName: input.lastName, isActive: true },
          select: { id: true, mobile: true, firstName: true, lastName: true, isActive: true },
        })
      : await tx.hashtiStaff.create({
          data: { mobile: input.mobile, firstName: input.firstName, lastName: input.lastName, isActive: true },
          select: { id: true, mobile: true, firstName: true, lastName: true, isActive: true },
        });

    await tx.adminAuditLog.create({
      data: {
        actorUserId: input.actorUserId, actorMobile: input.actorMobile, actorRole: UserRole.HASHTI,
        action: "HASHTI_STAFF_CREATED", targetType: "USER", targetId: user.id,
        details: { targetMobile: user.mobile, firstName: staffProfile.firstName, lastName: staffProfile.lastName, role: UserRole.HASHTI, isSuperAdmin: false },
      },
    });
    return { user, staffProfile };
  });
}

export async function updateManagedProfile(input: ManagedProfileUpdate) {
  return prisma.$transaction(async (tx) => {
    const actor = await tx.user.findUnique({
      where: { id: input.actorUserId },
      select: { role: true, isActive: true, isSuperAdmin: true },
    });
    if (!actor || actor.role !== UserRole.HASHTI || !actor.isActive) {
      throw new Error("HASHTI_PERMISSION_REQUIRED");
    }
    if (input.profileType === "hashti" && !actor.isSuperAdmin) {
      throw new Error("SUPER_ADMIN_PERMISSION_REQUIRED");
    }

    if (input.profileType === "customer") {
      const current = await tx.customer.findUnique({ where: { id: input.profileId }, select: { id: true, firstName: true, lastName: true } });
      if (!current) throw new Error("PROFILE_NOT_FOUND");
      const updated = await tx.customer.update({
        where: { id: input.profileId }, data: { firstName: input.firstName, lastName: input.lastName },
        select: { id: true, firstName: true, lastName: true },
      });
      await tx.adminAuditLog.create({
        data: {
          actorUserId: input.actorUserId, actorMobile: input.actorMobile, actorRole: UserRole.HASHTI,
          action: "CUSTOMER_PROFILE_UPDATED_BY_HASHTI", targetType: "CUSTOMER_PROFILE", targetId: current.id,
          details: { reason: input.reason, before: { firstName: current.firstName, lastName: current.lastName }, after: { firstName: updated.firstName, lastName: updated.lastName } },
        },
      });
      return { profileType: input.profileType, ...updated };
    }

    if (input.profileType === "owner") {
      const current = await tx.owner.findUnique({ where: { id: input.profileId }, select: { id: true, userId: true, firstName: true, lastName: true } });
      if (!current) throw new Error("PROFILE_NOT_FOUND");
      const updated = await tx.owner.update({
        where: { id: input.profileId }, data: { firstName: input.firstName, lastName: input.lastName },
        select: { id: true, firstName: true, lastName: true },
      });
      await tx.adminAuditLog.create({
        data: {
          actorUserId: input.actorUserId, actorMobile: input.actorMobile, actorRole: UserRole.HASHTI,
          action: "OWNER_PROFILE_UPDATED_BY_HASHTI", targetType: "OWNER", targetId: current.id, targetUserId: current.userId,
          operation: "UPDATE_OWNER_PROFILE", reason: input.reason,
          before: { firstName: current.firstName, lastName: current.lastName },
          after: { firstName: updated.firstName, lastName: updated.lastName },
          details: { reason: input.reason, before: { firstName: current.firstName, lastName: current.lastName }, after: { firstName: updated.firstName, lastName: updated.lastName } },
        },
      });
      return { profileType: input.profileType, ...updated };
    }

    if (input.profileType === "hashti") {
      const current = await tx.hashtiStaff.findUnique({
        where: { id: input.profileId },
        select: { id: true, mobile: true, firstName: true, lastName: true, isActive: true },
      });
      if (!current) throw new Error("PROFILE_NOT_FOUND");

      const updated = await tx.hashtiStaff.update({
        where: { id: input.profileId },
        data: { firstName: input.firstName, lastName: input.lastName },
        select: { id: true, mobile: true, firstName: true, lastName: true, isActive: true },
      });

      await tx.adminAuditLog.create({
        data: {
          actorUserId: input.actorUserId,
          actorMobile: input.actorMobile,
          actorRole: UserRole.HASHTI,
          action: "HASHTI_STAFF_PROFILE_UPDATED_BY_SUPER_ADMIN",
          targetType: "HASHTI_STAFF_PROFILE",
          targetId: current.id,
          details: {
            reason: input.reason,
            targetMobile: current.mobile,
            before: { firstName: current.firstName, lastName: current.lastName, isActive: current.isActive },
            after: { firstName: updated.firstName, lastName: updated.lastName, isActive: updated.isActive },
          },
        },
      });

      return { profileType: input.profileType, ...updated };
    }

    const current = await tx.agent.findUnique({
      where: { id: input.profileId }, select: { id: true, userId: true, firstName: true, lastName: true, agencyName: true, address: true },
    });
    if (!current) throw new Error("PROFILE_NOT_FOUND");
    const updated = await tx.agent.update({
      where: { id: input.profileId },
      data: {
        firstName: input.firstName, lastName: input.lastName,
        ...(input.agencyName !== undefined ? { agencyName: input.agencyName } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
      },
      select: { id: true, firstName: true, lastName: true, agencyName: true, address: true },
    });
    await tx.adminAuditLog.create({
      data: {
        actorUserId: input.actorUserId, actorMobile: input.actorMobile, actorRole: UserRole.HASHTI,
        action: "AGENT_PROFILE_UPDATED_BY_HASHTI", targetType: "AGENT", targetId: current.id, targetUserId: current.userId,
        operation: "UPDATE_AGENT_PROFILE", reason: input.reason,
        before: { firstName: current.firstName, lastName: current.lastName, agencyName: current.agencyName, address: current.address },
        after: { firstName: updated.firstName, lastName: updated.lastName, agencyName: updated.agencyName, address: updated.address },
        details: {
          reason: input.reason,
          before: { firstName: current.firstName, lastName: current.lastName, agencyName: current.agencyName, address: current.address },
          after: { firstName: updated.firstName, lastName: updated.lastName, agencyName: updated.agencyName, address: updated.address },
        },
      },
    });
    return { profileType: input.profileType, ...updated };
  });
}
