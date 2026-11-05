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
import { queuePropertyListingForHashtiReview } from "./propertyListingStatusService";
import { findPropertyAuthorizationContextById } from "../repository/propertyRepository";
import { authorizePropertyAction } from "./propertyAuthorizationService";
import type { AuthorizationActor } from "../../../shared/authorization/authorization.types";

/**
 * ============================================================
 * تغییر قیمت ملک
 * ============================================================
 */
export async function updatePropertyPrice(
  propertyId: string,
  data: UpdatePropertyPriceInput,
  actor: AuthorizationActor
) {
  /**
   * ==========================================================
   * پیدا کردن Listing فعلی
   * ==========================================================
   */
  const authorizationContext = await findPropertyAuthorizationContextById(propertyId);
  if (!authorizationContext) throw new Error("ملک مورد نظر پیدا نشد.");
  const initiallyAllowed = await authorizePropertyAction(actor, "MANAGE", authorizationContext);
  if (!initiallyAllowed) throw new Error("شما اجازه تغییر قیمت این ملک را ندارید.");

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

  const allowedTransactionTypes = Object.values(TransactionType);
  if (!allowedTransactionTypes.includes(data.transactionType)) {
    throw new Error("نوع معامله معتبر نیست.");
  }
  const selectedPrices = data.transactionType === TransactionType.SALE
    ? [data.salePrice]
    : data.transactionType === TransactionType.FULL_DEPOSIT
      ? [data.depositAmount]
      : data.transactionType === TransactionType.RENT
        ? [data.rentAmount]
        : [data.depositAmount, data.rentAmount];
  if (selectedPrices.some((value) => typeof value !== "string" || !/^[0-9]+$/.test(value) ||
      !Number.isFinite(Number(value)) || Number(value) <= 0)) {
    throw new Error("همه مبالغ مربوط به نوع معامله باید عدد صحیح مثبت به تومان باشند.");
  }

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

  if (data.transactionType === TransactionType.RENT && !data.rentAmount) {
    throw new Error("برای اجاره، مبلغ اجاره الزامی است.");
  }
  if (data.transactionType === TransactionType.DEPOSIT_AND_RENT && (!data.depositAmount || !data.rentAmount)) {
    throw new Error("برای رهن و اجاره، مبلغ رهن و اجاره ماهانه هر دو الزامی هستند.");
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
    data.transactionType === TransactionType.FULL_DEPOSIT || data.transactionType === TransactionType.DEPOSIT_AND_RENT
      ? data.depositAmount ?? null
      : null;

  const newRentAmount =
    data.transactionType === TransactionType.RENT || data.transactionType === TransactionType.DEPOSIT_AND_RENT
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
    priceChanged = listing.rentAmount?.toString() !== newRentAmount;
  }

  if (data.transactionType === TransactionType.DEPOSIT_AND_RENT) {
    priceChanged =
      listing.depositAmount?.toString() !== newDepositAmount ||
      listing.rentAmount?.toString() !== newRentAmount;
  }

  /**
   * ==========================================================
   * اگر قیمت تغییر نکرده باشد
   * ==========================================================
   *
   * نیازی به Transaction یا ایجاد History نداریم.
   */
  if (!priceChanged && listing.transactionType === data.transactionType) {
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
    const freshContext = await findPropertyAuthorizationContextById(propertyId, tx);
    if (!freshContext) throw new Error("ملک مورد نظر پیدا نشد.");
    const allowed = await authorizePropertyAction(actor, "MANAGE", freshContext);
    if (!allowed) throw new Error("شما اجازه تغییر قیمت این ملک را ندارید.");
    const currentListing = await findPropertyListingByPropertyId(propertyId, tx);
    if (!currentListing) throw new Error("برای این ملک اطلاعات قیمت ثبت نشده است.");

    /**
     * ------------------------------------------------------
     * تغییر قیمت فعلی
     * ------------------------------------------------------
     */
    const updatedListing = await updatePropertyListing(
      currentListing.id,
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

    await queuePropertyListingForHashtiReview(propertyId, tx);

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
, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}