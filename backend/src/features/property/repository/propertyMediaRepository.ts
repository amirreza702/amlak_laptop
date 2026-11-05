import { prisma } from "../../../lib/prisma";
import type { MediaType, PropertyMedia } from "@prisma/client";

export const createPropertyMedia = async (
  propertyId: string,
  type: MediaType,
  url: string,
  sortOrder = 0,
  id?: string
): Promise<PropertyMedia> =>
  prisma.propertyMedia.create({
    data: { ...(id ? { id } : {}), propertyId, type, url, sortOrder },
  });

export const findPropertyMedia = async (propertyId: string): Promise<PropertyMedia[]> =>
  prisma.propertyMedia.findMany({
    where: { propertyId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

export const findPropertyMediaById = async (id: string) =>
  prisma.propertyMedia.findUnique({
    where: { id },
    select: {
      id: true,
      propertyId: true,
      type: true,
      url: true,
      sortOrder: true,
      isActive: true,
      property: { select: { listing: { select: { status: true, confirmUntil: true } } } },
    },
  });

export const countActivePropertyMedia = (propertyId: string) =>
  prisma.propertyMedia.count({ where: { propertyId, isActive: true } });

export const deactivatePropertyMedia = (id: string, propertyId: string) =>
  prisma.propertyMedia.updateMany({
    where: { id, propertyId, isActive: true },
    data: { isActive: false },
  });

export const updatePropertyMediaOrder = async (propertyId: string, orderedIds: string[]) =>
  prisma.$transaction(
    orderedIds.map((id, sortOrder) =>
      prisma.propertyMedia.updateMany({
        where: { id, propertyId, isActive: true },
        data: { sortOrder },
      })
    )
  );
