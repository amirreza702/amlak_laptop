import { ListingStatus, OccupancyStatus, PropertyAgentStatus, PropertyType, TransactionType, VerificationStatus, type Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";

export interface AgentPropertyQuery {
  agentId: string; query?: string; city?: string; district?: string; postalCode?: string; ownerName?: string;
  propertyType?: string; transactionType?: string; listingStatus?: string; isActive?: boolean;
  areaMin?: number; areaMax?: number; roomsMin?: number; roomsMax?: number; limit: number; offset: number;
}

/**
 * فهرست همه املاک سامانه برای پنل مشاور.
 * وضعیت رابطه مشاور با هر ملک جداگانه برگردانده می‌شود؛
 * اطلاعات خصوصی مالک و نشانی/مختصات دقیق برای ملک‌های بدون رابطه افشا نمی‌شود.
 */
export async function findAgentPropertyRecords(input: AgentPropertyQuery) {
  const search = input.query?.trim();
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
  const exactVerificationStatus = enumMatch(Object.values(VerificationStatus));
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
  if (input.postalCode?.trim()) fieldConditions.push({ postalCode: contains(input.postalCode.trim()) });
  if (input.propertyType) fieldConditions.push({ propertyType: input.propertyType as PropertyType });
  if (input.isActive !== undefined) fieldConditions.push({ isActive: input.isActive });
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
  if (input.transactionType) fieldConditions.push({ listing: { is: { transactionType: input.transactionType as TransactionType } } });
  if (input.listingStatus) fieldConditions.push({ listing: { is: { status: input.listingStatus as ListingStatus } } });
  if (input.ownerName?.trim()) {
    const name = input.ownerName.trim();
    fieldConditions.push({ owners: { some: { owner: { is: { OR: [{ firstName: contains(name) }, { lastName: contains(name) }] } } } } });
  }

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
    ...(exactVerificationStatus ? [
      { owners: { some: { verificationStatus: exactVerificationStatus } } },
      { verificationCases: { some: { status: exactVerificationStatus } } },
    ] : []),
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
          select: {
            ownerId: true,
            share: true,
            isPrimary: true,
            verificationStatus: true,
            owner: { select: { firstName: true, lastName: true } },
          },
        },
        verificationCases: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { status: true, createdAt: true, reviewedAt: true },
        },
        agents: {
          where: { agentId: input.agentId },
          select: {
            agentId: true, status: true, approvedByOwner: true, approvedAt: true,
            registeredAt: true, isFirstRegistrant: true,
          },
          take: 1,
        },
      },
    }),
  ]);

  const records = properties.map((property) => {
    const relation = property.agents[0] ?? null;
    const { agents: _agents, ...propertyData } = property;
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
        ...(relation ? {} : {
          createdByUserId: null,
          address: "برای مشاهده نشانی دقیق، ابتدا باید همکاری مالک با مشاور تأیید شود.",
          latitudeExact: property.latitudePublic ?? 0,
          longitudeExact: property.longitudePublic ?? 0,
          owners: [],
        }),
      },
    };
  });

  return { properties: records, total };
}
