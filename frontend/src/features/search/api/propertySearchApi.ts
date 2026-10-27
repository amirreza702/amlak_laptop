import type {
  PropertySearchResult,
  PropertySearchState,
  PropertyType,
  TransactionType,
} from "../hooks/usePropertySearch";

interface PropertySearchResponse {
  count: number;
  items: PropertySearchResult[];
}

function mapTransactionType(value: TransactionType | ""): string | undefined {
  switch (value) {
    case "خرید": return "SALE";
    case "رهن": return "FULL_DEPOSIT";
    case "اجاره": return "RENT";
    // Backend فعلاً نوع مستقلی برای «رهن و اجاره» ندارد.
    case "رهن و اجاره":
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

/** ساخت پارامترهای جست‌وجو و دریافت نتایج از API واقعی املاک. */
export async function searchProperties(filters: PropertySearchState): Promise<PropertySearchResult[]> {
  const params = new URLSearchParams();
  if (filters.city.trim()) params.set("city", filters.city.trim());
  if (filters.district.trim()) params.set("district", filters.district.trim());

  const transactionType = mapTransactionType(filters.transactionType);
  if (transactionType) params.set("transactionType", transactionType);

  const propertyType = mapPropertyType(filters.propertyType);
  if (propertyType) params.set("propertyType", propertyType);

  if (filters.minPrice.trim()) params.set("minPrice", filters.minPrice.trim());
  if (filters.maxPrice.trim()) params.set("maxPrice", filters.maxPrice.trim());
  if (filters.minArea.trim()) params.set("minArea", filters.minArea.trim());
  if (filters.maxArea.trim()) params.set("maxArea", filters.maxArea.trim());
  if (filters.rooms.trim()) params.set("rooms", filters.rooms.trim());
  if (filters.minYearBuilt.trim()) params.set("yearFrom", filters.minYearBuilt.trim());
  if (filters.maxYearBuilt.trim()) params.set("yearTo", filters.maxYearBuilt.trim());

  const queryString = params.toString();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
  const response = await fetch(`${apiUrl}/properties/search${queryString ? `?${queryString}` : ""}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`خطا در جستجوی ملک: ${response.status}`);
  const data = await response.json() as PropertySearchResponse;
  return data.items;
}
