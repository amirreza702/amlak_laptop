import {
  DocumentType, LandTenure, OccupancyStatus, OwnershipType,
  PropertyType, RenovationStatus, TransactionType,
} from "@prisma/client";
import { searchProperties, type PropertySearchFilters } from "../repository/propertySearchRepository";

export interface SearchPropertiesInput {
  transactionType?: string; propertyType?: string; city?: string; district?: string;
  minSalePrice?: string; maxSalePrice?: string;
  minDepositAmount?: string; maxDepositAmount?: string;
  minRentAmount?: string; maxRentAmount?: string;
  minArea?: string; maxArea?: string; minRooms?: string; maxRooms?: string;
  yearFrom?: string; yearTo?: string; minFloor?: string; maxFloor?: string;
  minTotalUnits?: string; maxTotalUnits?: string;
  minParkingCount?: string; maxParkingCount?: string;
  documentType?: string; ownershipType?: string; landTenure?: string;
  parkingType?: string; hasElevator?: string; hasStorage?: string; hasBalcony?: string; hasYard?: string;
  heatingSystem?: string; coolingSystem?: string; renovationStatus?: string;
  minRenovationYear?: string; maxRenovationYear?: string; occupancyStatus?: string;
}

function toNumber(value?: string): number | undefined {
  if (value === undefined || value === "") return undefined;
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error("مقدار عددی نامعتبر است: " + value);
  return number;
}

function toBoolean(value?: string): boolean | undefined {
  if (value === undefined || value === "") return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error("مقدار فیلتر امکانات نامعتبر است.");
}

function validateEnum<T extends string>(value: string | undefined, values: readonly T[], label: string): T | undefined {
  if (!value) return undefined;
  if (!values.includes(value as T)) throw new Error(label + " نامعتبر است.");
  return value as T;
}

export async function searchPropertyService(input: SearchPropertiesInput) {
  const filters: PropertySearchFilters = {
    city: input.city?.trim() || undefined, district: input.district?.trim() || undefined,
    minSalePrice: toNumber(input.minSalePrice), maxSalePrice: toNumber(input.maxSalePrice),
    minDepositAmount: toNumber(input.minDepositAmount), maxDepositAmount: toNumber(input.maxDepositAmount),
    minRentAmount: toNumber(input.minRentAmount), maxRentAmount: toNumber(input.maxRentAmount),
    minArea: toNumber(input.minArea), maxArea: toNumber(input.maxArea),
    minRooms: toNumber(input.minRooms), maxRooms: toNumber(input.maxRooms),
    yearFrom: toNumber(input.yearFrom), yearTo: toNumber(input.yearTo),
    minFloor: toNumber(input.minFloor), maxFloor: toNumber(input.maxFloor),
    minTotalUnits: toNumber(input.minTotalUnits), maxTotalUnits: toNumber(input.maxTotalUnits),
    minParkingCount: toNumber(input.minParkingCount), maxParkingCount: toNumber(input.maxParkingCount),
    minRenovationYear: toNumber(input.minRenovationYear), maxRenovationYear: toNumber(input.maxRenovationYear),
    parkingType: input.parkingType?.trim() || undefined,
    heatingSystem: input.heatingSystem?.trim() || undefined,
    coolingSystem: input.coolingSystem?.trim() || undefined,
    hasElevator: toBoolean(input.hasElevator), hasStorage: toBoolean(input.hasStorage),
    hasBalcony: toBoolean(input.hasBalcony), hasYard: toBoolean(input.hasYard),
    transactionType: validateEnum(input.transactionType, Object.values(TransactionType), "نوع معامله"),
    propertyType: validateEnum(input.propertyType, Object.values(PropertyType), "نوع ملک"),
    documentType: validateEnum(input.documentType, Object.values(DocumentType), "نوع سند"),
    ownershipType: validateEnum(input.ownershipType, Object.values(OwnershipType), "نوع مالکیت"),
    landTenure: validateEnum(input.landTenure, Object.values(LandTenure), "وضعیت عرصه"),
    renovationStatus: validateEnum(input.renovationStatus, Object.values(RenovationStatus), "وضعیت بازسازی"),
    occupancyStatus: validateEnum(input.occupancyStatus, Object.values(OccupancyStatus), "وضعیت سکونت"),
  };
  return searchProperties(filters);
}