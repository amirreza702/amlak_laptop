import { UserRole } from "@prisma/client";
import { prisma } from "../../../lib/prisma";

export interface ManagedAgentSubscriptionInput {
  agentId: string;
  planId: string;
  startsAt?: Date;
  expiresAt?: Date;
  actorUserId: string;
  actorMobile: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create an agent subscription and its Hashti audit entry atomically.
 * A failed audit write rolls back the subscription change as well.
 */
export async function createManagedAgentSubscription(input: ManagedAgentSubscriptionInput) {
  return prisma.$transaction(async (tx) => {
    const agent = await tx.agent.findUnique({
      where: { id: input.agentId },
      select: { id: true, user: { select: { mobile: true } } },
    });
    if (!agent) throw new Error("Agent not found");

    const now = new Date();
    const activeSubscription = await tx.agentSubscription.findFirst({
      where: {
        agentId: input.agentId,
        status: "ACTIVE",
        startsAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      },
      select: { id: true },
    });
    if (activeSubscription) throw new Error("Agent already has an active subscription");

    const plan = await tx.subscriptionPlan.findUnique({
      where: { id: input.planId },
    });
    if (!plan) throw new Error("Subscription plan not found");
    if (plan.status !== "ACTIVE") throw new Error("Subscription plan is not active");

    const startsAt = input.startsAt;
    if (!startsAt) throw new Error("Subscription start date is required");
    if (input.expiresAt && input.expiresAt < startsAt) {
      throw new Error("Subscription expiration cannot be before start");
    }

    const subscription = await tx.agentSubscription.create({
      data: {
        agentId: input.agentId,
        planId: input.planId,
        startsAt,
        ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
      },
      include: { subscriptionPlan: true },
    });

    await tx.adminAuditLog.create({
      data: {
        actorUserId: input.actorUserId,
        actorMobile: input.actorMobile,
        actorRole: UserRole.HASHTI,
        action: "AGENT_SUBSCRIPTION_CREATED",
        targetType: "AGENT",
        targetId: input.agentId,
        details: {
          agentMobile: agent.user.mobile,
          subscriptionId: subscription.id,
          previous: null,
          after: {
            planId: subscription.planId,
            planCode: subscription.subscriptionPlan.code,
            planName: subscription.subscriptionPlan.name,
            startsAt: subscription.startsAt.toISOString(),
            expiresAt: subscription.expiresAt?.toISOString() ?? null,
          },
        },
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });

    return subscription;
  }, { isolationLevel: "Serializable" });
}

/**
 * Upgrade an agent subscription and record complete before/after state atomically.
 */
export async function upgradeManagedAgentSubscription(input: ManagedAgentSubscriptionInput) {
  return prisma.$transaction(async (tx) => {
    const agent = await tx.agent.findUnique({
      where: { id: input.agentId },
      select: { id: true, user: { select: { mobile: true } } },
    });
    if (!agent) throw new Error("Agent not found");

    const now = new Date();
    const activeSubscription = await tx.agentSubscription.findFirst({
      where: {
        agentId: input.agentId,
        status: "ACTIVE",
        startsAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      },
      include: { subscriptionPlan: true },
      orderBy: { startsAt: "desc" },
    });
    if (!activeSubscription) throw new Error("Active subscription not found");

    const nextPlan = await tx.subscriptionPlan.findUnique({
      where: { id: input.planId },
    });
    if (!nextPlan) throw new Error("Subscription plan not found");
    if (nextPlan.status !== "ACTIVE") throw new Error("Subscription plan is not active");
    if (nextPlan.level <= activeSubscription.subscriptionPlan.level) {
      throw new Error("New subscription plan must be higher than current plan");
    }

    const subscription = await tx.agentSubscription.update({
      where: { id: activeSubscription.id },
      data: { planId: nextPlan.id, updatedAt: new Date() },
      include: { subscriptionPlan: true },
    });

    await tx.adminAuditLog.create({
      data: {
        actorUserId: input.actorUserId,
        actorMobile: input.actorMobile,
        actorRole: UserRole.HASHTI,
        action: "AGENT_SUBSCRIPTION_UPGRADED",
        targetType: "AGENT",
        targetId: input.agentId,
        details: {
          agentMobile: agent.user.mobile,
          subscriptionId: subscription.id,
          previous: {
            planId: activeSubscription.planId,
            planCode: activeSubscription.subscriptionPlan.code,
            planName: activeSubscription.subscriptionPlan.name,
            startsAt: activeSubscription.startsAt.toISOString(),
            expiresAt: activeSubscription.expiresAt?.toISOString() ?? null,
          },
          after: {
            planId: subscription.planId,
            planCode: subscription.subscriptionPlan.code,
            planName: subscription.subscriptionPlan.name,
            startsAt: subscription.startsAt.toISOString(),
            expiresAt: subscription.expiresAt?.toISOString() ?? null,
          },
        },
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });

    return subscription;
  }, { isolationLevel: "Serializable" });
}
