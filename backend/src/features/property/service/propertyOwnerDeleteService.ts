import { unlink } from "node:fs/promises";
import path from "node:path";
import { ListingStatus, PropertyHistoryAction } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { authorizePropertyAction } from "./propertyAuthorizationService";

const storageRoot = () => path.resolve(process.env.HASHTI_UPLOAD_DIR || path.join(process.cwd(), "uploads"));
const storedFilePath = (id: string) => path.join(storageRoot(), "properties", id + ".webp");

/** حذف عملیاتی ملک؛ سوابق مدیریتی و حسابرسی حفظ می‌شوند. */
async function removePropertyFromOperationalUse(propertyId: string, userId: string, reason: string) {
  const result = await prisma.$transaction(async (tx) => {
    const property = await tx.property.findUnique({
      where: { id: propertyId },
      select: { id: true, deletedAt: true, listing: { select: { status: true } } },
    });
    if (!property) throw new Error("PROPERTY_NOT_FOUND");
    if (property.deletedAt) throw new Error("PROPERTY_ALREADY_DELETED");

    const media = await tx.propertyMedia.findMany({ where: { propertyId }, select: { id: true } });
    const deletedAt = new Date();
    const updated = await tx.property.update({
      where: { id: propertyId },
      data: { isActive: false, deletedAt },
    });

    await tx.propertyListing.updateMany({ where: { propertyId }, data: { status: ListingStatus.DELETED, confirmUntil: null } });
    // همکاری خاتمه می‌یابد، اما مشخصات و زمان تأیید مالک برای حسابرسی حفظ می‌شود.
    await tx.propertyAgent.updateMany({ where: { propertyId, status: "ACTIVE" }, data: { status: "REVOKED" } });
    await tx.ownerAgentRequest.updateMany({ where: { propertyId, status: "ACTIVE" }, data: { status: "DELETED" } });
    await tx.agentPrivateNote.deleteMany({ where: { entityType: "property", entityId: propertyId } });
    await tx.propertyMedia.deleteMany({ where: { propertyId } });

    await tx.propertyHistory.createMany({
      data: [
        { propertyId, action: PropertyHistoryAction.DELETED, field: "property.deletedAt", oldValue: null, newValue: deletedAt.toISOString(), performedBy: userId, reason },
        ...(property.listing ? [{
          propertyId, action: PropertyHistoryAction.DELETED, field: "listing.status",
          oldValue: property.listing.status, newValue: ListingStatus.DELETED,
          performedBy: userId, reason: "آگهی از چرخه عملیاتی خارج شد؛ داده‌های تاریخی حفظ شدند.",
        }] : []),
        { propertyId, action: PropertyHistoryAction.DELETED, field: "cooperation", oldValue: "ACTIVE", newValue: "REVOKED", performedBy: userId, reason: "همکاری‌ها و درخواست‌های فعال مرتبط با ملک خاتمه یافتند." },
      ],
    });
    return { property: updated, mediaIds: media.map((item) => item.id) };
  });

  // مسیر ذخیره‌سازی مطابق PropertyMediaService است.
  await Promise.all(result.mediaIds.map((id) => unlink(storedFilePath(id)).catch(() => undefined)));
  return result.property;
}

export async function deleteOwnPropertyService(propertyId: string, userId: string) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      registrationSource: true,
      createdByUserId: true,
      deletedAt: true,
      listing: { select: { status: true, confirmUntil: true } },
      owners: {
        select: { ownerId: true, owner: { select: { userId: true } } },
      },
    },
  });
  if (!property) throw new Error("PROPERTY_NOT_FOUND");

  const allowed = await authorizePropertyAction(
    { id: userId, role: "OWNER" },
    "MANAGE",
    property,
  );
  if (!allowed) throw new Error("PROPERTY_NOT_OWNED_BY_USER");

  // مالک مرتبط از طریق رابطه‌ای که Policy مرکزی تأیید کرده شناسایی می‌شود.
  const isRelatedOwner = property.owners.some((relation) => relation.owner.userId === userId);
  if (property.deletedAt) throw new Error("PROPERTY_ALREADY_DELETED");

  return removePropertyFromOperationalUse(
    propertyId,
    userId,
    isRelatedOwner
      ? "مالک مرتبط، ملک و آگهی را حذف کرد؛ سوابق مدیریتی و حسابرسی حفظ شدند."
      : "مالک ایجادکننده، ملک و آگهی را حذف کرد؛ سوابق مدیریتی و حسابرسی حفظ شدند."
  );
}

export async function deleteAgentManagedOwnerPropertyService(propertyId: string, userId: string) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true, deletedAt: true, registrationSource: true, createdByUserId: true,
      listing: { select: { status: true, confirmUntil: true } },
    },
  });
  if (!property) throw new Error("PROPERTY_NOT_FOUND");
  const allowed = await authorizePropertyAction(
    { id: userId, role: "AGENT" },
    "MANAGE",
    property,
  );
  if (!allowed) throw new Error("PROPERTY_NOT_REGISTERED_BY_AGENT");
  if (property.deletedAt) throw new Error("PROPERTY_ALREADY_DELETED");
  return removePropertyFromOperationalUse(propertyId, userId,
    "مشاور ایجادکننده، ملک و آگهی را حذف کرد؛ سوابق مدیریتی و حسابرسی حفظ شدند.");
}

/** فعال‌سازی عادی هرگز ملک حذف‌شده را احیا نمی‌کند. */
export async function reactivateOwnPropertyService(propertyId: string, userId: string) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true, isActive: true, deletedAt: true, registrationSource: true,
      createdByUserId: true,
      listing: { select: { status: true, confirmUntil: true } },
      owners: { select: { ownerId: true, owner: { select: { userId: true } } } },
    },
  });
  if (!property) throw new Error("PROPERTY_NOT_FOUND");
  const allowed = await authorizePropertyAction(
    { id: userId, role: "OWNER" },
    "MANAGE",
    property,
  );
  if (!allowed) throw new Error("PROPERTY_NOT_OWNED_BY_USER");
  if (property.deletedAt) throw new Error("PROPERTY_PERMANENTLY_DELETED");
  if (property.isActive) throw new Error("PROPERTY_ALREADY_ACTIVE");

  const archive = await prisma.propertyArchive.findUnique({ where: { propertyId }, select: { propertyId: true } });
  if (archive) {
    const { restorePropertyService } = await import("./propertyArchiveService.js");
    await restorePropertyService(propertyId);
    return prisma.property.findUniqueOrThrow({ where: { id: propertyId } });
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.property.update({ where: { id: propertyId }, data: { isActive: true } });
    await tx.propertyHistory.create({
      data: { propertyId, action: PropertyHistoryAction.OTHER, field: "isActive", oldValue: "false", newValue: "true", performedBy: userId, reason: "مالک ملک غیرفعال اما حذف‌نشده را دوباره فعال کرد." },
    });
    return updated;
  });
}
