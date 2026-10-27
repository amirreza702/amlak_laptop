export type PropertyType = "APARTMENT" | "HOUSE" | "VILLA" | "LAND" | "SHOP" | "OFFICE" | "GARDEN";
export type TransactionType = "SALE" | "FULL_DEPOSIT" | "RENT";

export interface Coordinates {
  latitude: number;
  longitude: number;
}
