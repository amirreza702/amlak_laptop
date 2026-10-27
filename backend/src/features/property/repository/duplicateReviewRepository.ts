import { prisma } from "../../../lib/prisma";

import type { DuplicateDecision } from "@prisma/client";

import type { DuplicateReview } from "../types/duplicateReview";

/**
 * ============================================================
 * Find Duplicate Review By ID
 * ============================================================
 */
export const findDuplicateReviewById = async (
  id: string
): Promise<DuplicateReview | null> => {
  return prisma.duplicateReview.findUnique({
    where: { id },
  });
};

/**
 * ============================================================
 * Find Duplicate Reviews For Property
 * ============================================================
 *
 * تمام بررسی‌هایی که یک ملک در آن‌ها به عنوان
 * primary یا candidate حضور دارد.
 */
export const findDuplicateReviewsForProperty = async (
  propertyId: string
): Promise<DuplicateReview[]> => {
  return prisma.duplicateReview.findMany({
    where: {
      OR: [
        { primaryPropertyId: propertyId },
        { candidatePropertyId: propertyId },
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

/**
 * ============================================================
 * Create Duplicate Review
 * ============================================================
 */
export const createDuplicateReview = async (
  primaryPropertyId: string,
  candidatePropertyId: string,
  similarityScore: number
): Promise<DuplicateReview> => {
  return prisma.duplicateReview.create({
    data: {
      primaryPropertyId,
      candidatePropertyId,
      similarityScore,
    },
  });
};

/**
 * ============================================================
 * Review Duplicate
 * ============================================================
 */
export const reviewDuplicate = async (
  id: string,
  decision: DuplicateDecision,
  reviewedBy: string,
  notes: string | null
): Promise<DuplicateReview> => {
  return prisma.duplicateReview.update({
    where: { id },
    data: {
      decision,
      reviewedBy,
      reviewedAt: new Date(),
      notes,
    },
  });
};