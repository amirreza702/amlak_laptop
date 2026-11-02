import { prisma } from "../../../lib/prisma";

/**
 * دریافت جزئیات فقط از آگهی‌های عمومی منتشرشده.
 *
 * این Query عمداً مختصات دقیق، نشانی، کد پستی،
 * اطلاعات مدیریتی و سوابق داخلی را برنمی‌گرداند.
 * روابط تماس فقط برای ساخت contact عمومی در Service انتخاب می‌شوند.
 */
export async function findPublishedPublicPropertyById(id: string) {
  return prisma.property.findFirst({
    where: {
      id,
      isActive: true,
      listing: {
        status: { in: ["PUBLISHED", "EXPIRED"] },
      },
    },
    select: {
      id: true,
      registrationSource: true,
      createdByUserId: true,
      ownerFirstName: true,
      ownerLastName: true,
      ownerMobile: true,
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
      latitudePublic: true,
      longitudePublic: true,
      isActive: true,
      confirmUntil: true,
      listing: {
        select: {
          id: true,
          propertyId: true,
          transactionType: true,
          salePrice: true,
          depositAmount: true,
          rentAmount: true,
          status: true,
          publishedAt: true,
        },
      },
      owners: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        select: {
          ownerId: true,
          verificationStatus: true,
          owner: {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              user: { select: { mobile: true } },
            },
          },
        },
      },
      ownerAgentRequests: {
        where: { status: "ACTIVE" },
        select: {
          ownerId: true,
          responses: {
            where: { status: "ACCEPTED" },
            select: { agentId: true },
          },
        },
      },
      agents: {
        // رابطه ثبت‌کننده نخست حتی در صورت لغو ارتباط خوانده می‌شود؛
        // در سرویس هرگز به مشاور دیگری به‌عنوان جایگزین او fallback نمی‌کنیم.
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
              id: true,
              userId: true,
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
          id: true,
          type: true,
          url: true,
          sortOrder: true,
        },
      },
    },
  });
}
