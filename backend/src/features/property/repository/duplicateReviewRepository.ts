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

/** تمام پرونده‌های یک ملک در نقش ملک اصلی، جدیدترین ابتدا. */
export const findDuplicateReviewsForPrimaryProperty = async (propertyId: string) => {
  return prisma.duplicateReview.findMany({
    where: { primaryPropertyId: propertyId },
    orderBy: { createdAt: "desc" },
  });
};

/** ایجاد پرونده‌های باز برای کاندیداهای معتبر؛ از ایجاد پرونده باز تکراری جلوگیری می‌شود. */
export const createPendingDuplicateReviewsForProperty = async (
  primaryPropertyId: string,
  matches: Array<{ property: { id: string }; similarityScore: number }>
) => {
  if (matches.length === 0) return;

  await prisma.$transaction(async (tx) => {
    const pending = await tx.duplicateReview.findMany({
      where: { primaryPropertyId, decision: null },
      select: { candidatePropertyId: true },
    });
    const pendingIds = new Set(pending.map((item) => item.candidatePropertyId));
    const newMatches = matches.filter((item) => !pendingIds.has(item.property.id));

    if (newMatches.length > 0) {
      await tx.duplicateReview.createMany({
        data: newMatches.map((item) => ({
          primaryPropertyId,
          candidatePropertyId: item.property.id,
          similarityScore: item.similarityScore,
        })),
      });
    }
  });
};

/** صف بررسی مشابهت هشتی؛ فقط ملک‌هایی که هنوز در انتظار انتشار هستند. */
export const findHashtiDuplicateReviewQueue = async () => {
  return prisma.property.findMany({
    where: {
      listing: { is: { status: "PENDING_HASHTI_VERIFICATION" } },
      duplicateReviewsAsPrimary: { some: {} },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      propertyType: true,
      city: true,
      district: true,
      area: true,
      rooms: true,
      listing: { select: { status: true } },
      duplicateReviewsAsPrimary: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          primaryPropertyId: true,
          candidatePropertyId: true,
          similarityScore: true,
          decision: true,
          notes: true,
          createdAt: true,
          reviewedAt: true,
          candidateProperty: {
            select: {
              id: true,
              propertyType: true,
              city: true,
              district: true,
              area: true,
              rooms: true,
            },
          },
        },
      },
    },
  });
};
