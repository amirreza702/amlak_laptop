import { prisma } from "../../../lib/prisma";

/**
 * دریافت جزئیات فقط از آگهی‌های عمومی منتشرشده.
 *
 * این Query عمداً مختصات دقیق، نشانی، کد پستی،
 * اطلاعات مالک/مشاور و سوابق داخلی را برنمی‌گرداند.
 */
export async function findPublishedPublicPropertyById(id: string) {
  const now = new Date();

  return prisma.property.findFirst({
    where: {
      id,
      confirmUntil: {
        gte: now,
      },
      listing: {
        status: "PUBLISHED",
      },
    },
    select: {
      id: true,
      propertyType: true,
      city: true,
      district: true,
      area: true,
      rooms: true,
      yearBuilt: true,
      floor: true,
      latitudePublic: true,
      longitudePublic: true,
      isActive: true,
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
        where: { verificationStatus: "VERIFIED" },
        orderBy: { isPrimary: "desc" },
        take: 1,
        select: { owner: { select: { firstName: true, lastName: true, user: { select: { mobile: true } } } } },
      },
      agents: {
        where: { status: "ACTIVE", approvedByOwner: true },
        take: 1,
        select: { agent: { select: { firstName: true, lastName: true, user: { select: { mobile: true } } } } },
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
