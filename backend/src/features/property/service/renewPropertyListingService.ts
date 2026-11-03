import { ListingStatus, UserRole } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { queuePropertyListingForHashtiReview } from "./propertyListingStatusService";

export async function renewExpiredPropertyListing(propertyId: string, actor: { id: string; role: string }) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      isActive: true,
      createdByUserId: true,
      listing: { select: { id: true, status: true } },
      owners: {
        where: { owner: { is: { userId: actor.id } } },
        select: { ownerId: true },
        take: 1,
      },
      agents: {
        where: { agent: { is: { userId: actor.id } }, status: "ACTIVE", approvedByOwner: true },
        select: { agentId: true },
        take: 1,
      },
    },
  });

  if (!property?.listing) throw new Error("PROPERTY_OR_LISTING_NOT_FOUND");
  const isCreator = property.createdByUserId === actor.id &&
    (actor.role === UserRole.OWNER || actor.role === UserRole.AGENT);
  const authorized =
    isCreator ||
    (actor.role === UserRole.OWNER && property.owners.length > 0) ||
    (actor.role === UserRole.AGENT && property.agents.length > 0);
  if (!authorized) throw new Error("PROPERTY_RENEWAL_FORBIDDEN");
  if (!property.isActive) throw new Error("INACTIVE_PROPERTY_CANNOT_BE_RENEWED");
  if (property.listing.status !== ListingStatus.EXPIRED) throw new Error("PROPERTY_LISTING_NOT_EXPIRED");

  return prisma.$transaction(async (tx) => {
    const queued = await queuePropertyListingForHashtiReview(propertyId, tx, actor.id);
    if (!queued.queued || !queued.listing) throw new Error("PROPERTY_LISTING_NOT_EXPIRED");

    const recipients = await tx.user.findMany({
      where: { role: UserRole.HASHTI, isActive: true },
      select: { id: true },
    });
    if (recipients.length) {
      await tx.notification.createMany({
        data: recipients.map((recipient) => ({
          userId: recipient.id,
          title: "تمدید آگهی در انتظار تأیید هشتی",
          message: "یک آگهی منقضی‌شده برای بررسی و تأیید مجدد انتشار به صف هشتی بازگشته است.",
          details: {
            propertyId,
            action: "RENEWAL_PENDING_HASHTI_APPROVAL",
            occurredAt: new Date().toISOString(),
          },
        })),
      });
    }

    return { listing: queued.listing, requiresHashtiApproval: true };
  });
}
