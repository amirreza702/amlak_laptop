import {
  PropertyType,
  TransactionType,
} from "@prisma/client";

import {
  searchProperties,
  type PropertySearchFilters,
} from "../repository/propertySearchRepository";

/**
 * ============================================================
 * Search Property Service
 * ============================================================
 *
 * این لایه ورودی HTTP را به فیلترهای قابل استفاده
 * توسط Repository تبدیل می‌کند.
 */

export interface SearchPropertiesInput {
  transactionType?: string;
  propertyType?: string;

  city?: string;
  district?: string;

  minPrice?: string;
  maxPrice?: string;

  minArea?: string;
  maxArea?: string;

  rooms?: string;

  yearFrom?: string;
  yearTo?: string;
}

/**
 * تبدیل رشته به عدد، بدون ایجاد NaN
 */
function toNumber(value?: string): number | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new Error(`مقدار عددی نامعتبر است: ${value}`);
  }

  return number;
}

export async function searchPropertyService(
  input: SearchPropertiesInput
) {
  const filters: PropertySearchFilters = {
    city: input.city?.trim() || undefined,
    district: input.district?.trim() || undefined,

    minPrice: toNumber(input.minPrice),
    maxPrice: toNumber(input.maxPrice),

    minArea: toNumber(input.minArea),
    maxArea: toNumber(input.maxArea),

    rooms: toNumber(input.rooms),

    yearFrom: toNumber(input.yearFrom),
    yearTo: toNumber(input.yearTo),
  };

  /**
   * تبدیل enumهای Prisma
   */
  if (input.transactionType) {
    if (
      !Object.values(TransactionType).includes(
        input.transactionType as TransactionType
      )
    ) {
      throw new Error("نوع معامله نامعتبر است.");
    }

    filters.transactionType =
      input.transactionType as TransactionType;
  }

  if (input.propertyType) {
    if (
      !Object.values(PropertyType).includes(
        input.propertyType as PropertyType
      )
    ) {
      throw new Error("نوع ملک نامعتبر است.");
    }

    filters.propertyType =
      input.propertyType as PropertyType;
  }

  return searchProperties(filters);
}