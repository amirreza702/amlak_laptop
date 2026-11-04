export type PropertyType = "APARTMENT" | "HOUSE" | "VILLA" | "LAND" | "SHOP" | "OFFICE" | "GARDEN";
export type TransactionType = "SALE" | "FULL_DEPOSIT" | "RENT" | "DEPOSIT_AND_RENT";

export interface Coordinates {
  latitude: number;
  longitude: number;
}
