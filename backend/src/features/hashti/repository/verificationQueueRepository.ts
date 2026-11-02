import { VerificationStatus, type Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";

export interface OwnerVerificationQueueQuery {
  status?: VerificationStatus;
  query?: string;
  limit: number;
  offset: number;
}

/**
 * صف تأیید مالکیت مستقیماً از PropertyOwner خوانده می‌شود.
 * این جریان به پرونده‌ها و مدارک قدیمی ملک وابستگی ندارد.
 */
export async function findOwnerVerificationQueueProperties(input: OwnerVerificationQueueQuery) {
  const search = input.query?.trim();
  const contains = (value: string) => ({ contains: value, mode: "insensitive" as const });
  const numericSearch = search && Number.isFinite(Number(search)) ? Number(search) : undefined;
  const exact = search?.toUpperCase();
  const parsedDate = search ? new Date(search) : null;
  const dateRange = parsedDate && !Number.isNaN(parsedDate.getTime())
    ? {
        gte: new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate()),
        lt: new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate() + 1),
      }
    : undefined;

  const ownerStatusFilter: Prisma.PropertyOwnerWhereInput = input.status
    ? { verificationStatus: input.status }
    : {};

  const where: Prisma.PropertyWhereInput = {
    owners: { some: ownerStatusFilter },
    ...(search ? {
      OR: [
        { id: contains(search) },
        { city: contains(search) },
        { district: contains(search) },
        { address: contains(search) },
        { postalCode: contains(search) },
        { owners: { some: { ownerId: contains(search) } } },
        { owners: { some: { owner: { is: { firstName: contains(search) } } } } },
        { owners: { some: { owner: { is: { lastName: contains(search) } } } } },
        ...(exact && Object.values(VerificationStatus).includes(exact as VerificationStatus)
          ? [{ owners: { some: { verificationStatus: exact as VerificationStatus } } }]
          : []),
        ...(numericSearch !== undefined
          ? [
              { area: numericSearch },
              { rooms: numericSearch },
              { owners: { some: { share: numericSearch } } },
            ]
          : []),
        ...(dateRange
          ? [
              { createdAt: dateRange },
              { confirmUntil: dateRange },
              { owners: { some: { verifiedAt: dateRange } } },
            ]
          : []),
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
        city: true,
        district: true,
        address: true,
        createdAt: true,
        owners: {
          where: ownerStatusFilter,
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          select: {
            ownerId: true,
            share: true,
            isPrimary: true,
            verificationStatus: true,
            verifiedAt: true,
            owner: {
              select: {
                firstName: true,
                lastName: true,
                user: { select: { mobile: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  return { properties, total };
}
