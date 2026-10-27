/**
 * ============================================================
 * Agent Subscription Service
 * ============================================================
 *
 * منطق کسب‌وکار مربوط به Subscription Agent
 */

import {
  createAgentSubscription,
  findActiveAgentSubscription,
  upgradeAgentSubscription,
} from "../repository/agentSubscriptionRepository";

import {
  findSubscriptionPlanById,
} from "../repository/subscriptionPlanRepository";

import { findActiveSubscriptionPlans } from "../repository/subscriptionPlanRepository";
import { findContactAccessUsage } from "../repository/contactAccessUsageRepository";

/**
 * ایجاد Subscription جدید
 *
 * فقط زمانی مجاز است که Agent
 * Subscription فعال نداشته باشد.
 */
export const createAgentSubscriptionService = async (
  agentId: string,
  planId: string,
  startsAt: Date,
  expiresAt?: Date
) => {
  const activeSubscription =
    await findActiveAgentSubscription(agentId);

  if (activeSubscription) {
    throw new Error(
      "Agent already has an active subscription"
    );
  }

  const plan =
    await findSubscriptionPlanById(planId);

  if (!plan) {
    throw new Error(
      "Subscription plan not found"
    );
  }

  if (plan.status !== "ACTIVE") {
    throw new Error(
      "Subscription plan is not active"
    );
  }

  if (
    expiresAt &&
    expiresAt < startsAt
  ) {
    throw new Error(
      "Subscription expiration cannot be before start"
    );
  }

  return createAgentSubscription(
    agentId,
    planId,
    startsAt,
    expiresAt
  );
};

/**
 * ارتقای Subscription فعال
 *
 * فقط زمانی مجاز است که:
 *
 * level پلن جدید
 * >
 * level پلن فعلی
 *
 * باشد.
 */
export const upgradeAgentSubscriptionService = async (
  agentId: string,
  planId: string
) => {
  const activeSubscription =
    await findActiveAgentSubscription(agentId);

  if (!activeSubscription) {
    throw new Error(
      "Active subscription not found"
    );
  }

  const newPlan =
    await findSubscriptionPlanById(planId);

  if (!newPlan) {
    throw new Error(
      "Subscription plan not found"
    );
  }

  if (newPlan.status !== "ACTIVE") {
    throw new Error(
      "Subscription plan is not active"
    );
  }

  const currentPlanLevel =
    activeSubscription.subscriptionPlan.level;

  if (
    newPlan.level <= currentPlanLevel
  ) {
    throw new Error(
      "New subscription plan must be higher than current plan"
    );
  }

  return upgradeAgentSubscription(
    activeSubscription.id,
    planId
  );
};

/**
 * ابتدای ماه جاری بر اساس UTC؛ باید با منطق ثبت مصرف تماس یکسان باشد.
 */
const getCurrentUsagePeriodStart = (): Date => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
};

/**
 * فهرست پلن‌های فعال برای صفحه اشتراک مشاور.
 */
export const getActiveSubscriptionPlansService = async () => {
  return findActiveSubscriptionPlans();
};

/**
 * اشتراک فعال مشاور؛ null یعنی در حال حاضر اشتراک فعالی ندارد.
 */
export const getAgentCurrentSubscriptionService = async (agentId: string) => {
  const subscription = await findActiveAgentSubscription(agentId);

  if (!subscription) {
    return null;
  }

  return {
    id: subscription.id,
    status: subscription.status,
    startsAt: subscription.startsAt,
    expiresAt: subscription.expiresAt,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
    plan: {
      id: subscription.subscriptionPlan.id,
      code: subscription.subscriptionPlan.code,
      name: subscription.subscriptionPlan.name,
      level: subscription.subscriptionPlan.level,
      monthlyContactLimit: subscription.subscriptionPlan.monthlyContactLimit,
    },
  };
};

/**
 * مصرف ماه جاری و سهمیه باقی‌مانده مشاور.
 * این endpoint فقط می‌خواند و در صورت نبود رکورد، ردیف مصرف نمی‌سازد.
 */
export const getAgentContactUsageService = async (agentId: string) => {
  const periodStart = getCurrentUsagePeriodStart();
  const [subscription, usage] = await Promise.all([
    findActiveAgentSubscription(agentId),
    findContactAccessUsage(agentId, periodStart),
  ]);

  const usedCount = usage?.usedCount ?? 0;
  const monthlyLimit = subscription?.subscriptionPlan.monthlyContactLimit ?? 0;

  return {
    periodStart,
    usedCount,
    monthlyLimit,
    remainingCount: Math.max(0, monthlyLimit - usedCount),
    hasActiveSubscription: Boolean(subscription),
    subscriptionPlan: subscription
      ? {
          id: subscription.subscriptionPlan.id,
          code: subscription.subscriptionPlan.code,
          name: subscription.subscriptionPlan.name,
          level: subscription.subscriptionPlan.level,
        }
      : null,
  };
};
