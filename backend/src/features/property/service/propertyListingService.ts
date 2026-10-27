/**
 * ============================================================
 * Property Listing Service
 * ============================================================
 *
 * منطق Business مربوط به ایجاد Listing و ثبت اولین قیمت
 * در این Service قرار دارد.
 *
 * جریان:
 *
 * Property
 *    ↓
 * دریافت اطلاعات اولین قیمت
 *    ↓
 * بررسی اینکه Listing قبلاً وجود دارد یا نه
 *    ↓
 * شروع Transaction
 *    ↓
 * ایجاد PropertyListing
 *    ↓
 * ایجاد PriceHistory با INITIAL
 *    ↓
 * پایان Transaction
 *
 * اگر هر یک از عملیات داخل Transaction شکست بخورد:
 *
 * PropertyListing
 * و
 * PriceHistory
 *
 * هر دو Rollback می‌شوند.
 *
 * ============================================================
 */

import {
  PriceChangeType,
  TransactionType,
  Prisma,
} from "@prisma/client";

import {
  findPropertyListingByPropertyId,
  createPropertyListing,
} from "../repository/propertyListingRepository";

import { createPriceHistory } from "../repository/priceHistoryRepository";

import type { UpdatePropertyPriceInput } from "../types/updatePropertyPrice";

import { prisma } from "../../../lib/prisma";

/**
 * ============================================================
 * ثبت Listing همراه با اولین قیمت
 * ============================================================
 */
export async function createPropertyListingWithInitialPrice(
  propertyId: string,
  data: UpdatePropertyPriceInput
) {
  /**
   * ==========================================================
   * بررسی وجود Listing
   * ==========================================================
   *
   * این بررسی قبل از Transaction انجام می‌شود؛
   * چون فقط برای جلوگیری از ثبت Listing تکراری است.
   */
  const existingListing =
    await findPropertyListingByPropertyId(propertyId);

  if (existingListing) {
    throw new Error(
      "برای این ملک قبلاً اطلاعات معامله ثبت شده است."
    );
  }

  /**
   * ==========================================================
   * اعتبارسنجی نوع معامله و قیمت
   * ==========================================================
   */

  if (
    data.transactionType === TransactionType.SALE &&
    !data.salePrice
  ) {
    throw new Error(
      "برای معامله فروش، قیمت فروش الزامی است."
    );
  }

  if (
    data.transactionType === TransactionType.FULL_DEPOSIT &&
    !data.depositAmount
  ) {
    throw new Error(
      "برای رهن کامل، مبلغ رهن الزامی است."
    );
  }

  if (
    data.transactionType === TransactionType.RENT &&
    !data.rentAmount
  ) {
    throw new Error(
      "برای اجاره، مبلغ اجاره الزامی است."
    );
  }

  /**
   * ==========================================================
   * تعیین قیمت مربوط به نوع معامله
   * ==========================================================
   *
   * فقط قیمت مربوط به TransactionType ذخیره می‌شود.
   */

  const salePrice =
    data.transactionType === TransactionType.SALE
      ? data.salePrice ?? null
      : null;

  const depositAmount =
    data.transactionType === TransactionType.FULL_DEPOSIT
      ? data.depositAmount ?? null
      : null;

  const rentAmount =
    data.transactionType === TransactionType.RENT
      ? data.rentAmount ?? null
      : null;

  /**
   * ==========================================================
   * Transaction
   * ==========================================================
   *
   * هر دو عملیات زیر باید با هم موفق شوند:
   *
   * 1. ایجاد PropertyListing
   * 2. ایجاد PriceHistory
   *
   * اگر یکی شکست بخورد، Prisma کل Transaction را
   * Rollback می‌کند.
   */
  return prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      /**
       * ------------------------------------------------------
       * ایجاد Listing
       * ------------------------------------------------------
       */
      const listing = await createPropertyListing(
        {
          propertyId,
          transactionType: data.transactionType,
          salePrice,
          depositAmount,
          rentAmount,
        },
        tx
      );

      /**
       * ------------------------------------------------------
       * ایجاد اولین رکورد تاریخچه قیمت
       * ------------------------------------------------------
       */
      const history = await createPriceHistory(
        {
          propertyId,
          changeType: PriceChangeType.INITIAL,
          salePrice,
          depositAmount,
          rentAmount,
        },
        tx
      );

      /**
       * ------------------------------------------------------
       * نتیجه Transaction
       * ------------------------------------------------------
       *
       * فقط وقتی به این قسمت می‌رسیم که هر دو عملیات
       * با موفقیت انجام شده باشند.
       */
      return {
        listing,
        history,
      };
    }
  );
}