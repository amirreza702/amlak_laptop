import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "../../../lib/prisma";

export const ADMIN_PERMISSIONS = [
  "USERS_READ",
  "USERS_MANAGE",
  "OWNERS_MANAGE",
  "AGENTS_MANAGE",
  "STAFF_MANAGE",
  "AUDIT_READ",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

const userSelect = {
  id: true, mobile: true, role: true, isActive: true, isSuperAdmin: true,
  adminPermissions: true, createdAt: true, updatedAt: true,
  customer: { select: { id: true, firstName: true, lastName: true } },
  owner: { select: { id: true, firstName: true, lastName: true } },
  agent: { select: { id: true, firstName: true, lastName: true, agencyName: true, address: true, isVerified: true,
    subscriptions: { orderBy: { createdAt: "desc" as const }, take: 1, select: { id: true, status: true, planId: true, startsAt: true, expiresAt: true, subscriptionPlan: { select: { code: true, name: true, level: true } } } },
  } },
} satisfies Prisma.UserSelect;

export async function createInitialSuperAdmin(data: { mobile: string; passwordHash: string }) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.count({ where: { isSuperAdmin: true } });
    if (existing > 0) throw new Error("SUPER_ADMIN_ALREADY_EXISTS");
    const user = await tx.user.create({
      data: { mobile: data.mobile, passwordHash: data.passwordHash, role: UserRole.HASHTI, isSuperAdmin: true },
      select: { id: true, mobile: true, role: true, isSuperAdmin: true, createdAt: true },
    });
    await tx.adminAuditLog.create({
      data: { actorUserId: user.id, action: "BOOTSTRAP_SUPER_ADMIN", targetUserId: user.id, targetType: "USER", targetId: user.id,
        operation: "BOOTSTRAP_SUPER_ADMIN", reason: "Initial secure bootstrap", before: Prisma.JsonNull,
        after: { mobile: user.mobile, role: user.role, isSuperAdmin: true } },
    });
    return user;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function getAdminUser(userId: string) {
  return prisma.user.findUnique({ where: { id: userId }, select: userSelect });
}

export async function listAdminUsers(data: { search?: string; role?: UserRole; isActive?: boolean; page: number; limit: number }) {
  const where: Prisma.UserWhereInput = {};
  if (data.role) where.role = data.role;
  if (typeof data.isActive === "boolean") where.isActive = data.isActive;
  if (data.search?.trim()) {
    const search = data.search.trim();
    where.OR = [
      { mobile: { contains: search } },
      { customer: { is: { OR: [{ firstName: { contains: search, mode: "insensitive" } }, { lastName: { contains: search, mode: "insensitive" } }] } } },
      { owner: { is: { OR: [{ firstName: { contains: search, mode: "insensitive" } }, { lastName: { contains: search, mode: "insensitive" } }] } } },
      { agent: { is: { OR: [{ firstName: { contains: search, mode: "insensitive" } }, { lastName: { contains: search, mode: "insensitive" } }, { agencyName: { contains: search, mode: "insensitive" } }] } } },
    ];
  }
  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({ where, select: userSelect, orderBy: { createdAt: "desc" }, skip: (data.page - 1) * data.limit, take: data.limit }),
    prisma.user.count({ where }),
  ]);
  return { items, total };
}

export async function listOwners(data: { search?: string; isActive?: boolean; page: number; limit: number }) {
  const where: Prisma.OwnerWhereInput = {};
  if (typeof data.isActive === "boolean") where.user = { is: { isActive: data.isActive } };
  if (data.search?.trim()) {
    const q = data.search.trim();
    where.OR = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { user: { is: { mobile: { contains: q } } } },
    ];
  }
  const [items, total] = await prisma.$transaction([
    prisma.owner.findMany({ where, include: { user: { select: { id: true, mobile: true, isActive: true, createdAt: true } }, _count: { select: { properties: true, evaluations: true } } }, orderBy: { user: { createdAt: "desc" } }, skip: (data.page - 1) * data.limit, take: data.limit }),
    prisma.owner.count({ where }),
  ]);
  return { items, total };
}

export async function getOwner(ownerId: string) {
  return prisma.owner.findUnique({ where: { id: ownerId }, include: { user: { select: { id: true, mobile: true, role: true, isActive: true, createdAt: true, updatedAt: true } }, properties: { include: { property: { select: { id: true, city: true, district: true, address: true, status: true } } } }, _count: { select: { properties: true, evaluations: true } } } });
}

export async function listAgents(data: { search?: string; isActive?: boolean; isVerified?: boolean; subscriptionStatus?: string; page: number; limit: number }) {
  const where: Prisma.AgentWhereInput = {};
  if (typeof data.isActive === "boolean") where.user = { is: { isActive: data.isActive } };
  if (typeof data.isVerified === "boolean") where.isVerified = data.isVerified;
  if (data.subscriptionStatus) where.subscriptions = { some: { status: data.subscriptionStatus } };
  if (data.search?.trim()) {
    const q = data.search.trim();
    where.OR = [
      { firstName: { contains: q, mode: "insensitive" } }, { lastName: { contains: q, mode: "insensitive" } },
      { agencyName: { contains: q, mode: "insensitive" } }, { user: { is: { mobile: { contains: q } } } },
    ];
  }
  const [items, total] = await prisma.$transaction([
    prisma.agent.findMany({ where, include: { user: { select: { id: true, mobile: true, isActive: true, createdAt: true } }, subscriptions: { orderBy: { createdAt: "desc" }, take: 5, include: { subscriptionPlan: true } }, _count: { select: { propertyAgents: true, evaluations: true } } }, orderBy: { user: { createdAt: "desc" } }, skip: (data.page - 1) * data.limit, take: data.limit }),
    prisma.agent.count({ where }),
  ]);
  return { items, total };
}

export async function getAgent(agentId: string) {
  return prisma.agent.findUnique({ where: { id: agentId }, include: { user: { select: { id: true, mobile: true, role: true, isActive: true, createdAt: true, updatedAt: true } }, subscriptions: { orderBy: { createdAt: "desc" }, include: { subscriptionPlan: true } }, _count: { select: { propertyAgents: true, evaluations: true, contactAccessLogs: true } } } });
}

async function writeAudit(tx: Prisma.TransactionClient, data: {
  actorUserId: string; targetUserId?: string | null; targetType: string; targetId: string;
  operation: string; reason: string; before: unknown; after: unknown;
}) {
  await tx.adminAuditLog.create({
    data: {
      actorUserId: data.actorUserId, action: data.operation, targetUserId: data.targetUserId ?? null,
      targetType: data.targetType, targetId: data.targetId, operation: data.operation, reason: data.reason,
      before: data.before === null ? Prisma.JsonNull : data.before as Prisma.InputJsonValue,
      after: data.after === null ? Prisma.JsonNull : data.after as Prisma.InputJsonValue,
    },
  });
}

export async function setUserStatus(data: { actorUserId: string; userId: string; isActive: boolean; reason: string }) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.user.findUnique({ where: { id: data.userId }, select: { id: true, mobile: true, role: true, isActive: true } });
    if (!before) throw new Error("USER_NOT_FOUND");
    if (before.role === UserRole.HASHTI && data.isActive === false) {
      const superAdmin = await tx.user.findUnique({ where: { id: data.userId }, select: { isSuperAdmin: true } });
      if (superAdmin?.isSuperAdmin) throw new Error("SUPER_ADMIN_CANNOT_BE_DISABLED");
    }
    const after = await tx.user.update({ where: { id: data.userId }, data: { isActive: data.isActive }, select: { id: true, mobile: true, role: true, isActive: true } });
    if (data.isActive === false) await tx.session.deleteMany({ where: { userId: data.userId } });
    await writeAudit(tx, { actorUserId: data.actorUserId, targetUserId: data.userId, targetType: "USER", targetId: data.userId, operation: "SET_ACCOUNT_STATUS", reason: data.reason, before, after });
    return after;
  });
}

export async function setAgentVerification(data: { actorUserId: string; agentId: string; isVerified: boolean; reason: string }) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.agent.findUnique({ where: { id: data.agentId }, include: { user: { select: { id: true, mobile: true, isActive: true } } } });
    if (!before) throw new Error("AGENT_NOT_FOUND");
    const after = await tx.agent.update({ where: { id: data.agentId }, data: { isVerified: data.isVerified }, include: { user: { select: { id: true, mobile: true, isActive: true } } } });
    await writeAudit(tx, { actorUserId: data.actorUserId, targetUserId: before.userId, targetType: "AGENT", targetId: data.agentId, operation: "SET_AGENT_VERIFICATION", reason: data.reason, before: { isVerified: before.isVerified }, after: { isVerified: after.isVerified } });
    return after;
  });
}

export async function setAgentSubscription(data: { actorUserId: string; agentId: string; planId: string; status: string; startsAt: Date; expiresAt: Date | null; reason: string }) {
  return prisma.$transaction(async (tx) => {
    const agent = await tx.agent.findUnique({ where: { id: data.agentId }, select: { id: true, userId: true } });
    if (!agent) throw new Error("AGENT_NOT_FOUND");
    const before = await tx.agentSubscription.findFirst({ where: { agentId: data.agentId }, orderBy: { createdAt: "desc" }, include: { subscriptionPlan: { select: { code: true, name: true } } } });
    const plan = await tx.subscriptionPlan.findUnique({ where: { id: data.planId }, select: { id: true, status: true } });
    if (!plan) throw new Error("SUBSCRIPTION_PLAN_NOT_FOUND");
    if (plan.status !== "ACTIVE") throw new Error("SUBSCRIPTION_PLAN_INACTIVE");
    const after = await tx.agentSubscription.create({ data: { agentId: data.agentId, planId: data.planId, status: data.status, startsAt: data.startsAt, expiresAt: data.expiresAt }, include: { subscriptionPlan: true } });
    await writeAudit(tx, { actorUserId: data.actorUserId, targetUserId: agent.userId, targetType: "AGENT_SUBSCRIPTION", targetId: after.id, operation: "SET_AGENT_SUBSCRIPTION", reason: data.reason, before, after });
    return after;
  });
}

export async function updateStaffPermissions(data: { actorUserId: string; userId: string; permissions: AdminPermission[]; reason: string }) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.user.findUnique({ where: { id: data.userId }, select: { id: true, mobile: true, role: true, isSuperAdmin: true, adminPermissions: true } });
    if (!before) throw new Error("USER_NOT_FOUND");
    if (before.role !== UserRole.HASHTI) throw new Error("NOT_STAFF_ACCOUNT");
    if (before.isSuperAdmin) throw new Error("CANNOT_EDIT_SUPER_ADMIN");
    if (data.actorUserId === data.userId) throw new Error("CANNOT_EDIT_OWN_PERMISSIONS");
    const after = await tx.user.update({ where: { id: data.userId }, data: { adminPermissions: data.permissions }, select: { id: true, mobile: true, role: true, isSuperAdmin: true, adminPermissions: true } });
    await writeAudit(tx, { actorUserId: data.actorUserId, targetUserId: data.userId, targetType: "STAFF", targetId: data.userId, operation: "UPDATE_STAFF_PERMISSIONS", reason: data.reason, before, after });
    return after;
  });
}

export async function listAudit(data: { targetType?: string; targetId?: string; targetUserId?: string; actorUserId?: string; page: number; limit: number }) {
  const where: Prisma.AdminAuditLogWhereInput = {};
  if (data.targetType) where.targetType = data.targetType;
  if (data.targetId) where.targetId = data.targetId;
  if (data.targetUserId) where.targetUserId = data.targetUserId;
  if (data.actorUserId) where.actorUserId = data.actorUserId;
  const [items, total] = await prisma.$transaction([
    prisma.adminAuditLog.findMany({ where, include: { actor: { select: { id: true, mobile: true } }, target: { select: { id: true, mobile: true, role: true } } }, orderBy: { createdAt: "desc" }, skip: (data.page - 1) * data.limit, take: data.limit }),
    prisma.adminAuditLog.count({ where }),
  ]);
  return { items, total };
}

export async function listSubscriptionPlans() {
  return prisma.subscriptionPlan.findMany({ where: { status: "ACTIVE" }, orderBy: [{ level: "asc" }, { name: "asc" }], select: { id: true, code: true, name: true, level: true, monthlyContactLimit: true, status: true } });
}


export async function createStaffAccount(data: {
  actorUserId: string; mobile: string; passwordHash: string; permissions: AdminPermission[]; reason: string;
}) {
  try {
    return await prisma.$transaction(async (tx) => {
      const before = null;
      const user = await tx.user.create({
        data: { mobile: data.mobile, passwordHash: data.passwordHash, role: UserRole.HASHTI, adminPermissions: data.permissions },
        select: { id: true, mobile: true, role: true, isActive: true, isSuperAdmin: true, adminPermissions: true, createdAt: true },
      });
      await writeAudit(tx, { actorUserId: data.actorUserId, targetUserId: user.id, targetType: "STAFF", targetId: user.id,
        operation: "CREATE_STAFF_ACCOUNT", reason: data.reason, before, after: user });
      return user;
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") throw new Error("STAFF_MOBILE_EXISTS");
    throw error;
  }
}


export async function listStaffAccounts() {
  return prisma.user.findMany({
    where: { role: UserRole.HASHTI },
    select: { id: true, mobile: true, role: true, isActive: true, isSuperAdmin: true, adminPermissions: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}
