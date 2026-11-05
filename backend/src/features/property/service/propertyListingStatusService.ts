import { unlink } from "node:fs/promises";
import path from "node:path";

import {
  ListingStatus,
  Prisma,
  PropertyHistoryAction,
} from "@prisma/client";

import { prisma } from "../../../lib/prisma";

import {
  findPropertyListingByPropertyId,
  updatePropertyListing,
} from "../repository/propertyListingRepository";
import { findPropertyAuthorizationContextById } from "../repository/propertyRepository";
import { authorizePropertyAction } from "./propertyAuthorizationService";

import { archivePropertyInTransaction } from "./propertyArchiveService";

import {
  createPropertyHistory,
} from "../repository/propertyHistoryRepository";

import type {
  UpdatePropertyListingStatusInput,
} from "../types/updatePropertyListingStatus";

/**
 * وضعیت‌های مجاز برای تغییر Listing
 */
const allowedTransitions: Record<ListingStatus, ListingStatus[]> = {
  [ListingStatus.DRAFT]: [ListingStatus.PENDING_HASHTI_VERIFICATION, ListingStatus.PAUSED, ListingStatus.SOLD, ListingStatus.RENTED],
  [ListingStatus.PENDING_HASHTI_VERIFICATION]: [ListingStatus.PUBLISHED, ListingStatus.REJECTED, ListingStatus.DRAFT, ListingStatus.PAUSED, ListingStatus.SOLD, ListingStatus.RENTED],
  [ListingStatus.PUBLISHED]: [ListingStatus.PENDING_HASHTI_VERIFICATION, ListingStatus.PAUSED, ListingStatus.SOLD, ListingStatus.RENTED, ListingStatus.DRAFT],
  [ListingStatus.REJECTED]: [ListingStatus.DRAFT, ListingStatus.PENDING_HASHTI_VERIFICATION, ListingStatus.PAUSED, ListingStatus.SOLD, ListingStatus.RENTED],
  [ListingStatus.EXPIRED]: [ListingStatus.DRAFT, ListingStatus.PENDING_HASHTI_VERIFICATION, ListingStatus.PAUSED, ListingStatus.SOLD, ListingStatus.RENTED],
  [ListingStatus.PAUSED]: [ListingStatus.DRAFT, ListingStatus.PENDING_HASHTI_VERIFICATION, ListingStatus.SOLD, ListingStatus.RENTED],
  [ListingStatus.SOLD]: [ListingStatus.DRAFT, ListingStatus.PENDING_HASHTI_VERIFICATION, ListingStatus.PAUSED, ListingStatus.RENTED],
  [ListingStatus.RENTED]: [ListingStatus.DRAFT, ListingStatus.PENDING_HASHTI_VERIFICATION, ListingStatus.PAUSED, ListingStatus.SOLD],
  [ListingStatus.DELETED]: [],
};

/**
 * مدت اعتبار تأیید ملک
 */
const PROPERTY_CONFIRMATION_DAYS = 31;
const mediaStorageRoot = () => path.resolve(process.env.HASHTI_UPLOAD_DIR || path.join(process.cwd(), "uploads"));
const mediaFilePath = (id: string) => path.join(mediaStorageRoot(), "properties", id + ".webp");

/**
 * محاسبه تاریخ پایان مهلت تأیید
 */
function calculateConfirmUntil(
  from: Date
): Date {
  const confirmUntil = new Date(from);

  confirmUntil.setDate(
    confirmUntil.getDate() +
      PROPERTY_CONFIRMATION_DAYS
  );

  return confirmUntil;
}

/**
 * بازگرداندن آگهی به صف بررسی هشتی پس از هر تغییر محتوای منتشرشده.
 * این تابع در تراکنش فراخوان قابل استفاده است و در نبود Listing کاری انجام نمی‌دهد.
 */
export async function queuePropertyListingForHashtiReview(
  propertyId: string,
  transaction?: Prisma.TransactionClient,
  performedBy?: string
) {
  const apply = async (tx: Prisma.TransactionClient) => {
    const property = await tx.property.findUnique({ where: { id: propertyId }, select: { deletedAt: true } });
    if (!property || property.deletedAt) return { queued: false, listing: null };
    const listing = await findPropertyListingByPropertyId(propertyId, tx);
    if (
      !listing ||
      !([ListingStatus.PUBLISHED, ListingStatus.EXPIRED] as ListingStatus[]).includes(listing.status)
    ) {
      return { queued: false, listing };
    }

    const updatedListing = await updatePropertyListing(
      listing.id,
      {
        status: ListingStatus.PENDING_HASHTI_VERIFICATION,
        publishedAt: null,
      },
      tx
    );
    await createPropertyHistory(
      {
        propertyId,
        action: PropertyHistoryAction.LISTING_CHANGED,
        field: "listing.status",
        oldValue: listing.status,
        newValue: ListingStatus.PENDING_HASHTI_VERIFICATION,
        performedBy,
        reason: listing.status === ListingStatus.EXPIRED
          ? "درخواست تمدید آگهی منقضی‌شده؛ نیازمند تأیید هشتی پیش از انتشار مجدد"
          : "تغییر اطلاعات آگهی؛ نیازمند بررسی مجدد هشتی پیش از انتشار",
      },
      tx
    );
    return { queued: true, listing: updatedListing };
  };

  return transaction ? apply(transaction) : prisma.$transaction(apply);
}

export async function updatePropertyListingStatus(
  propertyId: string,
  data: UpdatePropertyListingStatusInput,
  actor: { id: string; role: string },
) {
  const property = await findPropertyAuthorizationContextById(propertyId);
  if (!property || property.deletedAt) throw new Error("ملک حذف شده و تغییر وضعیت آگهی برای آن مجاز نیست.");
  const listing = await findPropertyListingByPropertyId(propertyId);
  if (!listing) throw new Error("برای این ملک اطلاعات معامله ثبت نشده است.");

  const hashtiOnly = data.status === ListingStatus.PUBLISHED || data.status === ListingStatus.REJECTED;
  const allowedByAuthorization = await authorizePropertyAction(
    actor,
    hashtiOnly ? "APPROVE_PUBLICATION" : "MANAGE",
    property,
  );
  if (!allowedByAuthorization) {
    throw new Error(
      hashtiOnly
        ? "تأیید یا رد انتشار فقط در اختیار هشتی است."
        : "شما اجازه تغییر وضعیت آگهی این ملک را ندارید.",
    );
  }
  if (listing.status === data.status) return { listing, statusChanged: false };
  if (!hashtiOnly && actor.role === "HASHTI" && data.status === ListingStatus.EXPIRED) {
    throw new Error("انقضا از مسیر اختصاصی هشتی یا سامانه انجام می‌شود.");
  }

  const allowedStatuses = allowedTransitions[listing.status];
  if (!allowedStatuses.includes(data.status)) {
    throw new Error(`تغییر وضعیت از ${listing.status} به ${data.status} مجاز نیست.`);
  }

  const approvalPublishedAt = data.status === ListingStatus.PUBLISHED ? new Date() : undefined;
  const updateData: Parameters<typeof updatePropertyListing>[1] = { status: data.status };
  if (approvalPublishedAt) {
    updateData.publishedAt = approvalPublishedAt;
    updateData.expiredAt = null;
    updateData.rejectedAt = null;
  }
  if (data.status === ListingStatus.REJECTED) updateData.rejectedAt = new Date();
  if (data.status !== ListingStatus.PUBLISHED) updateData.publishedAt = null;

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const archiveImmediately = data.status === ListingStatus.SOLD || data.status === ListingStatus.RENTED;
    const mediaToRemove = !archiveImmediately && ([ListingStatus.DRAFT, ListingStatus.PAUSED] as ListingStatus[]).includes(data.status)
      ? await tx.propertyMedia.findMany({ where: { propertyId, isActive: true }, select: { id: true } })
      : [];

    let confirmUntil: Date | undefined;
    if (approvalPublishedAt) {
      confirmUntil = calculateConfirmUntil(approvalPublishedAt);
      updateData.confirmUntil = confirmUntil;
    } else if (([ListingStatus.DRAFT, ListingStatus.PAUSED, ListingStatus.SOLD, ListingStatus.RENTED] as ListingStatus[]).includes(data.status)) {
      updateData.confirmUntil = null;
    }
    const updatedListing = await updatePropertyListing(listing.id, updateData, tx);

    if (mediaToRemove.length) {
      await tx.propertyMedia.deleteMany({ where: { id: { in: mediaToRemove.map((item) => item.id) } } });
    }

    await createPropertyHistory({
      propertyId,
      action: PropertyHistoryAction.LISTING_CHANGED,
      field: "listing.status",
      oldValue: listing.status,
      newValue: data.status,
      performedBy: actor.id,
      reason: "تغییر وضعیت آگهی",
    }, tx);

    const archived = archiveImmediately
      ? await archivePropertyInTransaction(
          tx,
          propertyId,
          data.status === ListingStatus.SOLD
            ? "آرشیو فوری پس از ثبت وضعیت فروخته‌شده"
            : "آرشیو فوری پس از ثبت وضعیت اجاره‌رفته",
        )
      : null;

    return {
      listing: updatedListing,
      statusChanged: true,
      removedMediaIds: [
        ...mediaToRemove.map((item) => item.id),
        ...(archived?.mediaIds ?? []),
      ],
      archived: Boolean(archived),
      ...(confirmUntil ? { confirmUntil } : {}),
    };
  });
  for (const mediaId of result.removedMediaIds) {
    await unlink(mediaFilePath(mediaId)).catch(() => undefined);
  }
  const { removedMediaIds, ...response } = result;
  return { ...response, removedMediaCount: removedMediaIds.length };
}
