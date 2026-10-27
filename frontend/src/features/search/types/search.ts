export type TransactionType =
  | "خرید"
  | "رهن"
  | "اجاره"
  | "رهن و اجاره";

export type PropertyType =
  | "آپارتمان"
  | "خانه"
  | "ویلا"
  | "زمین"
  | "مغازه"
  | "اداری"
  | "باغ";

/**
 * ------------------------------------------------------------
 * نتیجه‌ای که Backend برای هر ملک برمی‌گرداند
 * ------------------------------------------------------------
 */
export interface PropertySearchResult {
  id: string;

  propertyType: string;
  transactionType: string | null;

  city: string;
  district: string;

  area: number | null;
  rooms: number | null;
  yearBuilt: number | null;
  floor: number | null;

  latitudePublic: number | null;
  longitudePublic: number | null;

  salePrice: string | null;
  depositAmount: string | null;
  rentAmount: string | null;

  mainImage: string | null;
  updatedAt: string;
}

/**
 * ------------------------------------------------------------
 * پاسخ کامل API جستجو
 * ------------------------------------------------------------
 */
interface PropertySearchResponse {
  count: number;
  items: PropertySearchResult[];
}

export interface PropertySearchState {
  transactionType: TransactionType | "";
  propertyType: PropertyType | "";
  city: string;
  district: string;

  minPrice: string;
  maxPrice: string;

  minArea: string;
  maxArea: string;

  rooms: string;
  bathrooms: string;

  minYearBuilt: string;
  maxYearBuilt: string;

  minFloor: string;
  maxFloor: string;

  hasParking: boolean;
  hasElevator: boolean;
  hasStorage: boolean;
  hasBalcony: boolean;
  hasYard: boolean;
  hasPool: boolean;

  singlePageDeed: boolean;
  documentsVerified: boolean;
  transactionAllowed: boolean;
  ownerVerified: boolean;
  propertyInfoVerified: boolean;
  locationVerified: boolean;

  updatedWithinDays: string;
  onlyActive: boolean;
}
