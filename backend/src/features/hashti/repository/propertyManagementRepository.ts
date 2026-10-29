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
    ...(search ? {
      OR: [
        { id: contains(search) }, { city: contains(search) }, { district: contains(search) },
        { address: contains(search) }, { postalCode: contains(search) },
        { owners: { some: { owner: { is: { firstName: contains(search) } } } } },
        { owners: { some: { owner: { is: { lastName: contains(search) } } } } },
        { agents: { some: { agent: { is: { firstName: contains(search) } } } } },
        { agents: { some: { agent: { is: { lastName: contains(search) } } } } },
        { verificationCases: { some: { notes: contains(search) } } },
        ...(exact ? [
          { propertyType: exact as any }, { registrationSource: exact as any },
          { listing: { is: { status: exact as any } } },
          { listing: { is: { transactionType: exact as any } } },
          { owners: { some: { verificationStatus: exact as any } } },
          { agents: { some: { status: exact as any } } },
          { verificationCases: { some: { status: exact as any } } },
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
          { createdAt: dateRange }, { confirmUntil: dateRange },
          { listing: { is: { publishedAt: dateRange } } },
          { listing: { is: { expiredAt: dateRange } } },
          { owners: { some: { verifiedAt: dateRange } } },
          { agents: { some: { approvedAt: dateRange } } },
          { verificationCases: { some: { createdAt: dateRange } } },
          { verificationCases: { some: { reviewedAt: dateRange } } },
        ] : []),
        { owners: { some: { ownerId: contains(search) } } },
        { agents: { some: { agentId: contains(search) } } },
        { verificationCases: { some: { id: contains(search) } } },
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
