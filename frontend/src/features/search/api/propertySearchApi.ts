import type { PropertySearchResult, PropertySearchState, PropertyType, TransactionType } from "../types/search";

interface PropertySearchResponse { count: number; items: PropertySearchResult[]; }

function mapTransactionType(value: TransactionType | ""): string | undefined {
  switch (value) {
    case "خرید": return "SALE";
    case "رهن کامل": return "FULL_DEPOSIT";
    case "اجاره": return "RENT";
    case "رهن و اجاره": return "DEPOSIT_AND_RENT";
    default: return undefined;
  }
}

function mapPropertyType(value: PropertyType | ""): string | undefined {
  switch (value) {
    case "آپارتمان": return "APARTMENT";
    case "خانه": return "HOUSE";
    case "ویلا": return "VILLA";
    case "زمین": return "LAND";
    case "مغازه": return "SHOP";
    case "اداری": return "OFFICE";
    case "باغ": return "GARDEN";
    default: return undefined;
  }
}

export async function searchProperties(filters: PropertySearchState): Promise<PropertySearchResult[]> {
  const params = new URLSearchParams();
  const setText = (key: string, value: string) => { if (value.trim()) params.set(key, value.trim()); };

  setText("city", filters.city);
  setText("district", filters.district);
  setText("transactionType", mapTransactionType(filters.transactionType) ?? "");
  setText("propertyType", mapPropertyType(filters.propertyType) ?? "");

  const mappings: Array<[keyof PropertySearchState, string]> = [
    ["minSalePrice", "minSalePrice"], ["maxSalePrice", "maxSalePrice"],
    ["minDepositAmount", "minDepositAmount"], ["maxDepositAmount", "maxDepositAmount"],
    ["minRentAmount", "minRentAmount"], ["maxRentAmount", "maxRentAmount"],
    ["minArea", "minArea"], ["maxArea", "maxArea"],
    ["minRooms", "minRooms"], ["maxRooms", "maxRooms"],
    ["minYearBuilt", "yearFrom"], ["maxYearBuilt", "yearTo"],
    ["minFloor", "minFloor"], ["maxFloor", "maxFloor"],
    ["minTotalUnits", "minTotalUnits"], ["maxTotalUnits", "maxTotalUnits"],
    ["minParkingCount", "minParkingCount"], ["maxParkingCount", "maxParkingCount"],
    ["documentType", "documentType"], ["ownershipType", "ownershipType"], ["landTenure", "landTenure"],
    ["parkingType", "parkingType"], ["hasElevator", "hasElevator"], ["hasStorage", "hasStorage"],
    ["hasBalcony", "hasBalcony"], ["hasYard", "hasYard"],
    ["heatingSystem", "heatingSystem"], ["coolingSystem", "coolingSystem"],
    ["renovationStatus", "renovationStatus"],
    ["minRenovationYear", "minRenovationYear"], ["maxRenovationYear", "maxRenovationYear"],
    ["occupancyStatus", "occupancyStatus"],
  ];

  for (const [stateKey, queryKey] of mappings) setText(queryKey, filters[stateKey]);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
  const queryString = params.toString();
  const response = await fetch(apiUrl + "/properties/search" + (queryString ? "?" + queryString : ""), {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) throw new Error("خطا در جستجوی ملک: " + response.status);
  const data = await response.json() as PropertySearchResponse;
  return data.items;
}