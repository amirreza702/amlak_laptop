import { unlink } from "node:fs/promises";
import path from "node:path";
import { ListingStatus, PropertyHistoryAction } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import type { AuthorizationActor } from "../../../shared/authorization/authorization.types";
import { findPropertyAuthorizationContextById } from "../repository/propertyRepository";
import { authorizePropertyAction } from "./propertyAuthorizationService";

const storageRoot = () => path.resolve(process.env.HASHTI_UPLOAD_DIR || path.join(process.cwd(), "uploads"));
const storedFilePath = (id: string) => path.join(storageRoot(), "properties", id + ".webp");

type PropertyDeleteAction = "DELETE_AS_OWNER" | "DELETE_AS_AGENT_CREATOR";

/**
 * حذف عملیاتی ملک؛ خواندن Context، تصمیم Authorization و تغییرات دیتابیس
 * در یک تراکنش انجام می‌شوند تا مجوز بر اساس رابطه یا وضعیت قدیمی صادر نشود.
 */
async function removePropertyFromOperationalUse(
  propertyId: string,
  actor: AuthorizationActor,
  action: PropertyDeleteAction,
  reason: string,
) {
  const result = await prisma.$transaction(async (tx) => {
    const authorizationContext = await findPropertyAuthorizationContextById(propertyId, tx);
    if (!authorizationContext) throw new Error("PROPERTY_NOT_FOUND");

    const allowed = await authorizePropertyAction(actor, action, authorizationContext);
    if (!allowed) {
      throw new Error(action === "DELETE_AS_OWNER"
        ? "PROPERTY_NOT_OWNED_BY_USER"
        : "PROPERTY_NOT_REGISTERED_BY_AGENT");
    }

    if (authorizationContext.deletedAt) throw new Error("PROPERTY_ALREADY_DELETED");

    const property = await tx.property.findUnique({
      where: { id: propertyId },
      select: { id: true, listing: { select: { status: true } } },
    });
    if (!property) throw new Error("PROPERTY_NOT_FOUND");

    const media = await tx.propertyMedia.findMany({ where: { propertyId }, select: { id: true } });
    const deletedAt = new Date();
    const updated = await tx.property.update({
      where: { id: propertyId },
      data: { isActive: false, deletedAt },
    });

    await tx.propertyListing.updateMany({
      where: { propertyId },
      data: { status: ListingStatus.DELETED, confirmUntil: null },
    });
    await tx.propertyAgent.updateMany({
      where: { propertyId, status: "ACTIVE" },
      data: { status: "REVOKED" },
    });
    await tx.ownerAgentRequest.updateMany({
      where: { propertyId, status: "ACTIVE" },
      data: { status: "DELETED" },
    });
    await tx.agentPrivateNote.deleteMany({ where: { entityType: "property", entityId: propertyId } });
    await tx.propertyMedia.deleteMany({ where: { propertyId } });

    await tx.propertyHistory.createMany({
      data: [
        {
          propertyId,
          action: PropertyHistoryAction.DELETED,
          field: "property.deletedAt",
          oldValue: null,
          newValue: deletedAt.toISOString(),
          performedBy: actor.id,
          reason,
        },
        ...(property.listing ? [{
          propertyId,
          action: PropertyHistoryAction.DELETED,
          field: "listing.status",
          oldValue: property.listing.status,
          newValue: ListingStatus.DELETED,
          performedBy: actor.id,
          reason: "آگهی از چرخه عملیاتی خارج شد؛ داده‌های تاریخی حفظ شدند.",
        }] : []),
        {
          propertyId,
          action: PropertyHistoryAction.DELETED,
          field: "cooperation",
          oldValue: "ACTIVE",
          newValue: "REVOKED",
          performedBy: actor.id,
          reason: "همکاری‌ها و درخواست‌های فعال مرتبط با ملک خاتمه یافتند.",
        },
      ],
    });

    return { property: updated, mediaIds: media.map((item) => item.id) };
  });

  // فایل‌ها پس از Commit دیتابیس حذف می‌شوند.
  await Promise.all(result.mediaIds.map((id) => unlink(storedFilePath(id)).catch(() => undefined)));
  return result.property;
}

export async function deleteOwnPropertyService(propertyId: string, actor: AuthorizationActor) {
  return removePropertyFromOperationalUse(
    propertyId,
    actor,
    "DELETE_AS_OWNER",
    "مالک مرتبط، ملک و آگهی را حذف کرد؛ سوابق مدیریتی و حسابرسی حفظ شدند.",
  );
}

export async function deleteAgentManagedOwnerPropertyService(propertyId: string, actor: AuthorizationActor) {
  return removePropertyFromOperationalUse(
    propertyId,
    actor,
    "DELETE_AS_AGENT_CREATOR",
    "مشاور ایجادکننده، ملک و آگهی را حذف کرد؛ سوابق مدیریتی و حسابرسی حفظ شدند.",
  );
}

/**
 * فعال‌سازی مجدد عادی هرگز ملک حذف‌شده را احیا نمی‌کند.
 * تصمیم مجوز و تغییر وضعیت در یک تراکنش و با Context تازه انجام می‌شوند.
 */
export async function reactivateOwnPropertyService(propertyId: string, actor: AuthorizationActor) {
  const archived = await prisma.propertyArchive.findUnique({
    where: { propertyId },
    select: { propertyId: true },
  });

  if (archived) {
    const { restorePropertyService } = await import("./propertyArchiveService.js");
    await restorePropertyService(propertyId, actor);
    return prisma.property.findUniqueOrThrow({ where: { id: propertyId } });
  }

  return prisma.$transaction(async (tx) => {
    const authorizationContext = await findPropertyAuthorizationContextById(propertyId, tx);
    if (!authorizationContext) throw new Error("PROPERTY_NOT_FOUND");
    if (authorizationContext.deletedAt) throw new Error("PROPERTY_PERMANENTLY_DELETED");

    const allowed = await authorizePropertyAction(actor, "REACTIVATE_AS_OWNER", authorizationContext);
    if (!allowed) throw new Error("PROPERTY_NOT_OWNED_BY_USER");

    const property = await tx.property.findUnique({
      where: { id: propertyId },
      select: { isActive: true },
    });
    if (!property) throw new Error("PROPERTY_NOT_FOUND");
    if (property.isActive) throw new Error("PROPERTY_ALREADY_ACTIVE");

    const updated = await tx.property.update({
      where: { id: propertyId },
      data: { isActive: true },
    });
    await tx.propertyHistory.create({
      data: {
        propertyId,
        action: PropertyHistoryAction.OTHER,
        field: "isActive",
        oldValue: "false",
        newValue: "true",
        performedBy: actor.id,
        reason: "مالک ملک غیرفعال اما حذف‌نشده را دوباره فعال کرد.",
      },
    });
    return updated;
  });
}
