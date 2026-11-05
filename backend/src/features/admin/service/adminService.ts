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


async function requireAdminServicePermission(actorUserId: string, permission: AdminPermission) {
  const account = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { id: true, role: true, isActive: true, isSuperAdmin: true, adminPermissions: true },
  });
  const allowed = Boolean(account) && await authorize("admin", "PERMISSION", {
    actor: { id: actorUserId, role: account!.role, isActive: account!.isActive },
    resource: { data: {
      isActive: account!.isActive,
      isSuperAdmin: account!.isSuperAdmin,
      permissions: account!.adminPermissions,
    } },
    metadata: { permission },
  });
  if (!allowed) throw new Error("ADMIN_PERMISSION_FORBIDDEN");
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
  if (input.role && !Object.values(UserRole).includes(input.role as UserRole)) throw new Error("INVALID_ROLE");
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
  await requireAdminServicePermission(input.actorUserId, input.permission ?? "USERS_MANAGE");
  return setUserStatus({ ...input, reason: reasonValue(input.reason) });
}
export async function adminSetAgentVerification(input: { actorUserId: string; agentId: string; isVerified: boolean; reason: unknown }) {
  await requireAdminServicePermission(input.actorUserId, "AGENTS_MANAGE");
  return setAgentVerification({ ...input, reason: reasonValue(input.reason) });
}
export async function adminUpdateStaffPermissions(input: { actorUserId: string; userId: string; permissions: unknown; reason: unknown }) {
  await requireAdminServicePermission(input.actorUserId, "STAFF_MANAGE");
  if (!Array.isArray(input.permissions) || input.permissions.some(p => typeof p !== "string" || !(ADMIN_PERMISSIONS as readonly string[]).includes(p))) throw new Error("INVALID_PERMISSIONS");
  return updateStaffPermissions({ actorUserId: input.actorUserId, userId: input.userId, permissions: input.permissions as AdminPermission[], reason: reasonValue(input.reason) });
}
export async function adminAudit(actorUserId: string, input: { targetType?: string; targetId?: string; targetUserId?: string; actorUserId?: string; page: number; limit: number }) {
  await requireAdminServicePermission(actorUserId, "AUDIT_READ");
  pageArgs(input.page, input.limit); return listAudit(input);
}
export async function adminCreateStaffAccount(input: { actorUserId: string; mobile: unknown; password: unknown; permissions: unknown; reason: unknown }) {
  await requireAdminServicePermission(input.actorUserId, "STAFF_MANAGE");
  if (!Array.isArray(input.permissions) || input.permissions.some(p => typeof p !== "string" || !(ADMIN_PERMISSIONS as readonly string[]).includes(p))) throw new Error("INVALID_PERMISSIONS");
  const mobile = safeMobile(input.mobile);
  const passwordHash = await bcrypt.hash(safePassword(input.password), 12);
  return createStaffAccount({
    actorUserId: input.actorUserId, mobile, passwordHash,
    permissions: input.permissions as AdminPermission[], reason: reasonValue(input.reason),
  });
}


export const adminStaffAccounts = async (actorUserId: string) => {
  await requireAdminServicePermission(actorUserId, "STAFF_MANAGE");
  return listStaffAccounts();
};
