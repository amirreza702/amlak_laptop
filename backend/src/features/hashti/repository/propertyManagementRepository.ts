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
  const where: Prisma.PropertyWhereInput = {
    ...(input.status ? { listing: { is: { status: input.status } } } : {}),
    ...(search ? {
      OR: [
        { id: contains(search) },
        { city: contains(search) },
        { district: contains(search) },
        { address: contains(search) },
        { postalCode: contains(search) },
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
        city: true,
        district: true,
        address: true,
        postalCode: true,
        area: true,
        rooms: true,
        isActive: true,
        createdAt: true,
        confirmUntil: true,
        listing: {
          select: {
            status: true,
            transactionType: true,
            publishedAt: true,
            expiredAt: true,
          },
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
        agents: {
          select: {
            agentId: true,
            status: true,
            approvedByOwner: true,
            approvedAt: true,
            isFirstRegistrant: true,
            agent: { select: { firstName: true, lastName: true } },
          },
        },
        verificationCases: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, status: true, notes: true, createdAt: true, reviewedAt: true },
        },
      },
    }),
  ]);

  return { properties, total };
}
