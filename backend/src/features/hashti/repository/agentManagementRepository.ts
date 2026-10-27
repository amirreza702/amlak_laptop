import { UserRole, VerificationStatus, type Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";

export type AgentVerificationFilter = "pending" | "verified" | "rejected" | "all";

export interface AgentManagementQuery {
  verificationStatus: AgentVerificationFilter;
  limit: number;
  offset: number;
}

export interface ContactAccessLogQuery {
  agentId?: string;
  from?: Date;
  to?: Date;
  limit: number;
  offset: number;
}

function getUtcMonthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * فهرست مدیریتی مشاوران همراه با اشتراک فعال و سهمیه مصرف ماه جاری.
 * شناسه‌های کاربری و اطلاعات تماس فقط در خروجی ویژه هشتی برمی‌گردند.
 */
export async function findManagedAgents(query: AgentManagementQuery) {
  const verificationStatus = query.verificationStatus === "all"
    ? null
    : ({
        pending: VerificationStatus.PENDING,
        verified: VerificationStatus.VERIFIED,
        rejected: VerificationStatus.REJECTED,
      } as const)[query.verificationStatus];

  const where: Prisma.AgentWhereInput = verificationStatus
    ? { verificationStatus }
    : {};

  const now = new Date();
  const periodStart = getUtcMonthStart();

  const [total, rows] = await Promise.all([
    prisma.agent.count({ where }),
    prisma.agent.findMany({
      where,
      skip: query.offset,
      take: query.limit,
      orderBy: [{ isVerified: "asc" }, { firstName: "asc" }, { lastName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        agencyName: true,
        address: true,
        isVerified: true,
        verificationStatus: true,
        verificationReviewedAt: true,
        verificationReviewedBy: true,
        verificationNotes: true,
        user: {
          select: {
            id: true,
            mobile: true,
            isActive: true,
            createdAt: true,
          },
        },
        subscriptions: {
          where: {
            status: "ACTIVE",
            startsAt: { lte: now },
            OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
          },
          orderBy: { startsAt: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            startsAt: true,
            expiresAt: true,
            subscriptionPlan: {
              select: {
                id: true,
                code: true,
                name: true,
                level: true,
                monthlyContactLimit: true,
              },
            },
          },
        },
        contactAccessUsages: {
          where: { periodStart },
          take: 1,
          select: { usedCount: true, periodStart: true },
        },
      },
    }),
  ]);

  const agents = rows.map(({ subscriptions, contactAccessUsages, ...agent }) => {
    const subscription = subscriptions[0] ?? null;
    const usedCount = contactAccessUsages[0]?.usedCount ?? 0;
    const monthlyLimit = subscription?.subscriptionPlan.monthlyContactLimit ?? 0;

    return {
      ...agent,
      subscription,
      usage: {
        periodStart,
        usedCount,
        monthlyLimit,
        remainingCount: Math.max(0, monthlyLimit - usedCount),
        hasActiveSubscription: Boolean(subscription),
      },
    };
  });

  return { agents, total, periodStart };
}

/**
 * تغییر وضعیت تأیید همراه با ثبت ردپای مدیریتی در یک Transaction.
 * isVerified برای سازگاری با کد قدیمی هم‌زمان حفظ و به‌روزرسانی می‌شود.
 */
export async function updateAgentVerification(input: {
  agentId: string;
  verificationStatus: VerificationStatus;
  reviewerUserId: string;
  reviewerMobile: string;
  notes: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.agent.findUnique({
      where: { id: input.agentId },
      select: { id: true, verificationStatus: true, isVerified: true },
    });

    if (!existing) return null;

    const updated = await tx.agent.update({
      where: { id: input.agentId },
      data: {
        verificationStatus: input.verificationStatus,
        isVerified: input.verificationStatus === VerificationStatus.VERIFIED,
        verificationReviewedAt: new Date(),
        verificationReviewedBy: input.reviewerUserId,
        verificationNotes: input.notes?.trim() || null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        agencyName: true,
        isVerified: true,
        verificationStatus: true,
        verificationReviewedAt: true,
        verificationNotes: true,
        user: {
          select: { id: true, mobile: true, isActive: true },
        },
      },
    });

    await tx.adminAuditLog.create({
      data: {
        actorUserId: input.reviewerUserId,
        actorMobile: input.reviewerMobile,
        actorRole: UserRole.HASHTI,
        action: "AGENT_VERIFICATION_STATUS_CHANGED",
        targetType: "AGENT",
        targetId: input.agentId,
        details: {
          previousStatus: existing.verificationStatus,
          previousIsVerified: existing.isVerified,
          newStatus: input.verificationStatus,
          notes: input.notes?.trim() || null,
        },
      },
    });

    return updated;
  });
}

/**
 * سوابق مصرف اطلاعات تماس مشتری توسط مشاوران؛ فقط برای هشتی.
 * این مدل گزارش، گزارش دسترسی به Contact است نه ثبت عمومی تمام رویدادهای سامانه.
 */
export async function findContactAccessLogs(query: ContactAccessLogQuery) {
  const where = {
    ...(query.agentId ? { agentId: query.agentId } : {}),
    ...(query.from || query.to
      ? {
          accessedAt: {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lte: query.to } : {}),
          },
        }
      : {}),
  };

  const [total, logs] = await Promise.all([
    prisma.contactAccessLog.count({ where }),
    prisma.contactAccessLog.findMany({
      where,
      skip: query.offset,
      take: query.limit,
      orderBy: { accessedAt: "desc" },
      select: {
        id: true,
        accessedAt: true,
        agent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            agencyName: true,
            user: { select: { mobile: true } },
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            user: { select: { mobile: true } },
          },
        },
        searchRequest: {
          select: {
            id: true,
            city: true,
            transactionType: true,
            propertyType: true,
            status: true,
          },
        },
      },
    }),
  ]);

  return { logs, total };
}
