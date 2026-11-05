import { unlink } from "node:fs/promises";
import path from "node:path";
import { PropertyHistoryAction, type Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { findPropertyArchive } from "../repository/propertyArchiveRepository";
import { findPropertyAuthorizationContextById } from "../repository/propertyRepository";
import { authorizePropertyAction } from "./propertyAuthorizationService";
import type { AuthorizationActor } from "../../../shared/authorization/authorization.types";
import type { PropertyArchive } from "../types/propertyArchive";
import { requireAdminServicePermission } from "../../admin/service/adminService";

const storageRoot = () => path.resolve(process.env.HASHTI_UPLOAD_DIR || path.join(process.cwd(), "uploads"));
const storedFilePath = (id: string) => path.join(storageRoot(), "properties", id + ".webp");

/** هسته مشترک آرشیو؛ برای اتمیک بودن تغییر وضعیت SOLD/RENTED در تراکنش فراخواننده اجرا می‌شود. */
export async function archivePropertyInTransaction(
  tx: Prisma.TransactionClient,
  propertyId: string,
  archivedReason?: string | null,
): Promise<{ archive: PropertyArchive; mediaIds: string[] } | null> {
  const property = await tx.property.findUnique({
    where: { id: propertyId },
    include: { listing: true },
  });
  if (!property) throw new Error("ملک مورد نظر پیدا نشد.");
  if (property.deletedAt) throw new Error("ملک حذف‌شده قابل آرشیو یا بازیابی نیست.");

  const existingArchive = await tx.propertyArchive.findUnique({ where: { propertyId } });
  if (existingArchive) return null;

  const media = await tx.propertyMedia.findMany({ where: { propertyId }, select: { id: true } });
  const archive = await tx.propertyArchive.create({
    data: {
      propertyId: property.id,
      propertyType: property.propertyType,
      city: property.city,
      district: property.district,
      transactionType: property.listing?.transactionType ?? null,
      archivedReason: archivedReason ?? null,
    },
  });

  await tx.propertyListing.deleteMany({ where: { propertyId } });
  await tx.propertyMedia.deleteMany({ where: { propertyId } });
  await tx.property.update({ where: { id: propertyId }, data: { isActive: false } });
  await tx.propertyHistory.create({
    data: {
      propertyId,
      action: PropertyHistoryAction.ARCHIVED,
      field: "isActive",
      oldValue: "true",
      newValue: "false",
      reason: archivedReason ?? "آرشیو ملک",
    },
  });

  return { archive, mediaIds: media.map((item) => item.id) };
}

export async function removeArchivedPropertyMediaFiles(mediaIds: string[]) {
  await Promise.all(mediaIds.map((id) => unlink(storedFilePath(id)).catch(() => undefined)));
}

export interface ArchivePropertyInput {
  propertyId: string;
  archivedReason?: string | null;
  actor: AuthorizationActor;
}

async function requireArchivePermission(
  propertyId: string,
  actor: AuthorizationActor,
  action: "ARCHIVE" | "VIEW_ARCHIVE" | "RESTORE",
  db: Prisma.TransactionClient | typeof prisma = prisma,
) {
  if (actor.role === "HASHTI") await requireAdminServicePermission(actor.id, "PROPERTIES_MANAGE");
  if (actor.role === "HASHTI") await requireAdminServicePermission(actor.id, "PROPERTIES_MANAGE");
  const property = await findPropertyAuthorizationContextById(propertyId, db);
  if (!property) throw new Error("ملک مورد نظر پیدا نشد.");
  const allowed = await authorizePropertyAction(actor, action, property);
  if (!allowed) throw new Error("PROPERTY_ARCHIVE_FORBIDDEN");
  return property;
}

export const archivePropertyService = async (data: ArchivePropertyInput): Promise<PropertyArchive> => {
  const result = await prisma.$transaction(async (tx) => {
    // مجوز در همان تراکنش و با Context تازه بررسی می‌شود تا بین بررسی و آرشیو فاصله ناامن ایجاد نشود.
    await requireArchivePermission(data.propertyId, data.actor, "ARCHIVE", tx);
    return archivePropertyInTransaction(tx, data.propertyId, data.archivedReason);
  });
  if (!result) throw new Error("این ملک قبلاً آرشیو شده است.");
  await removeArchivedPropertyMediaFiles(result.mediaIds);
  return result.archive;
};

export const getPropertyArchiveService = async (
  propertyId: string,
  actor: AuthorizationActor,
): Promise<PropertyArchive> => {
  await requireArchivePermission(propertyId, actor, "VIEW_ARCHIVE");
  const archive = await findPropertyArchive(propertyId);
  if (!archive) throw new Error("آرشیو این ملک پیدا نشد.");
  return archive;
};

export const restorePropertyService = async (
  propertyId: string,
  actor: AuthorizationActor,
): Promise<PropertyArchive> => {
  return prisma.$transaction(async (tx) => {
    const property = await requireArchivePermission(propertyId, actor, "RESTORE", tx);
    if (property.deletedAt) throw new Error("ملک حذف‌شده قابل بازیابی نیست.");

    const archive = await tx.propertyArchive.findUnique({ where: { propertyId } });
    if (!archive) throw new Error("آرشیو این ملک پیدا نشد.");

    await tx.property.update({ where: { id: propertyId }, data: { isActive: true } });
    await tx.propertyHistory.create({
      data: {
        propertyId,
        action: PropertyHistoryAction.RESTORED,
        field: "isActive",
        oldValue: "false",
        newValue: "true",
        reason: "بازگردانی ملک از آرشیو",
        performedBy: actor.id,
      },
    });
    await tx.propertyArchive.delete({ where: { propertyId } });
    return archive;
  }, { isolationLevel: "Serializable" });
};
