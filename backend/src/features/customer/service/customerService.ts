/**
 * ============================================================
 * Customer Service
 * ============================================================
 *
 * منطق Business مربوط به Customer در این Service قرار دارد.
 *
 * این Service مستقیماً با Prisma یا Database کار نمی‌کند.
 *
 * جریان:
 *
 * Controller
 *    ↓
 * Customer Service
 *    ↓
 * Customer Repository
 *    ↓
 * Database
 *
 * ============================================================
 */

import {
  findCustomerProfileById,
  updateCustomerProfile,
} from "../repository/customerRepository";

/**
 * ============================================================
 * دریافت Profile مشتری
 * ============================================================
 *
 * وظیفه:
 * - بررسی وجود Customer
 * - دریافت اطلاعات Profile از Repository
 *
 * اطلاعات دیتابیس در Repository آماده شده‌اند
 * و Service لازم نیست بداند mobile در جدول User قرار دارد.
 */
export const getCustomerProfile = async (
  customerId: string
) => {
  const customer =
    await findCustomerProfileById(customerId);

  if (!customer) {
    throw new Error("Customer not found");
  }

  return customer;
};

/**
 * ============================================================
 * ویرایش Profile مشتری
 * ============================================================
 *
 * فیلدهای قابل ویرایش:
 * - firstName
 * - lastName
 *
 * mobile در این Service قابل تغییر نیست.
 *
 * تغییر شماره موبایل مربوط به Authentication / OTP است
 * و جزو Profile معمولی Customer محسوب نمی‌شود.
 */
export const updateCustomerProfileService = async (
  customerId: string,
  data: {
    firstName?: string;
    lastName?: string;
  }
) => {
  /**
   * ----------------------------------------------------------
   * بررسی وجود Customer
   * ----------------------------------------------------------
   */
  const customer =
    await findCustomerProfileById(customerId);

  if (!customer) {
    throw new Error("Customer not found");
  }

  /**
   * ----------------------------------------------------------
   * آماده‌سازی مقادیر
   * ----------------------------------------------------------
   *
   * trim باعث می‌شود فاصله‌های ابتدا و انتهای نام
   * ذخیره نشوند.
   */
  const firstName = data.firstName?.trim();
  const lastName = data.lastName?.trim();

  /**
   * ----------------------------------------------------------
   * اعتبارسنجی نام
   * ----------------------------------------------------------
   */

  if (
    firstName !== undefined &&
    firstName.length === 0
  ) {
    throw new Error("First name cannot be empty");
  }

  if (
    lastName !== undefined &&
    lastName.length === 0
  ) {
    throw new Error("Last name cannot be empty");
  }

  /**
   * ----------------------------------------------------------
   * حداقل یک فیلد باید برای تغییر ارسال شده باشد.
   * ----------------------------------------------------------
   */
  if (
    firstName === undefined &&
    lastName === undefined
  ) {
    throw new Error("No profile fields to update");
  }

  /**
   * ----------------------------------------------------------
   * ارسال عملیات تغییر به Repository
   * ----------------------------------------------------------
   *
   * Service فقط تصمیم می‌گیرد چه چیزی باید تغییر کند.
   *
   * خود عملیات Database در Repository انجام می‌شود.
   */
  return updateCustomerProfile(customerId, {
    ...(firstName !== undefined && {
      firstName,
    }),

    ...(lastName !== undefined && {
      lastName,
    }),
  });
};