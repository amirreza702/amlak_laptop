import type { Property } from "@prisma/client";

import {
  findPropertyById,
  findPropertiesWithinRadius,
} from "../repository/propertyRepository";

import {
  calculatePropertySimilarity,
} from "./propertySimilarityService";

/**
 * ============================================================
 * Constants
 * ============================================================
 */

/**
 * فاصله فقط شرط ورود Candidate به Matching است.
 *
 * این مقدار هیچ نقشی در Similarity Score ندارد.
 */
const DUPLICATE_MATCHING_RADIUS_METERS = 1000;

/**
 * فقط املاک با Similarity حداقل 80٪
 * به عنوان Match برگردانده می‌شوند.
 */
const DUPLICATE_MATCHING_THRESHOLD = 0.80;

/**
 * ============================================================
 * Duplicate Match Result
 * ============================================================
 */
export interface DuplicateMatchResult {
  property: Property;
  distanceMeters: number;
  similarityScore: number;
}

/**
 * ============================================================
 * Find Duplicate Matches
 * ============================================================
 *
 * جریان:
 *
 * Property
 *    ↓
 * پیدا کردن Candidateها در شعاع 1000 متر
 *    ↓
 * محاسبه Similarity فقط بر اساس مشخصات ملک
 *    ↓
 * حذف امتیازهای کمتر از 80٪
 *    ↓
 * بازگرداندن Matchها
 *
 * نکته:
 *
 * distanceMeters فقط برای نمایش/اطلاعات خروجی است.
 * در محاسبه similarityScore استفاده نمی‌شود.
 */
export const findDuplicateMatchesService = async (
  propertyId: string
): Promise<DuplicateMatchResult[]> => {
  /**
   * ----------------------------------------------------------
   * دریافت ملک اصلی
   * ----------------------------------------------------------
   */
  const primaryProperty =
    await findPropertyById(propertyId);

  if (!primaryProperty) {
    throw new Error(
      "ملک مورد نظر برای Matching پیدا نشد."
    );
  }

  /**
   * ----------------------------------------------------------
   * پیدا کردن Candidateها
   * ----------------------------------------------------------
   *
   * فقط املاکی که حداکثر 1000 متر
   * با ملک اصلی فاصله دارند وارد مرحله
   * Similarity می‌شوند.
   */
  const candidateProperties =
    await findPropertiesWithinRadius(
      primaryProperty.latitudeExact,
      primaryProperty.longitudeExact,
      DUPLICATE_MATCHING_RADIUS_METERS,
      propertyId
    );

  /**
   * ----------------------------------------------------------
   * Similarity
   * ----------------------------------------------------------
   *
   * فاصله در اینجا وارد محاسبه نمی‌شود.
   */
  const matches: DuplicateMatchResult[] =
    candidateProperties.map((candidate) => {
  

  const similarityScore =
    calculatePropertySimilarity(
      primaryProperty,
      candidate.property
    );

        return {
          property: candidate.property,
          distanceMeters:
            candidate.distanceMeters,
          similarityScore,
        };
      })
      /**
       * فقط Matchهای واقعی بالای 80٪
       */
      .filter(
        (match) =>
          match.similarityScore >=
          DUPLICATE_MATCHING_THRESHOLD
      )
      /**
       * بیشترین Similarity ابتدا
       */
      .sort(
        (a, b) =>
          b.similarityScore -
          a.similarityScore
      );

  return matches;
};