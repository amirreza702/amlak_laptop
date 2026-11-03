import { DocumentType, LandTenure, ListingStatus, OccupancyStatus, OwnershipType, PropertyAgentStatus, PropertyType, TransactionType, type Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";

export interface AgentPropertyQuery {
  agentId: string; userId: string; query?: string; city?: string; district?: string; address?: string;
  propertyType?: PropertyType; transactionType?: TransactionType;
  documentType?: DocumentType; ownershipType?: OwnershipType; landTenure?: LandTenure;
  areaMin?: number; areaMax?: number; roomsMin?: number; roomsMax?: number; floor?: number; totalUnits?: number; limit: number; offset: number;
}

/**
 * فهرست همه املاک سامانه برای پنل مشاور.
 * وضعیت رابطه مشاور با هر ملک جداگانه برگردانده می‌شود؛
 * اطلاعات خصوصی مالک و نشانی/مختصات دقیق برای ملک‌های بدون رابطه افشا نمی‌شود.
 */
export async function findAgentPropertyRecords(input: AgentPropertyQuery) {
  const search = input.query?.trim();
  const now = new Date();
  const contains = (value: string) => ({ contains: value, mode: "insensitive" as const });
  const numericSearch = search && Number.isFinite(Number(search)) ? Number(search) : undefined;
  const normalizedSearch = search?.toLocaleLowerCase();
  const boolSearch = normalizedSearch === undefined ? undefined
    : ["true", "yes", "بله", "فعال", "تأییدشده", "اصلی"].includes(normalizedSearch) ? true
    : ["false", "no", "خیر", "غیرفعال", "ردشده"].includes(normalizedSearch) ? false : undefined;
  const parsedDate = search ? new Date(search) : null;
  const validDate = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : undefined;
  const dayStart = validDate ? new Date(validDate.getFullYear(), validDate.getMonth(), validDate.getDate()) : undefined;
  const dayEnd = dayStart ? new Date(dayStart.getTime() + 24 * 60 * 60 * 1000) : undefined;
  const exact = search?.toUpperCase();
  const enumMatch = <T extends string>(values: readonly T[]) =>
    exact && (values as readonly string[]).includes(exact) ? exact as T : undefined;
  const exactPropertyType = enumMatch(Object.values(PropertyType));
  const exactOccupancyStatus = enumMatch(Object.values(OccupancyStatus));
  const exactListingStatus = enumMatch(Object.values(ListingStatus));
  const exactTransactionType = enumMatch(Object.values(TransactionType));
  const exactPropertyAgentStatus = enumMatch(Object.values(PropertyAgentStatus));

  const matchingPrivateNotes = search
    ? await prisma.agentPrivateNote.findMany({
        where: { agentId: input.agentId, entityType: "property", note: contains(search) },
        select: { entityId: true },
      })
    : [];
  const propertyIdsWithMatchingNotes = matchingPrivateNotes.map((item) => item.entityId);

  const fieldConditions: Prisma.PropertyWhereInput[] = [];
  if (input.city?.trim()) fieldConditions.push({ city: contains(input.city.trim()) });
  if (input.district?.trim()) fieldConditions.push({ district: contains(input.district.trim()) });
  if (input.address?.trim()) fieldConditions.push({ address: contains(input.address.trim()) });
  if (input.propertyType) fieldConditions.push({ propertyType: input.propertyType });
  if (input.documentType) fieldConditions.push({ documentType: input.documentType });
  if (input.ownershipType) fieldConditions.push({ ownershipType: input.ownershipType });
  if (input.landTenure) fieldConditions.push({ landTenure: input.landTenure });
  if (input.floor !== undefined) fieldConditions.push({ floor: input.floor });
  if (input.totalUnits !== undefined) fieldConditions.push({ totalUnits: input.totalUnits });
  // املاک غیرفعال‌شده توسط مالک/سامانه در پنل مشاور نمایش داده نمی‌شوند.
  fieldConditions.push({ isActive: true });
  // آگهی منقضی فقط برای مشاوری در فهرست می‌ماند که تأیید نهایی فعال مالک را دارد.
  fieldConditions.push({
    OR: [
      { listing: { is: null } },
      { listing: { is: { status: { notIn: [ListingStatus.PUBLISHED, ListingStatus.EXPIRED] } } } },
      { listing: { is: { status: ListingStatus.PUBLISHED } }, confirmUntil: { gt: now } },
      { agents: { some: { agentId: input.agentId, status: PropertyAgentStatus.ACTIVE, approvedByOwner: true } } },
    ],
  });
  if (input.areaMin !== undefined || input.areaMax !== undefined) {
    fieldConditions.push({ area: {
      ...(input.areaMin !== undefined ? { gte: input.areaMin } : {}),
      ...(input.areaMax !== undefined ? { lte: input.areaMax } : {}),
    } });
  }
  if (input.roomsMin !== undefined || input.roomsMax !== undefined) {
    fieldConditions.push({ rooms: {
      ...(input.roomsMin !== undefined ? { gte: input.roomsMin } : {}),
      ...(input.roomsMax !== undefined ? { lte: input.roomsMax } : {}),
    } });
  }
  if (input.transactionType) fieldConditions.push({ listing: { is: { transactionType: input.transactionType } } });

  const searchConditions: Prisma.PropertyWhereInput[] = search ? [
    { id: contains(search) }, { city: contains(search) }, { district: contains(search) },
    { address: contains(search) }, { postalCode: contains(search) },
    ...(exactPropertyType ? [{ propertyType: exactPropertyType }] : []),
    ...(exactOccupancyStatus ? [{ occupancyStatus: exactOccupancyStatus }] : []),
    ...(numericSearch !== undefined ? [{ area: numericSearch }, { rooms: numericSearch }, { floor: numericSearch }] : []),
    ...(boolSearch !== undefined ? [{ isActive: boolSearch }] : []),
    ...(validDate ? [{ createdAt: { gte: dayStart, lt: dayEnd } }, { confirmUntil: { gte: dayStart, lt: dayEnd } }] : []),
    ...(exactListingStatus ? [{ listing: { is: { status: exactListingStatus } } }] : []),
    ...(exactTransactionType ? [{ listing: { is: { transactionType: exactTransactionType } } }] : []),
    ...(numericSearch !== undefined ? [{ owners: { some: { share: numericSearch } } }] : []),
    ...(boolSearch !== undefined ? [{ owners: { some: { isPrimary: boolSearch } } }] : []),
    { owners: { some: { owner: { is: { firstName: contains(search) } } } } },
    { owners: { some: { owner: { is: { lastName: contains(search) } } } } },
    ...(propertyIdsWithMatchingNotes.length ? [{ id: { in: propertyIdsWithMatchingNotes } }] : []),
    ...(exactPropertyAgentStatus ? [{ agents: { some: { agentId: input.agentId, status: exactPropertyAgentStatus } } }] : []),
    ...(boolSearch !== undefined ? [
      { agents: { some: { agentId: input.agentId, approvedByOwner: boolSearch } } },
      { agents: { some: { agentId: input.agentId, isFirstRegistrant: boolSearch } } },
    ] : []),
    ...(validDate ? [
      { agents: { some: { agentId: input.agentId, registeredAt: { gte: dayStart, lt: dayEnd } } } },
      { agents: { some: { agentId: input.agentId, approvedAt: { gte: dayStart, lt: dayEnd } } } },
    ] : []),
  ] : [];

  const where: Prisma.PropertyWhereInput = {
    ...(fieldConditions.length ? { AND: fieldConditions } : {}),
    ...(search ? { OR: searchConditions } : {}),
  };

  const [total, properties] = await Promise.all([
    prisma.property.count({ where }),
    prisma.property.findMany({
      where,
      skip: input.offset,
      take: input.limit,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      select: {
        id: true,
        createdByUserId: true,
        createdByRole: true,
        creatorMobile: true,
        ownerFirstName: true,
        ownerLastName: true,
        ownerMobile: true,
        createdByUser: {
          select: {
            mobile: true,
            agent: { select: { firstName: true, lastName: true } },
          },
        },
        registrationSource: true,
        propertyType: true,
        city: true,
        district: true,
        address: true,
        latitudeExact: true,
        longitudeExact: true,
        latitudePublic: true,
        longitudePublic: true,
        postalCode: true,
        area: true,
        rooms: true,
        floor: true,
        isActive: true,
        createdAt: true,
        confirmUntil: true,
        listing: {
          select: { status: true, transactionType: true, salePrice: true, depositAmount: true, rentAmount: true, publishedAt: true },
        },
        owners: {
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          select: {
            ownerId: true,
            share: true,
            isPrimary: true,
            owner: { select: { firstName: true, lastName: true, user: { select: { mobile: true } } } },
          },
        },
        agents: {
          where: {
            OR: [
              { agentId: input.agentId },
              { status: "ACTIVE", approvedByOwner: true },
            ],
          },
          select: {
            agentId: true, status: true, approvedByOwner: true, approvedByOwnerId: true, approvedAt: true,
            registeredAt: true, isFirstRegistrant: true,
            agent: { select: { firstName: true, lastName: true, user: { select: { mobile: true } } } },
          },
        },
      },
    }),
  ]);

  const records = properties.map((property) => {
    const relation = property.agents.find((item) => item.agentId === input.agentId) ?? null;
    const isCreator = property.registrationSource === "AGENT" && property.createdByUserId === input.userId;
    const hasUsableRelation = relation?.status === "ACTIVE" && (relation.approvedByOwner || isCreator);
    // Keep the scoped relation rows for the service to derive approved-agent identity;
    // the service removes the relation array before returning the API response.
    const propertyData = property;
    return {
      propertyId: property.id,
      agentId: input.agentId,
      status: relation?.status ?? null,
      approvedByOwner: relation?.approvedByOwner ?? false,
      approvedAt: relation?.approvedAt ?? null,
      registeredAt: relation?.registeredAt ?? null,
      isFirstRegistrant: relation?.isFirstRegistrant ?? false,
      hasAgentRelation: relation !== null,
      property: {
        ...propertyData,
        // برای املاک فاقد رابطه، اطلاعات هویتی و موقعیت دقیق مالک محفوظ می‌ماند.
        ...(hasUsableRelation ? {} : {
          address: "برای مشاهده نشانی دقیق، ابتدا باید همکاری مالک با مشاور تأیید شود.",
          latitudeExact: property.latitudePublic,
          longitudeExact: property.longitudePublic,
          owners: [],
          listing: property.listing ? {
            ...property.listing,
            ...(property.listing.status === "PUBLISHED" ? {} : { salePrice: null, depositAmount: null, rentAmount: null }),
          } : null,
        }),
      },
    };
  });

  return { properties: records, total };
}
