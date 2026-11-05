import { ListingStatus, MediaType, Prisma, type PropertyMedia } from "@prisma/client";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "../../../lib/prisma";
import {
  createPropertyMedia,
  findPropertyMedia,
  findPropertyMediaById,
  countActivePropertyMedia,
  deactivatePropertyMedia,
  updatePropertyMediaOrder,
} from "../repository/propertyMediaRepository";
import { findPropertyAuthorizationContextById } from "../repository/propertyRepository";
import { authorizePropertyAction } from "./propertyAuthorizationService";
import { queuePropertyListingForHashtiReview } from "./propertyListingStatusService";
import type { AuthorizationActor } from "../../../shared/authorization/authorization.types";
import { requireAdminServicePermission } from "../../admin/service/adminService";

type PropertyMediaActor = AuthorizationActor;

async function authorizePropertyMedia(
  propertyId: string,
  actor: PropertyMediaActor,
  action: "MANAGE" | "READ_PRIVATE",
  db: Prisma.TransactionClient | typeof prisma = prisma,
) {
  if (actor.role === "HASHTI") await requireAdminServicePermission(actor.id, "PROPERTIES_MANAGE");
  if (actor.role === "HASHTI") await requireAdminServicePermission(actor.id, "PROPERTIES_MANAGE");
  const context = await findPropertyAuthorizationContextById(propertyId, db);
  if (!context) throw new Error("ملک مورد نظر پیدا نشد.");
  const allowed = await authorizePropertyAction(actor, action, context);
  if (!allowed) throw new Error("PROPERTY_MEDIA_ACCESS_FORBIDDEN");
  return context;
}

const storageRoot = () => path.resolve(process.env.HASHTI_UPLOAD_DIR || path.join(process.cwd(), "uploads"));
const storedFilePath = (id: string) => path.join(storageRoot(), "properties", id + ".webp");
const maxImageBytes = 4 * 1024 * 1024;
const maxImagesPerProperty = 20;

function decodeOptimizedWebp(data: string): Buffer {
  const match = /^data:image\/webp;base64,([A-Za-z0-9+/]+={0,2})$/.exec(data || "");
  if (!match) throw new Error("تصویر باید پس از بهینه‌سازی با قالب WebP ارسال شود.");
  const bytes = Buffer.from(match[1], "base64");
  if (!bytes.length || bytes.length > maxImageBytes) throw new Error("حجم تصویر بهینه‌شده نباید بیشتر از ۴ مگابایت باشد.");
  if (bytes.length < 12 || bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") {
    throw new Error("محتوای فایل تصویر معتبر نیست.");
  }
  return bytes;
}

export async function createPropertyMediaService(data: {
  propertyId: string;
  type: MediaType;
  imageData: string;
  sortOrder?: number;
  actor: PropertyMediaActor;
}): Promise<PropertyMedia> {
  if (data.type !== MediaType.IMAGE && data.type !== MediaType.MAIN_IMAGE) throw new Error("فقط فایل تصویری مجاز است.");
  if (!Number.isInteger(data.sortOrder ?? 0) || (data.sortOrder ?? 0) < 0) {
    throw new Error("ترتیب نمایش تصویر معتبر نیست.");
  }

  const bytes = decodeOptimizedWebp(data.imageData);
  const id = randomUUID();
  const destination = storedFilePath(id);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, bytes, { flag: "wx", mode: 0o640 });

  try {
    return await prisma.$transaction(async (tx) => {
      const context = await authorizePropertyMedia(data.propertyId, data.actor, "MANAGE", tx);
      if (context.deletedAt) throw new Error("ملک مورد نظر پیدا نشده یا حذف شده است.");
      const property = await tx.property.findUnique({
        where: { id: data.propertyId },
        select: { isActive: true, listing: { select: { status: true } } },
      });
      if (!property) throw new Error("ملک مورد نظر پیدا نشده است.");
      if (property.listing && ([ListingStatus.DRAFT, ListingStatus.PAUSED, ListingStatus.SOLD, ListingStatus.RENTED] as ListingStatus[]).includes(property.listing.status)) {
        throw new Error("بارگذاری تصویر برای این وضعیت آگهی مجاز نیست؛ ابتدا آگهی را برای بررسی انتشار به هشتی ارسال کنید.");
      }
      if (await countActivePropertyMedia(data.propertyId, tx) >= maxImagesPerProperty) {
        throw new Error("حداکثر ۲۰ تصویر برای هر ملک قابل ثبت است.");
      }
      const media = await createPropertyMedia(
        data.propertyId,
        data.type,
        "/public/property-media/" + id,
        data.sortOrder ?? 0,
        id,
        tx,
      );
      await queuePropertyListingForHashtiReview(data.propertyId, tx, data.actor.id);
      return media;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    await unlink(destination).catch(() => undefined);
    throw error;
  }
}

export async function getPropertyMediaService(propertyId: string, actor: PropertyMediaActor): Promise<PropertyMedia[]> {
  await authorizePropertyMedia(propertyId, actor, "READ_PRIVATE");
  return findPropertyMedia(propertyId);
}

export async function getPropertyMediaFileService(mediaId: string, propertyId?: string, publicOnly = false, actor?: PropertyMediaActor) {
  const media = await findPropertyMediaById(mediaId);
  if (!media || !media.isActive || (propertyId && media.propertyId !== propertyId)) throw new Error("تصویر مورد نظر پیدا نشد.");
  if (!publicOnly) {
    if (!actor) throw new Error("PROPERTY_MEDIA_ACCESS_FORBIDDEN");
    await authorizePropertyMedia(media.propertyId, actor, "READ_PRIVATE");
  }
  const listing = media.property.listing;
  if (publicOnly && (
    !media.property.isActive ||
    media.property.deletedAt ||
    !listing ||
    listing.status !== "PUBLISHED" ||
    !listing.confirmUntil ||
    listing.confirmUntil <= new Date()
  )) {
    throw new Error("تصویر هنوز عمومی نیست یا مهلت انتشار ملک به پایان رسیده است.");
  }
  return { bytes: await readFile(storedFilePath(media.id)), contentType: "image/webp" as const };
}

export async function deletePropertyMediaService(propertyId: string, mediaId: string, actor: PropertyMediaActor) {
  await prisma.$transaction(async (tx) => {
    await authorizePropertyMedia(propertyId, actor, "MANAGE", tx);
    const media = await findPropertyMediaById(mediaId, tx);
    if (!media || media.propertyId !== propertyId || !media.isActive) throw new Error("تصویر مورد نظر پیدا نشد.");
    const deleted = await deactivatePropertyMedia(mediaId, propertyId, tx);
    if (!deleted.count) throw new Error("تصویر مورد نظر پیدا نشد.");
    await queuePropertyListingForHashtiReview(propertyId, tx, actor.id);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  await unlink(storedFilePath(mediaId)).catch(() => undefined);
}

export async function reorderPropertyMediaService(propertyId: string, orderedIds: string[], actor: PropertyMediaActor) {
  return prisma.$transaction(async (tx) => {
    await authorizePropertyMedia(propertyId, actor, "MANAGE", tx);
    const current = await findPropertyMedia(propertyId, tx);
    if (!Array.isArray(orderedIds) || orderedIds.length !== current.length ||
        new Set(orderedIds).size !== orderedIds.length ||
        current.some((media) => !orderedIds.includes(media.id))) {
      throw new Error("ترتیب تصاویر باید شامل تمام تصاویر فعال همین ملک باشد.");
    }
    await updatePropertyMediaOrder(propertyId, orderedIds, tx);
    await queuePropertyListingForHashtiReview(propertyId, tx, actor.id);
    return findPropertyMedia(propertyId, tx);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
