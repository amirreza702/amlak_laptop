import type { ListingStatus } from "@prisma/client";
import { findHashtiPropertyRecords } from "../repository/propertyManagementRepository";

export async function getHashtiPropertyRecords(input: {
  status?: ListingStatus;
  query?: string;
  limit: number;
  offset: number;
}) {
  return findHashtiPropertyRecords(input);
}
