/**
 * ============================================================
 * Customer Repository
 * ============================================================
 *
 * این Repository فقط مسئول ارتباط مستقیم
 * با دیتابیس است.
 *
 * منطق Business در Service قرار می‌گیرد.
 * ============================================================
 */

import { prisma } from "../../../lib/prisma";

/**
 * ------------------------------------------------------------
 * پیدا کردن مشتری بر اساس ID
 * ------------------------------------------------------------
 *
 * این متد عمومی است و علاوه بر Customer،
 * اطلاعات User را نیز برمی‌گرداند.
 *
 * mobile در User قرار دارد.
 */
export const findCustomerById = async (
  id: string
) => {
  return prisma.customer.findUnique({
    where: {
      id,
    },

    include: {
      user: true,
    },
  });
};

/**
 * ------------------------------------------------------------
 * دریافت اطلاعات Profile مشتری
 * ------------------------------------------------------------
 *
 * این متد مخصوص use-case مربوط به Profile است.
 *
 * فقط اطلاعات موردنیاز Profile از دیتابیس خوانده می‌شود:
 *
 * Customer:
 * - id
 * - firstName
 * - lastName
 *
 * User:
 * - mobile
 *
 * بنابراین Service لازم نیست بداند
 * اطلاعات موبایل از کدام جدول آمده است.
 */
export const findCustomerProfileById = async (
  id: string
) => {
  return prisma.customer.findUnique({
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
 * ------------------------------------------------------------
 * ویرایش اطلاعات Profile مشتری
 * ------------------------------------------------------------
 *
 * فقط اطلاعات مربوط به Customer تغییر می‌کند.
 *
 * mobile در User قرار دارد و در این متد تغییر نمی‌کند.
 */
export const updateCustomerProfile = async (
  id: string,
  data: {
    firstName?: string;
    lastName?: string;
  }
) => {
  return prisma.customer.update({
    where: {
      id,
    },

    data,
  });
};