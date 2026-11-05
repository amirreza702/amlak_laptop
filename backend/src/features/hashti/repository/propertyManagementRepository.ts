import { ListingStatus, type Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";

export interface HashtiPropertyQuery {
  status?: ListingStatus;
  query?: string;
  limit: number;
  offset: number;
}

/** تمام رکوردهای ملک برای پنل هشتی، بدون تغییر در چرخه عمر یا سرویس‌های موجود. */
export async function findHashtiPropertyRecords(input: HashtiPropertyQuery) {
  const search = input.query?.trim();
  const contains = (value: string) => ({ contains: value, mode: "insensitive" as const });
  const numericSearch = search !== undefined && search.trim() !== "" && Number.isFinite(Number(search)) ? Number(search) : undefined;
  const lower = search?.toLocaleLowerCase();
  const boolSearch = lower === undefined ? undefined : ["true", "yes", "بله", "فعال", "تأییدشده", "اصلی"].includes(lower) ? true : ["false", "no", "خیر", "غیرفعال", "ردشده"].includes(lower) ? false : undefined;
  const exact = search?.trim().toUpperCase();
  const parsedDate = search ? new Date(search) : null;
  const validDate = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : undefined;
  const dateRange = validDate ? { gte: new Date(validDate.getFullYear(), validDate.getMonth(), validDate.getDate()), lt: new Date(validDate.getFullYear(), validDate.getMonth(), validDate.getDate() + 1) } : undefined;
  const where: Prisma.PropertyWhereInput = {
    ...(input.status ? { listing: { is: { status: input.status } } } : {}),
    ...(input.status === ListingStatus.PENDING_HASHTI_VERIFICATION ? { duplicateReviewsAsPrimary: { none: {} } } : {}),
    ...(search ? {
      OR: [
        { id: contains(search) }, { city: contains(search) }, { district: contains(search) },
        { address: contains(search) }, { postalCode: contains(search) },
        { owners: { some: { owner: { is: { firstName: contains(search) } } } } },
        { owners: { some: { owner: { is: { lastName: contains(search) } } } } },
        { agents: { some: { agent: { is: { firstName: contains(search) } } } } },
        { agents: { some: { agent: { is: { lastName: contains(search) } } } } },
        ...(exact ? [
          { propertyType: exact as any }, { registrationSource: exact as any },
          { listing: { is: { status: exact as any } } },
          { listing: { is: { transactionType: exact as any } } },
          { agents: { some: { status: exact as any } } },
        ] : []),
        ...(numericSearch !== undefined ? [
          { area: numericSearch }, { rooms: numericSearch },
          { owners: { some: { share: numericSearch } } },
        ] : []),
        ...(boolSearch !== undefined ? [
          { isActive: boolSearch },
          { owners: { some: { isPrimary: boolSearch } } },
          { agents: { some: { approvedByOwner: boolSearch } } },
          { agents: { some: { isFirstRegistrant: boolSearch } } },
        ] : []),
        ...(dateRange ? [
          { createdAt: dateRange }, { listing: { is: { confirmUntil: dateRange } } },
          { listing: { is: { publishedAt: dateRange } } },
          { listing: { is: { expiredAt: dateRange } } },
          { agents: { some: { approvedAt: dateRange } } },
        ] : []),
        { owners: { some: { ownerId: contains(search) } } },
        { agents: { some: { agentId: contains(search) } } },
      ],
    } : {}),
  };

  const [total, properties] = await Promise.all([
    prisma.property.count({ where }),
    prisma.property.findMany({
      where,
      skip: input.offset,
      take: input.limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        propertyType: true,
        registrationSource: true,
        createdByUserId: true,
        deletedAt: true,
        creatorMobile: true,
        ownerFirstName: true,
        ownerLastName: true,
        ownerMobile: true,
        city: true,
        district: true,
        address: true,
        postalCode: true,
        latitudeExact: true,
        longitudeExact: true,
        area: true,
        rooms: true,
        floor: true,
        yearBuilt: true,
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
        createdAt: true,
        _count: { select: { duplicateReviewsAsPrimary: true } },
        listing: {
          select: {
            status: true,
            transactionType: true,
            salePrice: true,
            depositAmount: true,
            rentAmount: true,
            publishedAt: true,
            expiredAt: true,
            confirmUntil: true,
            latitudePublic: true,
            longitudePublic: true,
          },
        },
        owners: {
          select: {
            ownerId: true,
            share: true,
            isPrimary: true,
            owner: { select: { userId: true, firstName: true, lastName: true, user: { select: { mobile: true } } } },
          },
        },
        agents: {
          select: {
            agentId: true,
            status: true,
            approvedByOwner: true,
            approvedAt: true,
            isFirstRegistrant: true,
            agent: { select: { userId: true, firstName: true, lastName: true, user: { select: { mobile: true } } } },
          },
        },
        media: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: { id: true, type: true, url: true, sortOrder: true },
        },
      },
    }),
  ]);

  return { properties, total };
}
