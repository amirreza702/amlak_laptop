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
  const where: Prisma.PropertyAgentWhereInput = {
    agentId: input.agentId,
    ...(search ? {
      property: {
        is: {
          OR: [
            { id: contains(search) },
            { city: contains(search) },
            { district: contains(search) },
            { address: contains(search) },
            { postalCode: contains(search) },
          ],
        },
      },
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
