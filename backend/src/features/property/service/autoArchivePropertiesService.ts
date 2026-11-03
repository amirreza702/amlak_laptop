import { ListingStatus } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import {
  archivePropertyInTransaction,
  removeArchivedPropertyMediaFiles,
} from "./propertyArchiveService";

const DAYS_365_MS = 365 * 24 * 60 * 60 * 1000;
const protectedStatuses = [
  ListingStatus.PUBLISHED,
  ListingStatus.PENDING_HASHTI_VERIFICATION,
  ListingStatus.SOLD,
  ListingStatus.RENTED,
  ListingStatus.DELETED,
];

export async function archiveEligibleProperties(now = new Date()) {
  const cutoff = new Date(now.getTime() - DAYS_365_MS);
  const candidates = await prisma.property.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      archive: { is: null },
      listing: {
        is: {
          OR: [
            { status: { in: [ListingStatus.SOLD, ListingStatus.RENTED] } },
            {
              status: {
                notIn: [
                  ListingStatus.PUBLISHED,
                  ListingStatus.PENDING_HASHTI_VERIFICATION,
                  ListingStatus.SOLD,
                  ListingStatus.RENTED,
                  ListingStatus.DELETED,
                ],
              },
              expiredAt: { lt: cutoff },
            },
          ],
        },
      },
    },
    select: { id: true },
  });

  let archivedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const candidate of candidates) {
    try {
      const archived = await prisma.$transaction(async (tx) => {
        const current = await tx.property.findUnique({
          where: { id: candidate.id },
          select: {
            isActive: true,
            deletedAt: true,
            archive: { select: { id: true } },
            listing: { select: { status: true, expiredAt: true } },
          },
        });
        if (!current || !current.isActive || current.deletedAt || current.archive || !current.listing) {
          return null;
        }

        const status = current.listing.status;
        const isSoldOrRented = status === ListingStatus.SOLD || status === ListingStatus.RENTED;
        const isOldUnprotectedStatus =
          !protectedStatuses.includes(status) &&
          current.listing.expiredAt !== null &&
          current.listing.expiredAt.getTime() < cutoff.getTime();

        if (!isSoldOrRented && !isOldUnprotectedStatus) return null;

        const reason = isSoldOrRented
          ? status === ListingStatus.SOLD
            ? "آرشیو خودکار فوری پس از ثبت وضعیت فروخته‌شده"
            : "آرشیو خودکار فوری پس از ثبت وضعیت اجاره‌رفته"
          : "آرشیو خودکار: بیش از ۳۶۵ روز از تاریخ انقضای آخرین آگهی گذشته است.";

        return archivePropertyInTransaction(tx, candidate.id, reason);
      });

      if (archived) {
        await removeArchivedPropertyMediaFiles(archived.mediaIds);
        archivedCount++;
      } else {
        skippedCount++;
      }
    } catch (error) {
      failedCount++;
      console.error("[Property Auto Archive] خطا برای ملک:", candidate.id, error);
    }
  }

  return { candidateCount: candidates.length, archivedCount, skippedCount, failedCount, cutoff };
}
