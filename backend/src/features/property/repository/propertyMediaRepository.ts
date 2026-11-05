import { prisma } from "../../../lib/prisma";
import type { Prisma, MediaType, PropertyMedia } from "@prisma/client";

type Db = typeof prisma | Prisma.TransactionClient;

export const createPropertyMedia = async (
  propertyId: string,
  type: MediaType,
  url: string,
  sortOrder = 0,
  id?: string,
  db: Db = prisma,
): Promise<PropertyMedia> =>
  db.propertyMedia.create({
    data: { ...(id ? { id } : {}), propertyId, type, url, sortOrder },
  });

export const findPropertyMedia = async (propertyId: string, db: Db = prisma): Promise<PropertyMedia[]> =>
  db.propertyMedia.findMany({
    where: { propertyId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

export const findPropertyMediaById = async (id: string, db: Db = prisma) =>
  db.propertyMedia.findUnique({
    where: { id },
    select: {
      id: true,
      propertyId: true,
      type: true,
      url: true,
      sortOrder: true,
      isActive: true,
      property: { select: {
        isActive: true,
        deletedAt: true,
        listing: { select: { status: true, confirmUntil: true } },
      } },
    },
  });

export const countActivePropertyMedia = (propertyId: string, db: Db = prisma) =>
  db.propertyMedia.count({ where: { propertyId, isActive: true } });

export const deactivatePropertyMedia = (id: string, propertyId: string, db: Db = prisma) =>
  db.propertyMedia.updateMany({
    where: { id, propertyId, isActive: true },
    data: { isActive: false },
  });

export const updatePropertyMediaOrder = async (propertyId: string, orderedIds: string[], db: Db = prisma) => {
  for (const [sortOrder, id] of orderedIds.entries()) {
    await db.propertyMedia.updateMany({
      where: { id, propertyId, isActive: true },
      data: { sortOrder },
    });
  }
};
