/**
 * ============================================================
 * Evaluation Repository
 * ============================================================
 *
 * این Repository فقط مسئول ارتباط مستقیم
 * با دیتابیس است.
 *
 * منطق Business در Service قرار می‌گیرد.
 *
 * اهداف قابل ارزیابی:
 *
 * - Customer
 * - Owner
 * - Agent
 * - Property
 *
 * ============================================================
 */

import { prisma } from "../../../lib/prisma";

/**
 * ============================================================
 * ایجاد Evaluation
 * ============================================================
 */
export const createEvaluation = async (
  data: Parameters<
    typeof prisma.evaluation.create
  >[0]["data"]
) => {
  return prisma.evaluation.create({
    data,
  });
};

/**
 * ============================================================
 * پیدا کردن Evaluation بر اساس ID
 * ============================================================
 */
export const findEvaluationById = async (
  id: string
) => {
  return prisma.evaluation.findUnique({
    where: {
      id,
    },
  });
};

/**
 * ============================================================
 * پیدا کردن User بر اساس ID
 * ============================================================
 *
 * فقط اطلاعات موردنیاز برای تشخیص نقش ارزیاب
 * از دیتابیس خوانده می‌شود.
 */
export const findEvaluatorUserById = async (
  userId: string
) => {
  return prisma.user.findUnique({
    where: {
      id: userId,
    },

    select: {
      id: true,
      role: true,
      isActive: true,
    },
  });
};

/**
 * ============================================================
 * بررسی وجود Customer
 * ============================================================
 */
export const findCustomerById = async (
  customerId: string
) => {
  return prisma.customer.findUnique({
    where: {
      id: customerId,
    },

    select: {
      id: true,
      userId: true,
    },
  });
};

/**
 * ============================================================
 * بررسی وجود Owner
 * ============================================================
 */
export const findOwnerById = async (
  ownerId: string
) => {
  return prisma.owner.findUnique({
    where: {
      id: ownerId,
    },

    select: {
      id: true,
      userId: true,
    },
  });
};

/**
 * ============================================================
 * بررسی وجود Agent
 * ============================================================
 */
export const findAgentById = async (
  agentId: string
) => {
  return prisma.agent.findUnique({
    where: {
      id: agentId,
    },

    select: {
      id: true,
      userId: true,
    },
  });
};

/**
 * ============================================================
 * پیدا کردن Customer بر اساس User ID
 * ============================================================
 *
 * برای تشخیص اینکه evaluatorUserId
 * متعلق به کدام Customer است.
 */
export const findCustomerByUserId = async (
  userId: string
) => {
  return prisma.customer.findUnique({
    where: {
      userId,
    },

    select: {
      id: true,
      userId: true,
    },
  });
};

/**
 * ============================================================
 * پیدا کردن Owner بر اساس User ID
 * ============================================================
 */
export const findOwnerByUserId = async (
  userId: string
) => {
  return prisma.owner.findUnique({
    where: {
      userId,
    },

    select: {
      id: true,
      userId: true,
    },
  });
};

/**
 * ============================================================
 * پیدا کردن Agent بر اساس User ID
 * ============================================================
 */
export const findAgentByUserId = async (
  userId: string
) => {
  return prisma.agent.findUnique({
    where: {
      userId,
    },

    select: {
      id: true,
      userId: true,
    },
  });
};

/**
 * ============================================================
 * بررسی وجود Property
 * ============================================================
 */
export const findPropertyById = async (
  propertyId: string
) => {
  return prisma.property.findUnique({
    where: {
      id: propertyId,
    },

    select: {
      id: true,
    },
  });
};

/**
 * ============================================================
 * Evaluationهای مربوط به Customer
 * ============================================================
 */
export const findEvaluationsByCustomerId = async (
  customerId: string
) => {
  return prisma.evaluation.findMany({
    where: {
      customerId,
    },

    orderBy: {
      createdAt: "desc",
    },
  });
};

/**
 * ============================================================
 * Evaluationهای مربوط به Owner
 * ============================================================
 */
export const findEvaluationsByOwnerId = async (
  ownerId: string
) => {
  return prisma.evaluation.findMany({
    where: {
      ownerId,
    },

    orderBy: {
      createdAt: "desc",
    },
  });
};

/**
 * ============================================================
 * Evaluationهای مربوط به Agent
 * ============================================================
 */
export const findEvaluationsByAgentId = async (
  agentId: string
) => {
  return prisma.evaluation.findMany({
    where: {
      agentId,
    },

    orderBy: {
      createdAt: "desc",
    },
  });
};

/**
 * ============================================================
 * Evaluationهای مربوط به Property
 * ============================================================
 */
export const findEvaluationsByPropertyId = async (
  propertyId: string
) => {
  return prisma.evaluation.findMany({
    where: {
      propertyId,
    },

    orderBy: {
      createdAt: "desc",
    },
  });
};

/**
 * ============================================================
 * تغییر وضعیت Evaluation
 * ============================================================
 */
export const updateEvaluationStatus = async (
  id: string,
  status: Parameters<
    typeof prisma.evaluation.update
  >[0]["data"]["status"]
) => {
  return prisma.evaluation.update({
    where: {
      id,
    },

    data: {
      status,
    },
  });
};