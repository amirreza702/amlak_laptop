import { ListingStatus } from "@prisma/client";
import { findHashtiPropertyRecords } from "../repository/propertyManagementRepository";
import { getPropertySimilaritySummaryService, DUPLICATE_MATCHING_THRESHOLD } from "../../property/service/duplicateMatchingService";
import { createPendingDuplicateReviewsForProperty } from "../../property/repository/duplicateReviewRepository";
import { updatePropertyListingStatus } from "../../property/service/propertyListingStatusService";
import { findPropertyById } from "../../property/repository/propertyRepository";
import { getPropertyVisibility, projectPropertyForActor } from "../../property/service/propertyAuthorizationService";
import type { AuthorizationActor } from "../../../shared/authorization/authorization.types";

export async function getHashtiPropertyRecords(
  input: {
    status?: ListingStatus;
    query?: string;
    limit: number;
    offset: number;
  },
  actor: AuthorizationActor,
) {
  const result = await findHashtiPropertyRecords(input);
  const properties = await Promise.all(result.properties.map(async ({ _count, ...record }) => {
    // حتی پنل هشتی نیز از همان Core عبور می‌کند؛ دسترسی گسترده هشتی
    // نتیجه Policy است، نه دور زدن Authorization در سرویس.
    const visibility = await getPropertyVisibility(actor, record);
    const safeProperty = projectPropertyForActor(record, visibility, {
      owners: record.owners,
      exposeCreatorContact: visibility.canViewRegistrantDetails,
      creatorMobile: record.creatorMobile,
    });

    return {
      ...safeProperty,
      requiresDuplicateReview: _count.duplicateReviewsAsPrimary > 0,
      maximumSimilarityScore: null,
    };
  }));

  return { ...result, properties };
}

/** غربال انتشار: فقط تشابه فعلی ۸۰٪ یا بیشتر، ملک را به صف مشابهت می‌فرستد. */
export async function requestHashtiPropertyPublicationApproval(
  propertyId: string,
  actor: { id: string; role: string },
) {
  if (actor.role !== "HASHTI") {
    throw new Error("تأیید انتشار فقط در اختیار هشتی است.");
  }

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
