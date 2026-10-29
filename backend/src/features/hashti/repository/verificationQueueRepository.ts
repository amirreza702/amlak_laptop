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
  const numericSearch = search !== undefined && search.trim() !== "" && Number.isFinite(Number(search)) ? Number(search) : undefined;
  const exact = search?.trim().toUpperCase();
  const parsedDate = search ? new Date(search) : null;
  const dateRange = parsedDate && !Number.isNaN(parsedDate.getTime())
    ? { gte: new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate()), lt: new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate() + 1) }
    : undefined;
  const where: Prisma.VerificationCaseWhereInput = {
    ...(input.status ? { status: input.status } : {}),
    ...(search ? {
      OR: [
        { id: contains(search) }, { propertyId: contains(search) }, { notes: contains(search) },
        { reviewedBy: contains(search) },
        { property: { is: { id: contains(search) } } },
        { property: { is: { city: contains(search) } } },
        { property: { is: { district: contains(search) } } },
        { property: { is: { address: contains(search) } } },
        { property: { is: { postalCode: contains(search) } } },
        { property: { is: { owners: { some: { ownerId: contains(search) } } } },
        { property: { is: { owners: { some: { owner: { is: { firstName: contains(search) } } } } } },
        { property: { is: { owners: { some: { owner: { is: { lastName: contains(search) } } } } } },
        ...(exact ? [
          { status: exact as any },
          { property: { is: { propertyType: exact as any } } },
          { property: { is: { owners: { some: { verificationStatus: exact as any } } } },
        ] : []),
        ...(numericSearch !== undefined ? [
          { property: { is: { area: numericSearch } } },
          { property: { is: { rooms: numericSearch } } },
          { property: { is: { owners: { some: { share: numericSearch } } } },
        ] : []),
        ...(dateRange ? [
          { createdAt: dateRange }, { updatedAt: dateRange }, { reviewedAt: dateRange },
        ] : []),
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
