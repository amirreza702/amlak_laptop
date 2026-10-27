/**
 * ============================================================
 * Owner Repository
 * ============================================================
 *
 * این Repository فقط مسئول ارتباط مستقیم با Database است.
 *
 * منطق Business در Service قرار دارد.
 *
 * جریان:
 *
 * Controller
 *    ↓
 * Owner Service
 *    ↓
 * Owner Repository
 *    ↓
 * Database
 *
 * ============================================================
 */

import { prisma } from "../../../lib/prisma";

/**
 * ------------------------------------------------------------
 * دریافت اطلاعات Profile مالک
 * ------------------------------------------------------------
 *
 * اطلاعات مورد نیاز Profile:
 *
 * Owner:
 * - id
 * - firstName
 * - lastName
 *
 * User:
 * - mobile
 *
 * mobile در جدول User قرار دارد و در این Repository
 * همراه اطلاعات Owner خوانده می‌شود.
 */
export const findOwnerProfileById = async (
  id: string
) => {
  return prisma.owner.findUnique({
    where: {
      id,
    },

    select: {
      id: true,
      firstName: true,
      lastName: true,

      user: {
        select: {
          mobile: true,
        },
      },
    },
  });
};

/**
 * دریافت پروفایل مالک از شناسه حساب کاربری نشست جاری.
 * شناسه پروفایل از مرورگر دریافت نمی‌شود.
 */
export const findOwnerProfileByUserId = async (userId: string) => {
  return prisma.owner.findUnique({
    where: { userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      user: { select: { mobile: true } },
    },
  });
};

/**
 * ------------------------------------------------------------
 * ویرایش اطلاعات Profile مالک
 * ------------------------------------------------------------
 *
 * فقط اطلاعات مربوط به خود Owner تغییر می‌کند.
 *
 * mobile در این مرحله قابل تغییر نیست؛
 * چون مربوط به Authentication / OTP است.
 */
export const updateOwnerProfile = async (
  id: string,
  data: {
    firstName?: string;
    lastName?: string;
  }
) => {
  return prisma.owner.update({
    where: {
      id,
    },

    data,
  });
};

/**
 * Return property ownership links for one owner profile.
 */
export const findOwnerPropertiesByOwnerId = async (ownerId: string) =>
  prisma.propertyOwner.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
    select: {
      propertyId: true,
      ownerId: true,
      share: true,
      isPrimary: true,
      verificationStatus: true,
      verifiedAt: true,
      property: {
        select: {
          id: true, propertyType: true, city: true, district: true, address: true,
          area: true, rooms: true, isActive: true, occupancyStatus: true,
          listing: {
            select: { transactionType: true, salePrice: true, depositAmount: true, rentAmount: true, status: true, publishedAt: true },
          },
          agents: {
            select: {
              agentId: true, status: true, approvedByOwner: true,
              agent: { select: { firstName: true, lastName: true, agencyName: true } },
            },
          },
        },
      },
    },
  });
