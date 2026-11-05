import { ListingStatus, Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { authorizePropertyAction } from "./propertyAuthorizationService";
import { queuePropertyListingForHashtiReview } from "./propertyListingStatusService";
import { findPropertyAuthorizationContextById } from "../repository/propertyRepository";
import type { AuthorizationActor } from "../../../shared/authorization/authorization.types";

/**
 * تمدید فقط یک درخواست بررسی مجدد برای هشتی ایجاد می‌کند.
 * مجوز تمدید از Policy مرکزی ملک می‌آید؛ مالکیت/تأیید مشاور
 * در این Service به‌صورت دستی تفسیر نمی‌شود.
 */
export async function renewExpiredPropertyListing(
  propertyId: string,
  actor: AuthorizationActor,
) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      isActive: true,
      registrationSource: true,
      createdByUserId: true,
      deletedAt: true,
      listing: { select: { id: true, status: true, confirmUntil: true } },
      owners: {
        select: {
          ownerId: true,
          owner: { select: { userId: true } },
        },
      },
      agents: {
        where: { status: "ACTIVE" },
        select: {
          agentId: true,
          status: true,
          approvedByOwner: true,
          approvedByOwnerId: true,
          agent: { select: { userId: true } },
        },
      },
    },
  });

  if (!property?.listing) throw new Error("PROPERTY_OR_LISTING_NOT_FOUND");
  if (!property.isActive || property.deletedAt) {
    throw new Error("INACTIVE_PROPERTY_CANNOT_BE_RENEWED");
  }

  const authorized = await authorizePropertyAction(
    actor,
    "RENEW",
    property,
  );
  if (!authorized) throw new Error("PROPERTY_RENEWAL_FORBIDDEN");
  if (property.listing.status !== ListingStatus.EXPIRED) {
    throw new Error("PROPERTY_LISTING_NOT_EXPIRED");
  }

  return prisma.$transaction(async (tx) => {
    const freshProperty = await findPropertyAuthorizationContextById(propertyId, tx);
    if (!freshProperty?.listing || !freshProperty.isActive || freshProperty.deletedAt) {
      throw new Error("INACTIVE_PROPERTY_CANNOT_BE_RENEWED");
    }
    const freshAllowed = await authorizePropertyAction(actor, "RENEW", freshProperty);
    if (!freshAllowed) throw new Error("PROPERTY_RENEWAL_FORBIDDEN");
    if (freshProperty.listing.status !== ListingStatus.EXPIRED) throw new Error("PROPERTY_LISTING_NOT_EXPIRED");
    // انتشار و شروع مهلت جدید فقط پس از تأیید هشتی انجام می‌شود.
    const queued = await queuePropertyListingForHashtiReview(propertyId, tx, actor.id);
    if (!queued.queued || !queued.listing) {
      throw new Error("PROPERTY_LISTING_NOT_EXPIRED");
    }
    return { listing: queued.listing, requiresHashtiApproval: true };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
