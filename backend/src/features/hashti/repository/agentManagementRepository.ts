import { UserRole, VerificationStatus, type Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";

export type AgentVerificationFilter = "pending" | "verified" | "rejected" | "all";

export interface AgentManagementQuery {
  verificationStatus: AgentVerificationFilter;
  limit: number;
  offset: number;
}


/**
 * فهرست مدیریتی مشاوران برای بررسی و تأیید هشتی.
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

  const [total, rows] = await Promise.all([
    prisma.agent.count({ where }),
    prisma.agent.findMany({
      where,
      skip: query.offset,
      take: query.limit,
      orderBy: [{ verificationStatus: "asc" }, { firstName: "asc" }, { lastName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        agencyName: true,
        address: true,
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
      },
    }),
  ]);

  return { agents: rows, total };
}

/**
 * تغییر وضعیت تأیید همراه با ثبت ردپای مدیریتی در یک Transaction.
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
      select: { id: true, verificationStatus: true },
    });

    if (!existing) return null;

    const updated = await tx.agent.update({
      where: { id: input.agentId },
      data: {
        verificationStatus: input.verificationStatus,
        verificationReviewedAt: new Date(),
        verificationReviewedBy: input.reviewerUserId,
        verificationNotes: input.notes?.trim() || null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        agencyName: true,
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
          newStatus: input.verificationStatus,
          notes: input.notes?.trim() || null,
        },
      },
    });

    return updated;
  });
}
