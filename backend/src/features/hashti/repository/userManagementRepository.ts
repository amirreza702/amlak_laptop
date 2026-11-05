import { UserRole, type Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";

export interface ManagedUserQuery {
  query?: string;
  role?: UserRole;
  isActive?: boolean;
  limit: number;
  offset: number;
}
export type ManagedProfileType = "customer" | "owner" | "agent";
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
  const numericSearch = search !== undefined && search.trim() !== "" && Number.isFinite(Number(search)) ? Number(search) : undefined;
  const lower = search?.toLocaleLowerCase();
  const boolSearch = lower === undefined ? undefined : ["true", "yes", "بله", "فعال"].includes(lower) ? true : ["false", "no", "خیر", "غیرفعال"].includes(lower) ? false : undefined;
  const exactRole = search?.trim().toUpperCase();
  const parsedDate = search ? new Date(search) : null;
  const dateRange = parsedDate && !Number.isNaN(parsedDate.getTime())
    ? { gte: new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate()), lt: new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate() + 1) }
    : undefined;
  const visibleRoles = [UserRole.CUSTOMER, UserRole.OWNER, UserRole.AGENT] as const;
  if (query.role && !visibleRoles.some((role) => role === query.role)) throw new Error("INVALID_ROLE");
  const where: Prisma.UserWhereInput = {
    role: query.role ?? { in: [...visibleRoles] },
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(search ? {
      OR: [
        { id: contains(search) }, { mobile: contains(search) },
        { customer: { is: { id: contains(search) } } },
        { customer: { is: { firstName: contains(search) } } },
        { customer: { is: { lastName: contains(search) } } },
        { owner: { is: { id: contains(search) } } },
        { owner: { is: { firstName: contains(search) } } },
        { owner: { is: { lastName: contains(search) } } },
        { agent: { is: { id: contains(search) } } },
        { agent: { is: { firstName: contains(search) } } },
        { agent: { is: { lastName: contains(search) } } },
        { agent: { is: { agencyName: contains(search) } } },
                ...(exactRole && Object.values(UserRole).includes(exactRole as UserRole) ? [{ role: exactRole as UserRole }] : []),
        ...(boolSearch !== undefined ? [{ isActive: boolSearch }] : []),
        ...(dateRange ? [{ createdAt: dateRange }, { updatedAt: dateRange }] : []),

      ],
    } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip: query.offset,
      take: query.limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, mobile: true, role: true, isActive: true, createdAt: true, updatedAt: true,
        customer: { select: { id: true, firstName: true, lastName: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
        agent: { select: {
          id: true, firstName: true, lastName: true, agencyName: true,
        } },
      },
    }),
  ]);

  return { users: rows, total };
}

export async function findManagedUserRole(userId: string) {
  return prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
}

export async function updateManagedUserStatus(input: {
  userId: string; isActive: boolean; reason: string; actorUserId: string; actorMobile: string;
}) {
  return prisma.$transaction(async (tx) => {
    const actor = await tx.user.findUnique({
      where: { id: input.actorUserId },
      select: { role: true, isActive: true, isSuperAdmin: true, adminPermissions: true },
    });
    if (!actor || actor.role !== UserRole.HASHTI || !actor.isActive) {
      throw new Error("HASHTI_PERMISSION_REQUIRED");
    }

    const current = await tx.user.findUnique({
      where: { id: input.userId },
      select: { id: true, mobile: true, role: true, isActive: true, isSuperAdmin: true },
    });
    if (!current) throw new Error("USER_NOT_FOUND");
    if (current.role === UserRole.HASHTI && !actor.isSuperAdmin && !actor.adminPermissions.includes("STAFF_MANAGE")) {
      throw new Error("SUPER_ADMIN_PERMISSION_REQUIRED");
    }
    if (current.isSuperAdmin && !input.isActive) {
      throw new Error("SUPER_ADMIN_CANNOT_BE_DISABLED");
    }
    if (current.id === input.actorUserId) throw new Error("CANNOT_CHANGE_OWN_STATUS");

    if (current.isActive === input.isActive) return { user: current, changed: false };

    const updated = await tx.user.update({
      where: { id: current.id },
      data: { isActive: input.isActive },
      select: { id: true, mobile: true, role: true, isActive: true, isSuperAdmin: true, updatedAt: true },
    });
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

export async function updateManagedProfile(input: ManagedProfileUpdate) {
  return prisma.$transaction(async (tx) => {
    const actor = await tx.user.findUnique({
      where: { id: input.actorUserId },
      select: { role: true, isActive: true, isSuperAdmin: true },
    });
    if (!actor || actor.role !== UserRole.HASHTI || !actor.isActive) {
      throw new Error("HASHTI_PERMISSION_REQUIRED");
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
