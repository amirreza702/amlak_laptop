/**
 * ============================================================
 * Property Owner Repository
 * ============================================================
 *
 * وظیفه این Repository فقط ارتباط با جدول PropertyOwner است.
 *
 * این فایل نباید منطق Business داشته باشد.
 *
 * Business Logic
 *       ↓
 * PropertyOwner Service
 *       ↓
 * PropertyOwner Repository
 *       ↓
 * Prisma
 *
 * PropertyOwner یک جدول واسط بین:
 *
 * Property ←→ Owner
 *
 * است.
 */

import { prisma } from "../../../lib/prisma";

import type {
  Prisma,
  PropertyOwner,
} from "@prisma/client";

type DatabaseClient =
  | typeof prisma
  | Prisma.TransactionClient;

/**
 * ============================================================
 * Find Property Owner
 * ============================================================
 *
 * بررسی می‌کند آیا یک مالک قبلاً به یک ملک متصل شده است یا خیر.
 *
 * چون کلید اصلی PropertyOwner ترکیبی است:
 *
 * propertyId + ownerId
 *
 * از findUnique استفاده می‌کنیم.
 */
export const findPropertyOwner = async (
  propertyId: string,
  ownerId: string
): Promise<PropertyOwner | null> => {
  return prisma.propertyOwner.findUnique({
    where: {
      propertyId_ownerId: {
        propertyId,
        ownerId,
      },
    },
  });
};

/**
 * ============================================================
 * Create Property Owner
 * ============================================================
 *
 * ایجاد رابطه بین یک مالک و یک ملک.
 *
 * db به صورت پیش‌فرض prisma است.
 *
 * اما اگر این عملیات بخشی از یک Transaction باشد،
 * Transaction Client از Service دریافت می‌شود.
 */
export const createPropertyOwner = async (
  data: Parameters<
    typeof prisma.propertyOwner.create
  >[0]["data"],
  db: DatabaseClient = prisma
): Promise<PropertyOwner> => {
  return db.propertyOwner.create({
    data,
  });
};