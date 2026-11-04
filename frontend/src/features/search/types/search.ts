export type TransactionType = "خرید" | "رهن کامل" | "اجاره" | "رهن و اجاره";
export type PropertyType = "آپارتمان" | "خانه" | "ویلا" | "زمین" | "مغازه" | "اداری" | "باغ";

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

export interface PropertySearchState {
  transactionType: TransactionType | "";
  propertyType: PropertyType | "";
  city: string;
  district: string;
  minSalePrice: string;
  maxSalePrice: string;
  minDepositAmount: string;
  maxDepositAmount: string;
  minRentAmount: string;
  maxRentAmount: string;
  minArea: string;
  maxArea: string;
  minRooms: string;
  maxRooms: string;
  minYearBuilt: string;
  maxYearBuilt: string;
  minFloor: string;
  maxFloor: string;
  minTotalUnits: string;
  maxTotalUnits: string;
  minParkingCount: string;
  maxParkingCount: string;
  documentType: string;
  ownershipType: string;
  landTenure: string;
  parkingType: string;
  hasElevator: string;
  hasStorage: string;
  hasBalcony: string;
  hasYard: string;
  heatingSystem: string;
  coolingSystem: string;
  renovationStatus: string;
  minRenovationYear: string;
  maxRenovationYear: string;
  occupancyStatus: string;
}