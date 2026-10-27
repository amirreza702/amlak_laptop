/**
 * ============================================================
 * Subscription Plan Repository
 * ============================================================
 *
 * دسترسی مستقیم به جدول SubscriptionPlan
 */

import { prisma } from "../../../lib/prisma";

/**
 * دریافت پلن‌های فعال برای نمایش به مشاوران.
 * فیلدهای برگشتی به اطلاعات لازم برای مقایسه پلن‌ها محدودند.
 */
export const findActiveSubscriptionPlans = async () => {
  return prisma.subscriptionPlan.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      code: true,
      name: true,
      level: true,
      monthlyContactLimit: true,
    },
    orderBy: [{ level: "asc" }, { name: "asc" }],
  });
};

/**
 * پیدا کردن Plan با شناسه
 */
export const findSubscriptionPlanById = async (
  planId: string
) => {
  return prisma.subscriptionPlan.findUnique({
    where: { id: planId },
  });
};
