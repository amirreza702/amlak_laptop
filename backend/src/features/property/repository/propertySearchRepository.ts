import { prisma } from "../../../lib/prisma";
import { getPublicCoordinates } from "../../../lib/publicCoordinates";

export type PropertyType = "APARTMENT" | "HOUSE" | "VILLA" | "LAND" | "SHOP" | "OFFICE" | "GARDEN";
export type TransactionType = "SALE" | "FULL_DEPOSIT" | "RENT" | "DEPOSIT_AND_RENT";
export type ListingStatus = "PUBLISHED";

export interface PropertySearchFilters {
  transactionType?: TransactionType; propertyType?: PropertyType; city?: string; district?: string;
  minSalePrice?: number; maxSalePrice?: number;
  minDepositAmount?: number; maxDepositAmount?: number;
  minRentAmount?: number; maxRentAmount?: number;
  minArea?: number; maxArea?: number; minRooms?: number; maxRooms?: number;
  yearFrom?: number; yearTo?: number; minFloor?: number; maxFloor?: number;
  minTotalUnits?: number; maxTotalUnits?: number;
  minParkingCount?: number; maxParkingCount?: number;
  minRenovationYear?: number; maxRenovationYear?: number;
  documentType?: string; ownershipType?: string; landTenure?: string;
  parkingType?: string; heatingSystem?: string; coolingSystem?: string;
  renovationStatus?: string; occupancyStatus?: string;
  hasElevator?: boolean; hasStorage?: boolean; hasBalcony?: boolean; hasYard?: boolean;
}

function addNumberRange(where: Record<string, any>, field: string, min?: number, max?: number) {
  if (min === undefined && max === undefined) return;
  where[field] = {};
  if (min !== undefined) where[field].gte = min;
  if (max !== undefined) where[field].lte = max;
}

function addTextContains(where: Record<string, any>, field: string, value?: string) {
  if (value?.trim()) where[field] = { contains: value.trim(), mode: "insensitive" };
}

export async function searchProperties(filters: PropertySearchFilters) {
  const propertyWhere: Record<string, any> = { isActive: true };
  if (filters.propertyType) propertyWhere.propertyType = filters.propertyType;
  if (filters.city) propertyWhere.city = { contains: filters.city, mode: "insensitive" };
  if (filters.district) propertyWhere.district = { contains: filters.district, mode: "insensitive" };

  addNumberRange(propertyWhere, "area", filters.minArea, filters.maxArea);
  addNumberRange(propertyWhere, "rooms", filters.minRooms, filters.maxRooms);
  addNumberRange(propertyWhere, "yearBuilt", filters.yearFrom, filters.yearTo);
  addNumberRange(propertyWhere, "floor", filters.minFloor, filters.maxFloor);
  addNumberRange(propertyWhere, "totalUnits", filters.minTotalUnits, filters.maxTotalUnits);
  addNumberRange(propertyWhere, "parkingCount", filters.minParkingCount, filters.maxParkingCount);
  addNumberRange(propertyWhere, "renovationYear", filters.minRenovationYear, filters.maxRenovationYear);

  if (filters.documentType) propertyWhere.documentType = filters.documentType;
  if (filters.ownershipType) propertyWhere.ownershipType = filters.ownershipType;
  if (filters.landTenure) propertyWhere.landTenure = filters.landTenure;
  if (filters.renovationStatus) propertyWhere.renovationStatus = filters.renovationStatus;
  if (filters.occupancyStatus) propertyWhere.occupancyStatus = filters.occupancyStatus;

  for (const field of ["hasElevator", "hasStorage", "hasBalcony", "hasYard"] as const) {
    if (filters[field] !== undefined) propertyWhere[field] = filters[field];
  }
  addTextContains(propertyWhere, "parkingType", filters.parkingType);
  addTextContains(propertyWhere, "heatingSystem", filters.heatingSystem);
  addTextContains(propertyWhere, "coolingSystem", filters.coolingSystem);

  const listingWhere: Record<string, any> = { status: "PUBLISHED" satisfies ListingStatus };
  if (filters.transactionType) listingWhere.transactionType = filters.transactionType;
  addNumberRange(listingWhere, "salePrice", filters.minSalePrice, filters.maxSalePrice);
  addNumberRange(listingWhere, "depositAmount", filters.minDepositAmount, filters.maxDepositAmount);
  addNumberRange(listingWhere, "rentAmount", filters.minRentAmount, filters.maxRentAmount);

  const properties = await prisma.property.findMany({
    where: { ...propertyWhere, listing: listingWhere },
    include: {
      listing: true,
      media: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return properties.map((property) => {
    const publicCoordinates =
      property.latitudePublic != null && property.longitudePublic != null
        ? { latitude: property.latitudePublic, longitude: property.longitudePublic }
        : getPublicCoordinates(property.id, property.latitudeExact, property.longitudeExact);

    return {
      id: property.id,
      propertyType: property.propertyType,
      transactionType: property.listing?.transactionType ?? null,
      city: property.city,
      district: property.district,
      area: property.area,
      rooms: property.rooms,
      yearBuilt: property.yearBuilt,
      floor: property.floor,
      latitudePublic: publicCoordinates.latitude,
      longitudePublic: publicCoordinates.longitude,
      salePrice: property.listing?.salePrice ?? null,
      depositAmount: property.listing?.depositAmount ?? null,
      rentAmount: property.listing?.rentAmount ?? null,
      mainImage: (property.media.find((media) => media.type === "MAIN_IMAGE") ?? property.media[0])?.url ?? null,
      updatedAt: property.updatedAt,
    };
  });
}