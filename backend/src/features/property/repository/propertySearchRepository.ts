import { prisma } from "../../../lib/prisma";

/**
 * ============================================================
 * انواع دامنه‌ای Search
 * ============================================================
 *
 * این Typeها عمداً مستقل از Prisma هستند.
 *
 * دلیل:
 * Repository نباید برای Typeهای ورودی Search
 * به فایل تولیدشده Prisma وابسته باشد.
 */

export type PropertyType =
  | "APARTMENT"
  | "HOUSE"
  | "VILLA"
  | "LAND"
  | "SHOP"
  | "OFFICE"
  | "GARDEN";

export type TransactionType =
  | "SALE"
  | "FULL_DEPOSIT"
  | "RENT";

export type ListingStatus = "PUBLISHED";

/**
 * ============================================================
 * فیلترهای جستجوی ملک
 * ============================================================
 */

export interface PropertySearchFilters {
  transactionType?: TransactionType;
  propertyType?: PropertyType;

  city?: string;
  district?: string;

  minPrice?: number;
  maxPrice?: number;

  minArea?: number;
  maxArea?: number;

  rooms?: number;

  yearFrom?: number;
  yearTo?: number;
}

/**
 * ============================================================
 * Search
 * ============================================================
 */

export async function searchProperties(
  filters: PropertySearchFilters
) {
  const now = new Date();

  /**
   * ----------------------------------------------------------
   * فیلتر Property
   * ----------------------------------------------------------
   */

  const propertyWhere: any = {};

  if (filters.propertyType) {
    propertyWhere.propertyType = filters.propertyType;
  }

  if (filters.city) {
    propertyWhere.city = {
      contains: filters.city,
      mode: "insensitive",
    };
  }

  if (filters.district) {
    propertyWhere.district = {
      contains: filters.district,
      mode: "insensitive",
    };
  }

  if (
    filters.minArea !== undefined ||
    filters.maxArea !== undefined
  ) {
    propertyWhere.area = {};

    if (filters.minArea !== undefined) {
      propertyWhere.area.gte = filters.minArea;
    }

    if (filters.maxArea !== undefined) {
      propertyWhere.area.lte = filters.maxArea;
    }
  }

  if (filters.rooms !== undefined) {
    propertyWhere.rooms = filters.rooms;
  }

  if (
    filters.yearFrom !== undefined ||
    filters.yearTo !== undefined
  ) {
    propertyWhere.yearBuilt = {};

    if (filters.yearFrom !== undefined) {
      propertyWhere.yearBuilt.gte = filters.yearFrom;
    }

    if (filters.yearTo !== undefined) {
      propertyWhere.yearBuilt.lte = filters.yearTo;
    }
  }

  /**
   * فقط ملک‌هایی که تأیید یک‌ماهه آنها هنوز معتبر است.
   */
  propertyWhere.confirmUntil = {
    gte: now,
  };

  /**
   * ----------------------------------------------------------
   * فیلتر Listing
   * ----------------------------------------------------------
   */

  const listingWhere: any = {
    status: "PUBLISHED" satisfies ListingStatus,
  };

  if (filters.transactionType) {
    listingWhere.transactionType = filters.transactionType;
  }

  /**
   * ----------------------------------------------------------
   * فیلتر قیمت
   * ----------------------------------------------------------
   */

  if (
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined
  ) {
    const priceConditions: any[] = [];

    const createRange = (field: string) => {
      const range: any = {};

      if (filters.minPrice !== undefined) {
        range.gte = filters.minPrice;
      }

      if (filters.maxPrice !== undefined) {
        range.lte = filters.maxPrice;
      }

      return {
        [field]: range,
      };
    };

    /**
     * خرید
     */
    if (filters.transactionType === "SALE") {
      priceConditions.push(
        createRange("salePrice")
      );
    }

    /**
     * رهن کامل
     */
    if (filters.transactionType === "FULL_DEPOSIT") {
      priceConditions.push(
        createRange("depositAmount")
      );
    }

    /**
     * اجاره
     *
     * فعلاً فیلتر قیمت را بر اساس ودیعه انجام می‌دهیم.
     * فیلتر مستقل rentAmount را بعداً اضافه می‌کنیم.
     */
    if (filters.transactionType === "RENT") {
      priceConditions.push(
        createRange("depositAmount")
      );
    }

    /**
     * اگر نوع معامله مشخص نشده باشد،
     * قیمت می‌تواند در salePrice یا depositAmount باشد.
     */
    if (!filters.transactionType) {
      priceConditions.push(
        createRange("salePrice")
      );

      priceConditions.push(
        createRange("depositAmount")
      );
    }

    if (priceConditions.length > 0) {
      listingWhere.OR = priceConditions;
    }
  }

  /**
   * ----------------------------------------------------------
   * Query
   * ----------------------------------------------------------
   */

  const properties =
    await prisma.property.findMany({
      where: {
        ...propertyWhere,
        listing: listingWhere,
      },

      include: {
        listing: true,

        media: {
          where: {
            isActive: true,
          },

          orderBy: {
            sortOrder: "asc",
          },
        },
      },

      orderBy: {
        updatedAt: "desc",
      },
    });

  /**
   * ----------------------------------------------------------
   * خروجی عمومی Search
   * ----------------------------------------------------------
   *
   * مختصات دقیق عمداً خارج از خروجی هستند.
   */

  return properties.map((property) => ({
    id: property.id,

    propertyType: property.propertyType,

    transactionType:
      property.listing?.transactionType ?? null,

    city: property.city,
    district: property.district,

    area: property.area,
    rooms: property.rooms,
    yearBuilt: property.yearBuilt,
    floor: property.floor,

    latitudePublic:
      property.latitudePublic,

    longitudePublic:
      property.longitudePublic,

    salePrice:
      property.listing?.salePrice ?? null,

    depositAmount:
      property.listing?.depositAmount ?? null,

    rentAmount:
      property.listing?.rentAmount ?? null,

    mainImage:
      property.media.find(
        (media) => media.type === "MAIN_IMAGE"
      )?.url ?? null,

    updatedAt: property.updatedAt,
  }));
}