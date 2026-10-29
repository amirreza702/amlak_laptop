import type { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";

export interface AgentPropertyQuery {
  agentId: string; query?: string; city?: string; district?: string; postalCode?: string; ownerName?: string;
  propertyType?: string; transactionType?: string; listingStatus?: string; isActive?: boolean;
  areaMin?: number; areaMax?: number; roomsMin?: number; roomsMax?: number; limit: number; offset: number;
}

/** فهرست رکوردهای املاک متصل به مشاور؛ فقط اطلاعات لازم پنل برگردانده می‌شود. */
export async function findAgentPropertyRecords(input: AgentPropertyQuery) {
  const search = input.query?.trim();
  const contains = (value: string) => ({ contains: value, mode: "insensitive" as const });
  const numericSearch = search !== undefined && search.trim() !== "" && Number.isFinite(Number(search)) ? Number(search) : undefined;
  const boolSearch = search === undefined ? undefined : ["true", "yes", "بله", "فعال", "تأییدشده", "اصلی"].includes(search.toLocaleLowerCase()) ? true : ["false", "no", "خیر", "غیرفعال", "ردشده"].includes(search.toLocaleLowerCase()) ? false : undefined;
  const parsedDate = search ? new Date(search) : null;
  const validDate = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : undefined;
  const exact = search?.trim().toUpperCase();
  const fieldConditions: Prisma.PropertyWhereInput[] = [];
  if (input.city?.trim()) fieldConditions.push({ city: contains(input.city.trim()) });
  if (input.district?.trim()) fieldConditions.push({ district: contains(input.district.trim()) });
  if (input.postalCode?.trim()) fieldConditions.push({ postalCode: contains(input.postalCode.trim()) });
  if (input.propertyType) fieldConditions.push({ propertyType: input.propertyType as any });
  if (input.isActive !== undefined) fieldConditions.push({ isActive: input.isActive });
  if (input.areaMin !== undefined || input.areaMax !== undefined) fieldConditions.push({ area: { ...(input.areaMin !== undefined ? { gte: input.areaMin } : {}), ...(input.areaMax !== undefined ? { lte: input.areaMax } : {}) } });
  if (input.roomsMin !== undefined || input.roomsMax !== undefined) fieldConditions.push({ rooms: { ...(input.roomsMin !== undefined ? { gte: input.roomsMin } : {}), ...(input.roomsMax !== undefined ? { lte: input.roomsMax } : {}) } });
  if (input.transactionType) fieldConditions.push({ listing: { is: { transactionType: input.transactionType as any } } });
  if (input.listingStatus) fieldConditions.push({ listing: { is: { status: input.listingStatus as any } } });
  if (input.ownerName?.trim()) fieldConditions.push({ owners: { some: { owner: { is: { OR: [{ firstName: contains(input.ownerName.trim()) }, { lastName: contains(input.ownerName.trim()) }] } } } } });
  const where: Prisma.PropertyAgentWhereInput = {
    agentId: input.agentId,
    ...(fieldConditions.length ? { property: { is: { AND: fieldConditions } } } : {}),
    ...(search ? {
      OR: [
        { property: { is: { OR: [
          { id: contains(search) }, { city: contains(search) }, { district: contains(search) },
          { address: contains(search) }, { postalCode: contains(search) },
          ...(exact ? [{ propertyType: exact as any }, { occupancyStatus: exact as any }] : []),
          ...(numericSearch !== undefined ? [{ area: numericSearch }, { rooms: numericSearch }, { floor: numericSearch }] : []),
          ...(boolSearch !== undefined ? [{ isActive: boolSearch }] : []),
          ...(validDate ? [
            { createdAt: { gte: new Date(validDate.setHours(0,0,0,0)), lt: new Date(validDate.getTime() + 24*60*60*1000) } },
            { confirmUntil: { gte: new Date(validDate.setHours(0,0,0,0)), lt: new Date(validDate.getTime() + 24*60*60*1000) } },
          ] : []),
          ...(exact ? [
            { listing: { is: { status: exact as any } } },
            { listing: { is: { transactionType: exact as any } } },
            { owners: { some: { verificationStatus: exact as any } } },
            { verificationCases: { some: { status: exact as any } } },
          ] : []),
          ...(numericSearch !== undefined ? [{ owners: { some: { share: numericSearch } } }] : []),
          ...(boolSearch !== undefined ? [{ owners: { some: { isPrimary: boolSearch } } }] : []),
          { owners: { some: { owner: { is: { firstName: contains(search) } } } } },
          { owners: { some: { owner: { is: { lastName: contains(search) } } } } },
        ] } } },
        { status: exact as any },
        ...(boolSearch !== undefined ? [{ approvedByOwner: boolSearch }, { isFirstRegistrant: boolSearch }] : []),
        ...(validDate ? [
          { registeredAt: { gte: new Date(validDate.setHours(0,0,0,0)), lt: new Date(validDate.getTime() + 24*60*60*1000) } },
          { approvedAt: { gte: new Date(validDate.setHours(0,0,0,0)), lt: new Date(validDate.getTime() + 24*60*60*1000) } },
        ] : []),
      ],
    } : {}),
  };

  const [total, properties] = await Promise.all([
    prisma.propertyAgent.count({ where }),
    prisma.propertyAgent.findMany({
      where,
      skip: input.offset,
      take: input.limit,
      orderBy: [{ registeredAt: "desc" }, { propertyId: "asc" }],
      select: {
        propertyId: true,
        agentId: true,
        status: true,
        approvedByOwner: true,
        approvedAt: true,
        registeredAt: true,
        isFirstRegistrant: true,
        property: {
          select: {
            id: true,
            createdByUserId: true,
            registrationSource: true,
            propertyType: true,
            city: true,
            district: true,
            address: true,
            postalCode: true,
            area: true,
            rooms: true,
            floor: true,
            isActive: true,
            createdAt: true,
            confirmUntil: true,
            listing: {
              select: { status: true, transactionType: true, publishedAt: true },
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
          },
        },
      },
    }),
  ]);

  return { properties, total };
}
