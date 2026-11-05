import { ListingStatus } from "@prisma/client";
import { findHashtiPropertyRecords } from "../repository/propertyManagementRepository";
import { getPropertySimilaritySummaryService, DUPLICATE_MATCHING_THRESHOLD } from "../../property/service/duplicateMatchingService";
import { createPendingDuplicateReviewsForProperty } from "../../property/repository/duplicateReviewRepository";
import { updatePropertyListingStatus } from "../../property/service/propertyListingStatusService";
import { findPropertyById } from "../../property/repository/propertyRepository";

export async function getHashtiPropertyRecords(input: {
  status?: ListingStatus;
  query?: string;
  limit: number;
  offset: number;
}) {
  const result = await findHashtiPropertyRecords(input);
  const properties = result.properties.map(({ _count, ...record }) => ({
    ...record,
    requiresDuplicateReview: _count.duplicateReviewsAsPrimary > 0,
    maximumSimilarityScore: null,
  }));

  return { ...result, properties };
}

/** غربال انتشار: فقط تشابه فعلی ۸۰٪ یا بیشتر، ملک را به صف مشابهت می‌فرستد. */
export async function requestHashtiPropertyPublicationApproval(
  propertyId: string,
  actor: { id: string; role: string },
) {
  const property = await findPropertyById(propertyId);
  if (!property?.listing) throw new Error("برای این ملک اطلاعات معامله ثبت نشده است.");
  if (property.listing.status !== ListingStatus.PENDING_HASHTI_VERIFICATION) {
    throw new Error("این ملک در صف بررسی انتشار هشتی قرار ندارد.");
  }

  const summary = await getPropertySimilaritySummaryService(propertyId);

  if (summary.maximumSimilarityScore >= DUPLICATE_MATCHING_THRESHOLD) {
    await createPendingDuplicateReviewsForProperty(propertyId, summary.matches);
    return {
      published: false,
      requiresDuplicateReview: true,
      maximumSimilarityScore: summary.maximumSimilarityScore,
    };
  }

  const result = await updatePropertyListingStatus(propertyId, {
    status: ListingStatus.PUBLISHED,
  }, actor);

  return {
    published: true,
    requiresDuplicateReview: false,
    maximumSimilarityScore: summary.maximumSimilarityScore,
    ...result,
  };
}
