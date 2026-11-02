import { EvaluationType, type Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";

const propertyEvaluationTypes: EvaluationType[] = [
  EvaluationType.CUSTOMER_TO_PROPERTY,
  EvaluationType.OWNER_TO_PROPERTY,
  EvaluationType.AGENT_TO_PROPERTY,
];

export async function findPropertyMonitoringRecords(input: { limit: number; offset: number }) {
  const where: Prisma.PropertyWhereInput = {
    listing: { is: { publishedAt: { not: null } } },
  };

  const [total, properties] = await Promise.all([
    prisma.property.count({ where }),
    prisma.property.findMany({
      where,
      skip: input.offset,
      take: input.limit,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true, propertyType: true, city: true, district: true, address: true,
        listing: { select: { status: true, transactionType: true, publishedAt: true, expiredAt: true } },
        evaluations: {
          where: { type: { in: propertyEvaluationTypes } },
          orderBy: { createdAt: "desc" },
          take: 100,
          select: { id: true, type: true, score: true, comment: true, createdAt: true },
        },
        favorites: {
          orderBy: { createdAt: "desc" },
          take: 100,
          select: {
            createdAt: true,
            customer: { select: { firstName: true, lastName: true, user: { select: { mobile: true } } } },
          },
        },
      },
    }),
  ]);

  const propertyIds = properties.map((property) => property.id);
  if (propertyIds.length === 0) return { total, properties: [] };

  const [evaluationAggregates, favoriteAggregates] = await Promise.all([
    prisma.evaluation.groupBy({
      by: ["propertyId"],
      where: { propertyId: { in: propertyIds }, type: { in: propertyEvaluationTypes } },
      _avg: { score: true },
      _count: { _all: true },
    }),
    prisma.customerPropertyFavorite.groupBy({
      by: ["propertyId"],
      where: { propertyId: { in: propertyIds } },
      _count: { _all: true },
    }),
  ]);

  const evaluationByProperty = new Map(
    evaluationAggregates.filter((item) => item.propertyId).map((item) => [item.propertyId!, item]),
  );
  const favoritesByProperty = new Map(
    favoriteAggregates.map((item) => [item.propertyId, item._count._all]),
  );

  return {
    total,
    properties: properties.map((property) => {
      const evaluation = evaluationByProperty.get(property.id);
      return {
        ...property,
        favoriteCount: favoritesByProperty.get(property.id) ?? 0,
        evaluationCount: evaluation?._count._all ?? 0,
        averageScore: evaluation?._avg.score ?? null,
      };
    }),
  };
}
