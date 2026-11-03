import { DuplicateDecision, ListingStatus } from "@prisma/client";

import {
  createDuplicateReview,
  findDuplicateReviewById,
  findDuplicateReviewsForProperty,
  reviewDuplicate,
  findDuplicateReviewsForPrimaryProperty,
  findHashtiDuplicateReviewQueue,
} from "../repository/duplicateReviewRepository";

import { findPropertyById } from "../repository/propertyRepository";
import { updatePropertyListingStatus } from "./propertyListingStatusService";
import { getPropertySimilaritySummaryService } from "./duplicateMatchingService";

import type { DuplicateReview } from "../types/duplicateReview";

import {
  findDuplicateMatchesService,
} from "./duplicateMatchingService";

/**
 * ============================================================
 * Create Duplicate Review
 * ============================================================
 *
 * Review فقط برای Candidateای ایجاد می‌شود که قبلاً
 * در فرآیند Duplicate Matching به عنوان Match معتبر
 * شناخته شده باشد.
 *
 * بنابراین:
 *
 * Primary Property
 *       ↓
 * Duplicate Matching
 *       ↓
 * Candidate در شعاع 1000 متر
 *       ↓
 * Similarity >= 80%
 *       ↓
 * اجازه ایجاد Review
 *
 * اگر Candidate در Matching نباشد، Review ساخته نمی‌شود.
 */

export interface CreateDuplicateReviewInput {
  primaryPropertyId: string;
  candidatePropertyId: string;
}

export const createDuplicateReviewService = async (
  data: CreateDuplicateReviewInput
): Promise<DuplicateReview> => {
  /**
   * Primary و Candidate نباید یک ملک باشند.
   */
  if (
    data.primaryPropertyId ===
    data.candidatePropertyId
  ) {
    throw new Error(
      "ملک اصلی و ملک کاندید نمی‌توانند یکسان باشند."
    );
  }

  /**
   * ابتدا وجود ملک اصلی را بررسی می‌کنیم.
   */
  const primaryProperty =
    await findPropertyById(
      data.primaryPropertyId
    );

  if (!primaryProperty) {
    throw new Error(
      "ملک اصلی مورد نظر پیدا نشد."
    );
  }

  /**
   * وجود Candidate را هم بررسی می‌کنیم
   * تا خطای مناسب‌تری داشته باشیم.
   */
  const candidateProperty =
    await findPropertyById(
      data.candidatePropertyId
    );

  if (!candidateProperty) {
    throw new Error(
      "ملک کاندید مورد نظر پیدا نشد."
    );
  }

  /**
   * Candidate باید در خروجی Duplicate Matching
   * وجود داشته باشد.
   *
   * این سرویس خودش Similarity را محاسبه نمی‌کند؛
   * همان منطق واحد Matching را استفاده می‌کنیم.
   */
  const matches =
    await findDuplicateMatchesService(
      data.primaryPropertyId
    );

  /**
   * Candidate مورد نظر را از بین Matchهای معتبر پیدا می‌کنیم.
   */
  const matchedCandidate =
    matches.find(
      (match) =>
        match.property.id ===
        data.candidatePropertyId
    );

  /**
   * اگر Candidate در Matching معتبر نباشد،
   * اجازه ساخت Review نداریم.
   */
  if (!matchedCandidate) {
    throw new Error(
      "ملک کاندید در نتایج Duplicate Matching معتبر نیست."
    );
  }

  /**
   * فقط Score محاسبه‌شده توسط Matching
   * در Review ذخیره می‌شود.
   *
   * فاصله در Similarity دخالت ندارد.
   */
  return createDuplicateReview(
    data.primaryPropertyId,
    data.candidatePropertyId,
    matchedCandidate.similarityScore
  );
};

/**
 * ============================================================
 * Get Duplicate Reviews
 * ============================================================
 *
 * Reviewهای مربوط به یک ملک را برمی‌گرداند.
 */
export const getDuplicateReviewsService = async (
  propertyId: string
): Promise<DuplicateReview[]> => {
  const property =
    await findPropertyById(propertyId);

  if (!property) {
    throw new Error(
      "ملک مورد نظر پیدا نشد."
    );
  }

  return findDuplicateReviewsForProperty(
    propertyId
  );
};

/**
 * ============================================================
 * Review Duplicate
 * ============================================================
 *
 * تصمیم نهایی کارشناس Hashti روی Review.
 */
export interface ReviewDuplicateInput {
  duplicateReviewId: string;
  decision: DuplicateDecision;
  reviewedBy: string;
  notes: string | null;
}

export const reviewDuplicateService = async (
  data: ReviewDuplicateInput
): Promise<DuplicateReview> => {
  /**
   * Review باید وجود داشته باشد.
   */
  const duplicateReview =
    await findDuplicateReviewById(
      data.duplicateReviewId
    );

  if (!duplicateReview) {
    throw new Error(
      "بررسی تکراری بودن ملک پیدا نشد."
    );
  }

  /**
   * Review تصمیم‌گیری‌شده دوباره قابل تغییر نیست.
   */
  if (
    duplicateReview.decision !== null
  ) {
    throw new Error(
      "این بررسی قبلاً تصمیم‌گیری شده است."
    );
  }

  /**
   * فقط دو تصمیم معتبر داریم.
   */
  if (
    data.decision !==
      DuplicateDecision.SAME_PROPERTY &&
    data.decision !==
      DuplicateDecision.DIFFERENT_PROPERTY
  ) {
    throw new Error(
      "تصمیم بررسی تکراری بودن ملک معتبر نیست."
    );
  }

  /**
   * ثبت تصمیم نهایی.
   */
  return reviewDuplicate(
    data.duplicateReviewId,
    data.decision,
    data.reviewedBy,
    data.notes
  );
};

/** صف بررسی مشابهت، گروه‌بندی‌شده بر اساس ملک اصلی و فقط با آخرین تصمیم هر کاندیدا. */
export const getHashtiDuplicateReviewQueueService = async () => {
  const properties = await findHashtiDuplicateReviewQueue();
  return properties.map((property) => {
    const latestByCandidate = new Map<string, (typeof property.duplicateReviewsAsPrimary)[number]>();
    for (const review of property.duplicateReviewsAsPrimary) {
      if (!latestByCandidate.has(review.candidatePropertyId)) {
        latestByCandidate.set(review.candidatePropertyId, review);
      }
    }
    const reviews = [...latestByCandidate.values()];
    return {
      property: {
        id: property.id,
        propertyType: property.propertyType,
        city: property.city,
        district: property.district,
        area: property.area,
        rooms: property.rooms,
        listing: property.listing,
      },
      maximumSimilarityScore: reviews.reduce(
        (maximum, review) => Math.max(maximum, review.similarityScore),
        0
      ),
      reviews,
    };
  });
};

/** انتشار فقط از صف مشابهت و پس از تصمیم‌گیری درباره تمام کاندیداهای فعلی مجاز است. */
export const publishPropertyAfterDuplicateReviewService = async (propertyId: string) => {
  const reviews = await findDuplicateReviewsForPrimaryProperty(propertyId);
  if (reviews.length === 0) {
    throw new Error("برای این ملک پرونده بررسی مشابهت ثبت نشده است.");
  }

  const latestByCandidate = new Map<string, (typeof reviews)[number]>();
  for (const review of reviews) {
    if (!latestByCandidate.has(review.candidatePropertyId)) {
      latestByCandidate.set(review.candidatePropertyId, review);
    }
  }

  for (const review of latestByCandidate.values()) {
    if (review.decision === null) {
      throw new Error("ابتدا تمام پرونده‌های مشابهت این ملک را تعیین تکلیف کنید.");
    }
    if (review.decision === DuplicateDecision.SAME_PROPERTY) {
      throw new Error("حداقل یک کاندیدا همان ملک تشخیص داده شده است؛ انتشار این رکورد مجاز نیست.");
    }
    if (review.decision !== DuplicateDecision.DIFFERENT_PROPERTY) {
      throw new Error("تصمیم یکی از پرونده‌های مشابهت معتبر نیست.");
    }
  }

  const summary = await getPropertySimilaritySummaryService(propertyId);
  for (const match of summary.matches) {
    const review = latestByCandidate.get(match.property.id);
    if (!review || review.decision !== DuplicateDecision.DIFFERENT_PROPERTY) {
      throw new Error("برای یکی از املاک مشابه فعلی هنوز تصمیم نهایی ثبت نشده است.");
    }
  }

  return updatePropertyListingStatus(propertyId, { status: ListingStatus.PUBLISHED });
};


/** رد انتشار از صف مشابهت، فقط وقتی همه کاندیداها بررسی شده و حداقل یکی همان ملک باشد. */
export const rejectPropertyAfterDuplicateReviewService = async (propertyId: string) => {
  const reviews = await findDuplicateReviewsForPrimaryProperty(propertyId);
  if (reviews.length === 0) {
    throw new Error("برای این ملک پرونده بررسی مشابهت ثبت نشده است.");
  }

  const latestByCandidate = new Map<string, (typeof reviews)[number]>();
  for (const review of reviews) {
    if (!latestByCandidate.has(review.candidatePropertyId)) {
      latestByCandidate.set(review.candidatePropertyId, review);
    }
  }

  const latestReviews = [...latestByCandidate.values()];
  if (latestReviews.some((review) => review.decision === null)) {
    throw new Error("ابتدا تمام پرونده‌های مشابهت این ملک را تعیین تکلیف کنید.");
  }
  if (!latestReviews.some((review) => review.decision === DuplicateDecision.SAME_PROPERTY)) {
    throw new Error("برای رد انتشار باید دست‌کم یک کاندیدا به‌عنوان همان ملک تشخیص داده شده باشد.");
  }

  return updatePropertyListingStatus(propertyId, { status: ListingStatus.REJECTED });
};
