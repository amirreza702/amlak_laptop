import { prisma } from "../../../lib/prisma";

/**
 * دریافت جزئیات فقط از آگهی‌های عمومی منتشرشده.
 *
 * این Query عمداً مختصات دقیق، نشانی، کد پستی،
 * اطلاعات هویتی مالک و سوابق داخلی را برنمی‌گرداند.
 * روابط لازم فقط برای تعیین مخاطب عمومی آگهی انتخاب می‌شوند.
 */
export async function findPublishedPublicPropertyById(id: string) {
  return prisma.property.findFirst({
    where: {
      id,
      isActive: true,
      deletedAt: null,
      listing: {
        status: "PUBLISHED",
        confirmUntil: { gt: new Date() },
      },
    },
    select: {
      id: true,
      registrationSource: true,
      propertyType: true,
      city: true,
      district: true,
      area: true,
      rooms: true,
      yearBuilt: true,
      floor: true,
      unitNumber: true,
      totalUnits: true,
      parkingCount: true,
      parkingType: true,
      parkingNumber: true,
      hasElevator: true,
      hasStorage: true,
      hasBalcony: true,
      hasYard: true,
      heatingSystem: true,
      coolingSystem: true,
      documentType: true,
      ownershipType: true,
      landTenure: true,
      description: true,
      renovationStatus: true,
      renovationYear: true,
      occupancyStatus: true,
      isActive: true,
      listing: {
        select: {
          transactionType: true,
          salePrice: true,
          depositAmount: true,
          rentAmount: true,
        },
      },
      owners: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        select: {
          ownerId: true,
          addedByRole: true,
          owner: {
            select: {
              firstName: true,
              lastName: true,
              verificationStatus: true,
              user: { select: { mobile: true, isActive: true } },
            },
          },
        },
      },
      agents: {
        // مخاطب عمومی آگهی مشاورمحور فقط مشاور ثبت‌کننده نخست است.
        orderBy: [
          { isFirstRegistrant: "desc" },
          { registeredAt: "asc" },
        ],
        select: {
          status: true,
          isFirstRegistrant: true,
          approvedByOwner: true,
          agent: {
            select: {
              firstName: true,
              lastName: true,
              user: { select: { mobile: true } },
            },
          },
        },
      },
      media: {
        where: {
          isActive: true,
        },
        orderBy: {
          sortOrder: "asc",
        },
        select: {
          type: true,
          url: true,
          sortOrder: true,
        },
      },
    },
  });
}
