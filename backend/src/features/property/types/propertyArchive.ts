import type { PropertyType, TransactionType } from "@prisma/client";

export interface PropertyArchive {
  id: string;

  propertyId: string;

  propertyType: PropertyType;

  city: string;

  district: string;

  transactionType: TransactionType | null;

  archivedReason: string | null;

  archivedAt: Date;
}