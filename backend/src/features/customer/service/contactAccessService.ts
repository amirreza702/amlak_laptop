/**
 * ============================================================
 * Contact Access Service
 * ============================================================
 *
 * منطق کسب‌وکار دسترسی Agent به اطلاعات تماس Customer
 *
 * جریان:
 *
 * Agent
 *   ↓
 * Search Request
 *   ↓
 * بررسی ACTIVE بودن
 *   ↓
 * بررسی Customer
 *   ↓
 * بررسی دسترسی قبلی
 *   ↓
 * بررسی Subscription
 *   ↓
 * تعیین دوره مصرف
 *   ↓
 * ┌──────────── Transaction ────────────┐
 * │ بررسی مجدد دسترسی قبلی             │
 * │ بررسی / ایجاد Usage                │
 * │ بررسی سقف                           │
 * │ ثبت ContactAccessLog               │
 * │ افزایش ContactAccessUsage          │
 * └────────────────────────────────────┘
 *   ↓
 * برگرداندن اطلاعات Customer
 */

import { prisma } from "../../../lib/prisma";
import { Prisma } from "@prisma/client";

import { findCustomerById } from "../repository/customerRepository";

import {
  createContactAccessLog,
  findContactAccessLog,
} from "../repository/contactAccessLogRepository";

import {
  findPropertySearchRequestById,
} from "../repository/propertySearchRequestRepository";

import {
  findActiveAgentSubscription,
} from "../repository/agentSubscriptionRepository";

import {
  createContactAccessUsage,
  findContactAccessUsage,
  incrementContactAccessUsage,
} from "../repository/contactAccessUsageRepository";

/**
 * شروع ماه جاری
 *
 * periodStart شناسه دوره مصرف ماهانه است.
 *
 * از UTC استفاده می‌کنیم تا زمان سرور Docker
 * باعث ایجاد دو دوره متفاوت نشود.
 */
const getCurrentPeriodStart = () => {
  const now = new Date();

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      1
    )
  );
};

/**
 * دسترسی Agent به اطلاعات تماس Customer
 */
export const accessCustomerContact = async (
  agentId: string,
  searchRequestId: string
) => {
  /**
   * ----------------------------------------------------------
   * 1. پیدا کردن Search Request
   * ----------------------------------------------------------
   */
  const searchRequest =
    await findPropertySearchRequestById(
      searchRequestId
    );

  if (!searchRequest) {
    throw new Error("Search request not found");
  }

  /**
   * فقط درخواست‌های فعال امکان دسترسی به تماس دارند.
   */
  if (searchRequest.status !== "ACTIVE") {
    throw new Error(
      "Only active search requests can be accessed"
    );
  }

  /**
   * ----------------------------------------------------------
   * 2. پیدا کردن Customer
   * ----------------------------------------------------------
   */
  const customer = await findCustomerById(
    searchRequest.customerId
  );

  if (!customer) {
    throw new Error("Customer not found");
  }

  /**
   * ----------------------------------------------------------
   * 3. بررسی دسترسی قبلی
   * ----------------------------------------------------------
   *
   * این بررسی خارج از Transaction فقط برای جلوگیری از
   * ورود غیرضروری به Transaction انجام می‌شود.
   *
   * داخل Transaction نیز دوباره بررسی می‌کنیم؛
   * چون دو درخواست هم‌زمان ممکن است هر دو به این نقطه برسند.
   */
  const existingAccess =
    await findContactAccessLog(
      agentId,
      searchRequestId
    );

  if (existingAccess) {
    return {
      access: existingAccess,

      customer: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        mobile: customer.user.mobile,
      },
    };
  }

  /**
   * ----------------------------------------------------------
   * 4. پیدا کردن Subscription فعال
   * ----------------------------------------------------------
   */
  const subscription =
    await findActiveAgentSubscription(
      agentId
    );

  if (!subscription) {
    throw new Error(
      "Active subscription not found"
    );
  }

  /**
   * ----------------------------------------------------------
   * 5. تعیین دوره مصرف جاری
   * ----------------------------------------------------------
   */
  const periodStart =
    getCurrentPeriodStart();

  /**
   * ----------------------------------------------------------
   * 6 تا 9. عملیات اتمیک
   * ----------------------------------------------------------
   *
   * تمام عملیات مربوط به سهمیه و ثبت دسترسی در یک
   * Transaction انجام می‌شوند.
   *
   * Serializable باعث می‌شود دو درخواست هم‌زمان نتوانند
   * هم‌زمان یک سهمیه آزاد را مصرف کنند.
   */
  const result = await prisma.$transaction(
    async (tx) => {

      /**
       * ------------------------------------------------------
       * 6. بررسی مجدد دسترسی قبلی
       * ------------------------------------------------------
       *
       * ممکن است یک درخواست هم‌زمان قبل از این Transaction
       * دسترسی را ثبت کرده باشد.
       */
      const existingAccessInTransaction =
        await findContactAccessLog(
          agentId,
          searchRequestId,
          tx
        );

      if (existingAccessInTransaction) {
        return {
          access: existingAccessInTransaction,
          usedNewCredit: false,
        };
      }

      /**
       * ------------------------------------------------------
       * 7. پیدا کردن یا ایجاد Usage
       * ------------------------------------------------------
       */
      let usage =
        await findContactAccessUsage(
          agentId,
          periodStart,
          tx
        );

      if (!usage) {
        usage =
          await createContactAccessUsage(
            agentId,
            periodStart,
            tx
          );
      }

      /**
       * ------------------------------------------------------
       * 8. بررسی سقف مصرف
       * ------------------------------------------------------
       */
      if (
        usage.usedCount >=
        subscription.subscriptionPlan.monthlyContactLimit
      ) {
        throw new Error(
          "Monthly contact access limit reached"
        );
      }

      /**
       * ------------------------------------------------------
       * 9. ثبت دسترسی
       * ------------------------------------------------------
       */
      const access =
        await createContactAccessLog(
          agentId,
          customer.id,
          searchRequestId,
          tx
        );

      /**
       * ------------------------------------------------------
       * 10. افزایش مصرف
       * ------------------------------------------------------
       */
      await incrementContactAccessUsage(
        agentId,
        periodStart,
        tx
      );

      return {
        access,
        usedNewCredit: true,
      };
    },
    {
      isolationLevel:
        Prisma.TransactionIsolationLevel.Serializable,
    }
  );

  /**
   * ----------------------------------------------------------
   * 11. برگرداندن اطلاعات Customer
   * ----------------------------------------------------------
   */
  return {
    access: result.access,

    customer: {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      mobile: customer.user.mobile,
    },
  };
};