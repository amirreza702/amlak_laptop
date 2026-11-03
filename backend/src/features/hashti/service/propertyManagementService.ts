import { ListingStatus } from "@prisma/client";
import { findHashtiPropertyRecords } from "../repository/propertyManagementRepository";
import { getPropertySimilaritySummaryService, DUPLICATE_MATCHING_THRESHOLD } from "../../property/service/duplicateMatchingService";
import { createPendingDuplicateReviewsForProperty, findDuplicateReviewsForPrimaryProperty } from "../../property/repository/duplicateReviewRepository";
import { updatePropertyListingStatus } from "../../property/service/propertyListingStatusService";

export async function getHashtiPropertyRecords(input: {
  status?: ListingStatus;
  query?: string;
  limit: number;
  offset: number;
}) {
  const result = await findHashtiPropertyRecords(input);
  if (input.status !== ListingStatus.PENDING_HASHTI_VERIFICATION) return result;

  const properties = await Promise.all(result.properties.map(async (property) => {
    const summary = await getPropertySimilaritySummaryService(property.id);
    return { ...property, maximumSimilarityScore: summary.maximumSimilarityScore };
  }));

  return { ...result, properties };
}

/** غربال انتشار: تشابه بالا ملک را به صف مشابهت می‌فرستد، در غیر این صورت منتشر می‌کند. */
export async function requestHashtiPropertyPublicationApproval(propertyId: string) {
  const [summary, existingReviews] = await Promise.all([
    getPropertySimilaritySummaryService(propertyId),
    findDuplicateReviewsForPrimaryProperty(propertyId),
  ]);

  if (summary.maximumSimilarityScore >= DUPLICATE_MATCHING_THRESHOLD || existingReviews.length > 0) {
    await createPendingDuplicateReviewsForProperty(propertyId, summary.matches);
    return {
      published: false,
      requiresDuplicateReview: true,
      maximumSimilarityScore: summary.maximumSimilarityScore,
    };
  }

  const result = await updatePropertyListingStatus(propertyId, {
    status: ListingStatus.PUBLISHED,
  });

  return {
    published: true,
    requiresDuplicateReview: false,
    maximumSimilarityScore: summary.maximumSimilarityScore,
    ...result,
  };
}
