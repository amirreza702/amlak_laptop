
import { prisma } from "../../../lib/prisma";

import type {
  Prisma,
  PropertyAgent,
} from "@prisma/client";

/**
 * ============================================================
 * DatabaseClient
 * ============================================================
 *
 * نوع Client دیتابیس.
 *
 * می‌تواند:
 *
 * 1. Prisma Client معمولی باشد
 * 2. Transaction Client باشد
 *
 * بنابراین Repository می‌تواند هم مستقل
 * و هم داخل Transaction استفاده شود.
 */
type DatabaseClient =
  | typeof prisma
  | Prisma.TransactionClient;

/**
 * ============================================================
 * findPropertyAgent
 * ============================================================
 *
 * پیدا کردن ارتباط یک مشاور با یک ملک.
 */
export const findPropertyAgent = async (
  propertyId: string,
  agentId: string
): Promise<PropertyAgent | null> => {
  return prisma.propertyAgent.findUnique({
    where: {
      propertyId_agentId: {
        propertyId,
        agentId,
      },
    },
  });
};

/**
 * ============================================================
 * hasPropertyAgents
 * ============================================================
 *
 * بررسی اینکه آیا ملک قبلاً مشاور دارد یا خیر.
 *
 * در صورت استفاده داخل Transaction،
 * همان Transaction Client به این تابع ارسال می‌شود.
 */
export const hasPropertyAgents = async (
  propertyId: string,
  db: DatabaseClient = prisma
): Promise<boolean> => {
  const count = await db.propertyAgent.count({
    where: {
      propertyId,
    },
  });

  return count > 0;
};

/**
 * ============================================================
 * createPropertyAgent
 * ============================================================
 *
 * ایجاد ارتباط ملک و مشاور.
 *
 * اولین مشاوری که ملک را ثبت می‌کند،
 * isFirstRegistrant = true خواهد داشت.
 *
 * بررسی اولین ثبت‌کننده و ایجاد ارتباط
 * هر دو می‌توانند داخل یک Transaction انجام شوند.
 */
export const createPropertyAgent = async (
  propertyId: string,
  agentId: string,
  db: DatabaseClient = prisma
): Promise<PropertyAgent> => {
  const isFirstRegistrant =
    !(await hasPropertyAgents(propertyId, db));

  return db.propertyAgent.create({
    data: {
      propertyId,
      agentId,
      isFirstRegistrant,
    },
  });
};

/**
 * ============================================================
 * approvePropertyAgentByOwner
 * ============================================================
 *
 * تأیید مشاور توسط مالک.
 *
 * این تابع فعلاً مانند قبل با Prisma Client
 * معمولی کار می‌کند و در این مرحله تغییری
 * در رفتار آن ایجاد نمی‌کنیم.
 */
export const approvePropertyAgentByOwner = async (
  propertyId: string,
  agentId: string
): Promise<PropertyAgent> => {
  return prisma.propertyAgent.update({
    where: {
      propertyId_agentId: {
        propertyId,
        agentId,
      },
    },
    data: {
      approvedByOwner: true,
      approvedAt: new Date(),
    },
  });
};

/**
 * ============================================================
 * reactivatePropertyAgent
 * ============================================================
 *
 * فعال‌سازی مجدد ارتباط Agent با Property.
 *
 * این تابع برای رکوردی استفاده می‌شود
 * که قبلاً REVOKED شده است.
 *
 * در صورت استفاده داخل Transaction،
 * همان Transaction Client به آن ارسال می‌شود.
 */
export const reactivatePropertyAgent = async (
  propertyId: string,
  agentId: string,
  db: DatabaseClient = prisma
): Promise<PropertyAgent> => {
  return db.propertyAgent.update({
    where: {
      propertyId_agentId: {
        propertyId,
        agentId,
      },
    },
    data: {
      status: "ACTIVE",
      approvedByOwner: false,
      approvedAt: null,
    },
  });
};
