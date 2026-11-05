import bcrypt from "bcrypt";
import {
  ADMIN_PERMISSIONS, createInitialSuperAdmin, getAdminUser, listAdminUsers,
  listOwners, getOwner, listAgents, getAgent, setUserStatus, setAgentVerification,
  updateStaffPermissions, listAudit,
  type AdminPermission, createStaffAccount, listStaffAccounts,
} from "../repository/adminRepository";
import { UserRole } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { authorize } from "../../../shared/authorization/authorization.core";


export async function hasAdminServicePermission(actorUserId: string, permission: AdminPermission): Promise<boolean> {
  const account = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { id: true, role: true, isActive: true, isSuperAdmin: true, adminPermissions: true },
  });
  if (!account) return false;
  return authorize("admin", "PERMISSION", {
    actor: { id: actorUserId, role: account.role, isActive: account.isActive },
    resource: { data: {
      isActive: account.isActive,
      isSuperAdmin: account.isSuperAdmin,
      permissions: account.adminPermissions,
    } },
    metadata: { permission },
  });
}

export async function requireAdminServicePermission(actorUserId: string, permission: AdminPermission) {
  if (!(await hasAdminServicePermission(actorUserId, permission))) {
    throw new Error("ADMIN_PERMISSION_FORBIDDEN");
  }
}

export async function requireSuperAdminServicePermission(actorUserId: string) {
  const account = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { role: true, isActive: true, isSuperAdmin: true, adminPermissions: true },
  });
  const allowed = Boolean(account) && await authorize("admin", "SUPER_ADMIN", {
    actor: { id: actorUserId, role: account!.role, isActive: account!.isActive },
    resource: { data: {
      isActive: account!.isActive,
      isSuperAdmin: account!.isSuperAdmin,
      permissions: account!.adminPermissions,
    } },
  });
  if (!allowed) throw new Error("SUPER_ADMIN_PERMISSION_REQUIRED");
}

/** A delegated staff manager may only grant permissions they personally hold, never STAFF_MANAGE. */
async function validateAssignableStaffPermissions(actorUserId: string, permissions: AdminPermission[]) {
  const actor = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { role: true, isActive: true, isSuperAdmin: true, adminPermissions: true },
  });
  if (!actor || actor.role !== UserRole.HASHTI || actor.isActive !== true) {
    throw new Error("ADMIN_PERMISSION_FORBIDDEN");
  }
  if (actor.isSuperAdmin) return;
  const assignable = new Set(actor.adminPermissions.filter((permission) => permission !== "STAFF_MANAGE"));
  if (permissions.some((permission) => permission === "STAFF_MANAGE" || !assignable.has(permission))) {
    throw new Error("ADMIN_PERMISSION_GRANT_FORBIDDEN");
  }
}

function pageArgs(page: number, limit: number) {
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("INVALID_PAGINATION");
  }
}
function reasonValue(reason: unknown): string {
  if (typeof reason !== "string" || reason.trim().length < 3 || reason.trim().length > 1000) {
    throw new Error("REASON_REQUIRED");
  }
  return reason.trim();
}
function safeMobile(mobile: unknown) {
  if (typeof mobile !== "string" || !/^09\d{9}$/.test(mobile.trim())) throw new Error("INVALID_MOBILE");
  return mobile.trim();
}
function safePassword(password: unknown) {
  if (typeof password !== "string" || password.length < 12) throw new Error("PASSWORD_TOO_SHORT");
  return password;
}

export async function bootstrapSuperAdmin(input: { mobile: unknown; password: unknown; secret: unknown }) {
  const expected = process.env.HASHTI_BOOTSTRAP_SECRET;
  if (!expected || expected.length < 32 || typeof input.secret !== "string" || input.secret.length !== expected.length) throw new Error("BOOTSTRAP_FORBIDDEN");
  const { timingSafeEqual } = await import("crypto");
  if (!timingSafeEqual(Buffer.from(input.secret), Buffer.from(expected))) throw new Error("BOOTSTRAP_FORBIDDEN");
  const mobile = safeMobile(input.mobile);
  const passwordHash = await bcrypt.hash(safePassword(input.password), 12);
  return createInitialSuperAdmin({ mobile, passwordHash });
}

export async function adminUsers(actorUserId: string, input: { search?: string; role?: string; isActive?: boolean; page: number; limit: number }) {
  await requireAdminServicePermission(actorUserId, "USERS_READ");
  pageArgs(input.page, input.limit);
  const visibleRoles = [UserRole.CUSTOMER, UserRole.OWNER, UserRole.AGENT];
  if (input.role && !visibleRoles.some((role) => role === input.role)) throw new Error("INVALID_ROLE");
  return listAdminUsers({ ...input, role: input.role as UserRole | undefined });
}
export const adminUserDetails = async (actorUserId: string, userId: string) => {
  await requireAdminServicePermission(actorUserId, "USERS_READ");
  const user = await getAdminUser(userId);
  if (!user) throw new Error("USER_NOT_FOUND");
  return user;
};
export async function adminOwners(actorUserId: string, input: { search?: string; isActive?: boolean; page: number; limit: number }) {
  await requireAdminServicePermission(actorUserId, "OWNERS_MANAGE");
  pageArgs(input.page, input.limit); return listOwners(input);
}
export const adminOwnerDetails = async (actorUserId: string, ownerId: string) => {
  await requireAdminServicePermission(actorUserId, "OWNERS_MANAGE");
  const owner = await getOwner(ownerId); if (!owner) throw new Error("OWNER_NOT_FOUND"); return owner;
};
export async function adminAgents(actorUserId: string, input: { search?: string; isActive?: boolean; isVerified?: boolean; page: number; limit: number }) {
  await requireAdminServicePermission(actorUserId, "AGENTS_MANAGE");
  pageArgs(input.page, input.limit); return listAgents(input);
}
export const adminAgentDetails = async (actorUserId: string, agentId: string) => {
  await requireAdminServicePermission(actorUserId, "AGENTS_MANAGE");
  const agent = await getAgent(agentId); if (!agent) throw new Error("AGENT_NOT_FOUND"); return agent;
};
export async function adminSetUserStatus(input: { actorUserId: string; userId: string; isActive: boolean; reason: unknown; permission?: AdminPermission }) {
  const target = await prisma.user.findUnique({ where: { id: input.userId }, select: { role: true } });
  if (!target) throw new Error("USER_NOT_FOUND");
  const requiredPermission: AdminPermission = target.role === UserRole.HASHTI
    ? "STAFF_MANAGE"
    : target.role === UserRole.OWNER
      ? "OWNERS_MANAGE"
      : target.role === UserRole.AGENT
        ? "AGENTS_MANAGE"
        : "USERS_MANAGE";
  if (input.permission && input.permission !== requiredPermission) throw new Error("ADMIN_PERMISSION_FORBIDDEN");
  await requireAdminServicePermission(input.actorUserId, requiredPermission);
  return setUserStatus({ ...input, reason: reasonValue(input.reason) });
}
export async function adminSetAgentVerification(input: { actorUserId: string; agentId: string; isVerified: boolean; reason: unknown }) {
  await requireAdminServicePermission(input.actorUserId, "AGENTS_MANAGE");
  return setAgentVerification({ ...input, reason: reasonValue(input.reason) });
}
export async function adminUpdateStaffPermissions(input: { actorUserId: string; userId: string; permissions: unknown; reason: unknown }) {
  await requireAdminServicePermission(input.actorUserId, "STAFF_MANAGE");
  if (!Array.isArray(input.permissions) || input.permissions.some(p => typeof p !== "string" || !(ADMIN_PERMISSIONS as readonly string[]).includes(p))) throw new Error("INVALID_PERMISSIONS");
  const permissions = input.permissions as AdminPermission[];
  await validateAssignableStaffPermissions(input.actorUserId, permissions);
  return updateStaffPermissions({ actorUserId: input.actorUserId, userId: input.userId, permissions, reason: reasonValue(input.reason) });
}
export async function adminAudit(actorUserId: string, input: { targetType?: string; targetId?: string; targetUserId?: string; actorUserId?: string; page: number; limit: number }) {
  await requireAdminServicePermission(actorUserId, "AUDIT_READ");
  pageArgs(input.page, input.limit); return listAudit(input);
}
export async function adminCreateStaffAccount(input: { actorUserId: string; mobile: unknown; password: unknown; permissions: unknown; reason: unknown }) {
  await requireAdminServicePermission(input.actorUserId, "STAFF_MANAGE");
  if (!Array.isArray(input.permissions) || input.permissions.some(p => typeof p !== "string" || !(ADMIN_PERMISSIONS as readonly string[]).includes(p))) throw new Error("INVALID_PERMISSIONS");
  const permissions = input.permissions as AdminPermission[];
  await validateAssignableStaffPermissions(input.actorUserId, permissions);
  const mobile = safeMobile(input.mobile);
  const passwordHash = await bcrypt.hash(safePassword(input.password), 12);
  return createStaffAccount({
    actorUserId: input.actorUserId, mobile, passwordHash,
    permissions, reason: reasonValue(input.reason),
  });
}


export const adminStaffAccounts = async (actorUserId: string) => {
  await requireAdminServicePermission(actorUserId, "STAFF_MANAGE");
  return listStaffAccounts();
};
