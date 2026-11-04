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
  ListingStatus,
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
    data.transactionType === TransactionType.FULL_DEPOSIT || data.transactionType === TransactionType.DEPOSIT_AND_RENT
      ? data.depositAmount ?? null
      : null;

  const rentAmount =
    data.transactionType === TransactionType.RENT || data.transactionType === TransactionType.DEPOSIT_AND_RENT
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
          status: ListingStatus.PENDING_HASHTI_VERIFICATION,
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

      // پس از ثبت کامل ملک و اطلاعات معامله، پرونده برای بررسی انتشار به هشتی ارجاع می‌شود.
      const property = await tx.property.findUnique({
        where: { id: propertyId },
        select: {
          propertyType: true,
          city: true,
          district: true,
          address: true,
          createdByRole: true,
          createdByUser: {
            select: {
              mobile: true,
              agent: { select: { firstName: true, lastName: true } },
              owner: { select: { firstName: true, lastName: true } },
            },
          },
        },
      });
      if (property?.createdByUser) {
        const actor = property.createdByUser;
        const actorProfile = actor.agent ?? actor.owner;
        const actorName = [actorProfile?.firstName, actorProfile?.lastName].filter(Boolean).join(" ") || "کاربر";
        const recipients = await tx.user.findMany({
          where: { role: "HASHTI", isActive: true },
          select: { id: true },
        });
        if (recipients.length) {
          await tx.notification.createMany({
            data: recipients.map((recipient) => ({
              userId: recipient.id,
              title: "ملک جدید در انتظار تأیید انتشار",
              message: `${actorName} با شماره ${actor.mobile} یک ملک جدید در ${property.city}، ${property.district}، ${property.address} ثبت کرده است؛ لطفاً اطلاعات و انتشار آن را بررسی کنید.`,
              details: {
                actorName,
                actorMobile: actor.mobile,
                actorRole: property.createdByRole ?? "UNKNOWN",
                action: "ثبت ملک برای بررسی و تأیید انتشار",
                subject: `${property.propertyType} در ${property.city}، ${property.district}، ${property.address}`,
                subjectType: "ملک",
                occurredAt: new Date().toISOString(),
              },
            })),
          });
        }
      }

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