/**
 * ============================================================
 * Agent Subscription Repository
 * ============================================================
 *
 * دسترسی مستقیم به AgentSubscription
 */

import { prisma } from "../../../lib/prisma";

/**
 * پیدا کردن Subscription فعال و معتبر Agent
 *
 * اطلاعات Plan نیز همراه Subscription
 * دریافت می‌شود.
 */
export const findActiveAgentSubscription = async (
  agentId: string
) => {
  const now = new Date();

  return prisma.agentSubscription.findFirst({
    where: {
      agentId,
      status: "ACTIVE",
      startsAt: {
        lte: now,
      },
      OR: [
        {
          expiresAt: null,
        },
        {
          expiresAt: {
            gte: now,
          },
        },
      ],
    },
    include: {
      subscriptionPlan: true,
    },
    orderBy: {
      startsAt: "desc",
    },
  });
};

/**
 * ایجاد Subscription جدید
 *
 * Plan از طریق planId مشخص می‌شود.
 */
export const createAgentSubscription = async (
  agentId: string,
  planId: string,
  startsAt: Date,
  expiresAt?: Date
) => {
  return prisma.agentSubscription.create({
    data: {
      agentId,
      planId,
      startsAt,
      expiresAt,
    },
    include: {
      subscriptionPlan: true,
    },
  });
};

/**
 * ارتقای Subscription فعلی
 *
 * فقط Plan تغییر می‌کند.
 */
export const upgradeAgentSubscription = async (
  subscriptionId: string,
  planId: string
) => {
  return prisma.agentSubscription.update({
    where: {
      id: subscriptionId,
    },
    data: {
      planId,
      updatedAt: new Date(),
    },
    include: {
      subscriptionPlan: true,
    },
  });
};