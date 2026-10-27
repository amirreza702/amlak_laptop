/**
 * ============================================================
 * Update Property Price Input
 * ============================================================
 *
 * قرارداد ورودی برای تغییر قیمت ملک.
 *
 * نکته:
 * شناسه ملک (propertyId) در این قرارداد قرار نمی‌گیرد؛
 * چون در معماری API معمولاً از مسیر دریافت می‌شود:
 *
 * PUT /properties/:id/price
 *
 * بنابراین Service به صورت زیر خواهد بود:
 *
 * updatePropertyPrice(propertyId, data)
 *
 * ============================================================
 */

import type { TransactionType } from "@prisma/client";

/**
 * ============================================================
 * ورودی تغییر قیمت
 * ============================================================
 *
 * قیمت‌ها به صورت string دریافت می‌شوند.
 *
 * دلیل:
 * قیمت در Prisma از نوع Decimal است و برای اعداد بزرگ
 * بهتر است در API به صورت string منتقل شود تا مشکل
 * دقت عددی JavaScript نداشته باشیم.
 *
 * بسته به TransactionType فقط یکی از فیلدهای قیمت
 * باید مقدار داشته باشد:
 *
 * SALE
 *   → salePrice
 *
 * FULL_DEPOSIT
 *   → depositAmount
 *
 * RENT
 *   → rentAmount
 */
export interface UpdatePropertyPriceInput {
  /**
   * نوع معامله
   */
  transactionType: TransactionType;

  /**
   * قیمت فروش
   */
  salePrice?: string | null;

  /**
   * مبلغ رهن کامل
   */
  depositAmount?: string | null;

  /**
   * مبلغ اجاره
   */
  rentAmount?: string | null;
}
