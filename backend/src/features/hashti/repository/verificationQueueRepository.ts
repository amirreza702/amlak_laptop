import { VerificationStatus, type Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";

export interface VerificationQueueQuery {
  status?: VerificationStatus;
  query?: string;
  limit: number;
  offset: number;
}

export async function findVerificationQueueCases(input: VerificationQueueQuery) {
  const search = input.query?.trim();
  const contains = (value: string) => ({ contains: value, mode: "insensitive" as const });
  const where: Prisma.VerificationCaseWhereInput = {
    ...(input.status ? { status: input.status } : {}),
    ...(search ? {
      OR: [
        { id: contains(search) },
        { propertyId: contains(search) },
        { notes: contains(search) },
        { property: { is: { city: contains(search) } } },
        { property: { is: { district: contains(search) } } },
        { property: { is: { address: contains(search) } } },
      ],
    } : {}),
  };

  const [total, cases] = await Promise.all([
    prisma.verificationCase.count({ where }),
    prisma.verificationCase.findMany({
      where,
      skip: input.offset,
      take: input.limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, propertyId: true, status: true, reviewedBy: true, reviewedAt: true,
        notes: true, createdAt: true, updatedAt: true,
        property: {
          select: {
            id: true, propertyType: true, city: true, district: true, address: true,
            owners: {
              select: {
                ownerId: true, share: true, verificationStatus: true,
                owner: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    }),
  ]);
  return { cases, total };
}
