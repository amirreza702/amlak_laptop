import { MediaType, type PropertyMedia } from "@prisma/client";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  createPropertyMedia,
  findPropertyMedia,
  findPropertyMediaById,
  countActivePropertyMedia,
  deactivatePropertyMedia,
  updatePropertyMediaOrder,
} from "../repository/propertyMediaRepository";
import { findPropertyById } from "../repository/propertyRepository";
import { queuePropertyListingForHashtiReview } from "./propertyListingStatusService";

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
}): Promise<PropertyMedia> {
  if (data.type !== MediaType.IMAGE && data.type !== MediaType.MAIN_IMAGE) throw new Error("فقط فایل تصویری مجاز است.");
  const property = await findPropertyById(data.propertyId);
  if (!property) throw new Error("ملک مورد نظر پیدا نشد.");
  if (await countActivePropertyMedia(data.propertyId) >= maxImagesPerProperty) {
    throw new Error("حداکثر ۲۰ تصویر برای هر ملک قابل ثبت است.");
  }
  if (!Number.isInteger(data.sortOrder ?? 0) || (data.sortOrder ?? 0) < 0) {
    throw new Error("ترتیب نمایش تصویر معتبر نیست.");
  }

  const bytes = decodeOptimizedWebp(data.imageData);
  const id = randomUUID();
  const destination = storedFilePath(id);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, bytes, { flag: "wx", mode: 0o640 });
  let media: PropertyMedia;
  try {
    media = await createPropertyMedia(data.propertyId, data.type, "/public/property-media/" + id, data.sortOrder ?? 0, id);
  } catch (error) {
    await unlink(destination).catch(() => undefined);
    throw error;
  }
  await queuePropertyListingForHashtiReview(data.propertyId);
  return media;
}

export async function getPropertyMediaService(propertyId: string): Promise<PropertyMedia[]> {
  const property = await findPropertyById(propertyId);
  if (!property) throw new Error("ملک مورد نظر پیدا نشد.");
  return findPropertyMedia(propertyId);
}

export async function getPropertyMediaFileService(mediaId: string, propertyId?: string, publicOnly = false) {
  const media = await findPropertyMediaById(mediaId);
  if (!media || !media.isActive || (propertyId && media.propertyId !== propertyId)) throw new Error("تصویر مورد نظر پیدا نشد.");
  if (publicOnly && media.property.listing?.status !== "PUBLISHED") throw new Error("تصویر هنوز عمومی نشده است.");
  return { bytes: await readFile(storedFilePath(media.id)), contentType: "image/webp" as const };
}

export async function deletePropertyMediaService(propertyId: string, mediaId: string) {
  const media = await findPropertyMediaById(mediaId);
  if (!media || media.propertyId !== propertyId || !media.isActive) throw new Error("تصویر مورد نظر پیدا نشد.");
  await deactivatePropertyMedia(mediaId, propertyId);
  await queuePropertyListingForHashtiReview(propertyId);
  await unlink(storedFilePath(mediaId)).catch(() => undefined);
}

export async function reorderPropertyMediaService(propertyId: string, orderedIds: string[]) {
  const current = await findPropertyMedia(propertyId);
  if (!Array.isArray(orderedIds) || orderedIds.length !== current.length ||
      new Set(orderedIds).size !== orderedIds.length ||
      current.some((media) => !orderedIds.includes(media.id))) {
    throw new Error("ترتیب تصاویر باید شامل تمام تصاویر فعال همین ملک باشد.");
  }
  await updatePropertyMediaOrder(propertyId, orderedIds);
  await queuePropertyListingForHashtiReview(propertyId);
  return findPropertyMedia(propertyId);
}
