import type { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";

export interface AgentPropertyQuery {
  agentId: string;
  query?: string;
  limit: number;
  offset: number;
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
  const where: Prisma.PropertyAgentWhereInput = {
    agentId: input.agentId,
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
            propertyType: true,
            city: true,
            district: true,
            area: true,
            rooms: true,
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
