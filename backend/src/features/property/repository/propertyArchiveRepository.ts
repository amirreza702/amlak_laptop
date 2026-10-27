import { prisma } from "../../../lib/prisma";

import type {
  PropertyType,
  TransactionType,
} from "@prisma/client";

import type { PropertyArchive } from "../types/propertyArchive";

/**
 * ============================================================
 * Find Property Archive
 * ============================================================
 */

export const findPropertyArchive = async (
  propertyId: string
): Promise<PropertyArchive | null> => {
  return prisma.propertyArchive.findUnique({
    where: { propertyId },
  });
};

/**
 * ============================================================
 * Create Property Archive
 * ============================================================
 */

export const createPropertyArchive = async (
  propertyId: string,
  propertyType: PropertyType,
  city: string,
  district: string,
  transactionType: TransactionType | null,
  archivedReason: string | null
): Promise<PropertyArchive> => {
  return prisma.propertyArchive.create({
    data: {
      propertyId,
      propertyType,
      city,
      district,
      transactionType,
      archivedReason,
    },
  });
};