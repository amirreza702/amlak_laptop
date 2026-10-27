/**
 * ============================================================
 * Property Price Service
 * ============================================================
 *
 * منطق Business مربوط به تغییر قیمت ملک در این Service قرار
 * می‌گیرد.
 *
 * جریان:
 *
 * propertyId + price data
 *          ↓
 * پیدا کردن PropertyListing
 *          ↓
 * بررسی وجود Listing
 *          ↓
 * بررسی نوع معامله
 *          ↓
 * مقایسه قیمت فعلی و قیمت جدید
 *          ↓
 * ┌─────────────────────────────┐
 * │ قیمت تغییر نکرده؟           │
 * │ → هیچ تغییری انجام نمی‌شود  │
 * │                             │
 * │ قیمت تغییر کرده؟            │
 * │ → شروع Transaction          │
 * │ → Update Listing             │
 * │ → ایجاد PriceHistory         │
 * └─────────────────────────────┘
 *
 * ============================================================
 */

import {
  PriceChangeType,
  PropertyHistoryAction,
  TransactionType,
  Prisma,
} from "@prisma/client";

import {
  findPropertyListingByPropertyId,
  updatePropertyListing,
} from "../repository/propertyListingRepository";

import { createPriceHistory } from "../repository/priceHistoryRepository";

import type { UpdatePropertyPriceInput } from "../types/updatePropertyPrice";

import { prisma } from "../../../lib/prisma";

import { createPropertyHistory } from "../repository/propertyHistoryRepository";

/**
 * ============================================================
 * تغییر قیمت ملک
 * ============================================================
 */
export async function updatePropertyPrice(
  propertyId: string,
  data: UpdatePropertyPriceInput
) {
  /**
   * ==========================================================
   * پیدا کردن Listing فعلی
   * ==========================================================
   */
  const listing =
    await findPropertyListingByPropertyId(propertyId);

  if (!listing) {
    throw new Error(
      "برای این ملک اطلاعات قیمت ثبت نشده است."
    );
  }

  /**
   * ==========================================================
   * اعتبارسنجی قیمت بر اساس نوع معامله
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
   * تعیین قیمت جدید
   * ==========================================================
   */

  const newSalePrice =
    data.transactionType === TransactionType.SALE
      ? data.salePrice ?? null
      : null;

  const newDepositAmount =
    data.transactionType === TransactionType.FULL_DEPOSIT
      ? data.depositAmount ?? null
      : null;

  const newRentAmount =
    data.transactionType === TransactionType.RENT
      ? data.rentAmount ?? null
      : null;

  /**
   * ==========================================================
   * بررسی تغییر قیمت
   * ==========================================================
   *
   * فقط قیمت مربوط به نوع معامله مقایسه می‌شود.
   */

  let priceChanged = false;

  if (data.transactionType === TransactionType.SALE) {
    priceChanged =
      listing.salePrice?.toString() !== newSalePrice;
  }

  if (
    data.transactionType === TransactionType.FULL_DEPOSIT
  ) {
    priceChanged =
      listing.depositAmount?.toString() !==
      newDepositAmount;
  }

  if (data.transactionType === TransactionType.RENT) {
    priceChanged =
      listing.rentAmount?.toString() !== newRentAmount;
  }

  /**
   * ==========================================================
   * اگر قیمت تغییر نکرده باشد
   * ==========================================================
   *
   * نیازی به Transaction یا ایجاد History نداریم.
   */
  if (!priceChanged) {
    return {
      listing,
      priceChanged: false,
      history: null,
    };
  }

  /**
   * ==========================================================
   * اطلاعات جدید Listing
   * ==========================================================
   *
   * فقط قیمت مربوط به TransactionType جدید مقدار دارد.
   */
  const updateData = {
    transactionType: data.transactionType,
    salePrice: newSalePrice,
    depositAmount: newDepositAmount,
    rentAmount: newRentAmount,
  };

  /**
   * ==========================================================
   * Transaction
   * ==========================================================
   *
   * دو عملیات زیر باید با هم موفق شوند:
   *
   * 1. تغییر PropertyListing
   * 2. ایجاد PriceHistory
   *
   * اگر هر کدام شکست بخورد، هر دو Rollback می‌شوند.
   */
 return prisma.$transaction(
  async (tx: Prisma.TransactionClient) => {
    /**
     * ------------------------------------------------------
     * تغییر قیمت فعلی
     * ------------------------------------------------------
     */
    const updatedListing = await updatePropertyListing(
      listing.id,
      updateData,
      tx
    );

    /**
     * ------------------------------------------------------
     * ثبت تاریخچه تغییر قیمت
     * ------------------------------------------------------
     */
    const history = await createPriceHistory(
      {
        propertyId,
        changeType: PriceChangeType.PRICE_CHANGE,
        salePrice: newSalePrice,
        depositAmount: newDepositAmount,
        rentAmount: newRentAmount,
      },
      tx
    );

    /**
     * ------------------------------------------------------
     * ثبت تغییر قیمت در تاریخچه Property
     * ------------------------------------------------------
     */
    await createPropertyHistory(
      {
        propertyId,
        action: PropertyHistoryAction.PRICE_CHANGED,
        field: "listing.price",
        newValue: JSON.stringify({
          transactionType: data.transactionType,
          salePrice: newSalePrice,
          depositAmount: newDepositAmount,
          rentAmount: newRentAmount,
        }),
        reason: "تغییر قیمت ملک",
      },
      tx
    );


    /**
     * ------------------------------------------------------
     * نتیجه Transaction
     * ------------------------------------------------------
     */
    return {
      listing: updatedListing,
      priceChanged: true,
      history,
    };
  }
);
}