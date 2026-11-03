import { ListingStatus, PropertyHistoryAction, UserRole } from "@prisma/client";
import { prisma } from "../../../lib/prisma";

const LISTING_VALIDITY_DAYS = 31;

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

  const now = new Date();
  const confirmUntil = new Date(now);
  confirmUntil.setDate(confirmUntil.getDate() + LISTING_VALIDITY_DAYS);

  return prisma.$transaction(async (tx) => {
    const changed = await tx.propertyListing.updateMany({
      where: { id: property.listing!.id, status: ListingStatus.EXPIRED },
      data: { status: ListingStatus.PUBLISHED, publishedAt: now, expiredAt: null },
    });
    if (changed.count !== 1) throw new Error("PROPERTY_LISTING_NOT_EXPIRED");
    const listing = await tx.propertyListing.findUniqueOrThrow({ where: { id: property.listing!.id } });
    await tx.property.update({ where: { id: propertyId }, data: { confirmUntil } });
    await tx.propertyHistory.create({
      data: {
        propertyId,
        action: PropertyHistoryAction.LISTING_CHANGED,
        field: "listing.status",
        oldValue: ListingStatus.EXPIRED,
        newValue: ListingStatus.PUBLISHED,
        performedBy: actor.id,
        reason: "تمدید انتشار آگهی برای ۳۱ روز",
      },
    });
    return { listing, confirmUntil };
  });
}
