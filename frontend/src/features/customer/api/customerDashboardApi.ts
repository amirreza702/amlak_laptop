import type {
  CustomerProfileForRequest,
  CustomerRequestPropertyType,
  CustomerRequestTransactionType,
} from "../types/customerSearchRequest";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export interface CustomerSearchRequestRecord {
  id: string;
  transactionType: CustomerRequestTransactionType;
  propertyType: CustomerRequestPropertyType;
  city: string;
  budget: string | number | null;
  description: string | null;
  hashtiVerified: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerFavoriteRecord {
  id: string;
  customerId: string;
  propertyId: string;
  createdAt: string;
}

export interface PublicPropertyRecord {
  id: string;
  propertyType: string;
  city: string;
  district: string;
  area: number | null;
  rooms: number | null;
  yearBuilt: number | null;
  floor: number | null;
  isActive: boolean;
  listing: {
    id: string;
    propertyId: string;
    transactionType: string;
    salePrice: string | number | null;
    depositAmount: string | number | null;
    rentAmount: string | number | null;
    status: string;
    publishedAt: string | null;
  };
  media: Array<{ id: string; type: string; url: string; sortOrder: number }>;
}

export interface CustomerProfileUpdate {
  firstName?: string;
  lastName?: string;
}

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    const message = body.message ?? "";
    if (message === "Authentication required") return "نشست شما منقضی شده است؛ دوباره وارد شوید.";
    if (message === "You do not have permission to access this resource") return "برای این عملیات مجوز ندارید.";
    if (message === "Only active search requests can be updated") return "فقط درخواست فعال قابل ویرایش است.";
    if (message === "Only active search requests can be closed") return "فقط درخواست فعال قابل بستن است.";
    if (message === "Property is already in favorites") return "این ملک از قبل در علاقه‌مندی‌هاست.";
    return message || fallback;
  } catch {
    return fallback;
  }
}

async function parseResponse<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) throw new Error(await readError(response, fallback));
  return response.json() as Promise<T>;
}

export async function getCustomerSearchRequests(customerId: string): Promise<CustomerSearchRequestRecord[]> {
  const response = await fetch(
    `${API_URL}/customers/${encodeURIComponent(customerId)}/search-requests`,
    { credentials: "include", cache: "no-store" }
  );
  return parseResponse<CustomerSearchRequestRecord[]>(response, "دریافت درخواست‌های مشتری انجام نشد.");
}

export async function updateCustomerSearchRequest(
  customerId: string,
  requestId: string,
  input: {
    transactionType?: CustomerRequestTransactionType;
    propertyType?: CustomerRequestPropertyType;
    city?: string;
    budget?: number | null;
    description?: string | null;
  }
): Promise<CustomerSearchRequestRecord> {
  const response = await fetch(
    `${API_URL}/customers/${encodeURIComponent(customerId)}/search-requests/${encodeURIComponent(requestId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    }
  );
  return parseResponse<CustomerSearchRequestRecord>(response, "ویرایش درخواست انجام نشد.");
}

export async function closeCustomerSearchRequest(
  customerId: string,
  requestId: string
): Promise<CustomerSearchRequestRecord> {
  const response = await fetch(
    `${API_URL}/customers/${encodeURIComponent(customerId)}/search-requests/${encodeURIComponent(requestId)}/close`,
    { method: "PUT", credentials: "include" }
  );
  return parseResponse<CustomerSearchRequestRecord>(response, "بستن درخواست انجام نشد.");
}

export async function getCustomerFavorites(customerId: string): Promise<CustomerFavoriteRecord[]> {
  const response = await fetch(
    `${API_URL}/customers/${encodeURIComponent(customerId)}/favorites`,
    { credentials: "include", cache: "no-store" }
  );
  return parseResponse<CustomerFavoriteRecord[]>(response, "دریافت علاقه‌مندی‌ها انجام نشد.");
}

export async function removeCustomerFavorite(customerId: string, propertyId: string): Promise<void> {
  const response = await fetch(
    `${API_URL}/customers/${encodeURIComponent(customerId)}/favorites/${encodeURIComponent(propertyId)}`,
    { method: "DELETE", credentials: "include" }
  );
  await parseResponse<unknown>(response, "حذف علاقه‌مندی انجام نشد.");
}

export async function getPublicProperty(propertyId: string): Promise<PublicPropertyRecord> {
  const response = await fetch(
    `${API_URL}/properties/${encodeURIComponent(propertyId)}/public`,
    { credentials: "include", cache: "no-store" }
  );
  return parseResponse<PublicPropertyRecord>(response, "جزئیات عمومی ملک در دسترس نیست.");
}

export async function updateCustomerProfile(
  customerId: string,
  input: CustomerProfileUpdate
): Promise<{ id: string; firstName: string; lastName: string }> {
  const response = await fetch(
    `${API_URL}/customers/${encodeURIComponent(customerId)}/profile`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    }
  );
  return parseResponse<{ id: string; firstName: string; lastName: string }>(response, "ویرایش پروفایل انجام نشد.");
}
