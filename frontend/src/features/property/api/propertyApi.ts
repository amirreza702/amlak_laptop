import type { PropertyFormData } from "../types/property";
import type { PropertyType, TransactionType } from "../types/propertyRegistration";

// API هم‌مبدأ؛ از localhost ثابت استفاده نمی‌کنیم.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";


/**
 * ثبت ملک
 *
 * فعلاً agentId را دریافت می‌کنیم.
 *
 * در مرحله Authentication،
 * این شناسه دیگر از Component دریافت نمی‌شود
 * و از Session کاربر به دست می‌آید.
 */
export async function createProperty(
  data: PropertyFormData,
  agentId: string
) {

  const requestData = {
    postalCode: data.postalCode,
    area: Number(data.area),
    rooms: Number(data.rooms),
    floor: Number(data.floor),
    agentId,
  };


  const response = await fetch(
    `${API_URL}/properties`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(requestData),
    }
  );


  if (!response.ok) {

    const error =
      await response.json();

    throw new Error(
      error.message ||
      "ثبت ملک با خطا مواجه شد."
    );
  }


  return response.json();
}

export interface PropertyRegistrationPayload {
  ownerMobile?: string;
  propertyType: PropertyType;
  city: string;
  district: string;
  address: string;
  postalCode: string | null;
  latitudeExact: number;
  longitudeExact: number;
  area: number | null;
  rooms: number | null;
  floor: number | null;
  yearBuilt: number | null;
  unitNumber: string | null;
  totalUnits: number | null;
  parkingCount: number | null;
  parkingType: string | null;
  parkingNumber: string | null;
  hasElevator: boolean | null;
  hasStorage: boolean | null;
  hasBalcony: boolean | null;
  hasYard: boolean | null;
  heatingSystem: string | null;
  coolingSystem: string | null;
  documentType: string | null;
  ownershipType: string | null;
  landTenure: string | null;
  description: string | null;
  renovationStatus: string | null;
  renovationYear: number | null;
  occupancyStatus: string;
}

export interface PropertyRegistrationResponse {
  message?: string;
  code?: string;
  property?: { id?: string };
}

export interface PropertyListingPayload {
  transactionType: TransactionType;
  salePrice: string | null;
  depositAmount: string | null;
  rentAmount: string | null;
}

async function readApiBody<T>(response: Response): Promise<T> {
  return await response.json().catch(() => ({})) as T;
}

/** ایجاد رکورد ملک؛ شناسه مالک/مشاور از نشست سمت سرور تعیین می‌شود. */
export async function createPropertyRecord(
  payload: PropertyRegistrationPayload
): Promise<PropertyRegistrationResponse> {
  const response = await fetch(`${API_URL}/properties`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await readApiBody<PropertyRegistrationResponse>(response);
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("نشست ورود معتبر نیست یا منقضی شده است. فرم حفظ شده؛ دوباره وارد حساب شوید و سپس ثبت را ادامه دهید.");
    }
    if (body.code === "AGENT_NOT_VERIFIED") {
      throw new Error("حساب مشاور هنوز توسط هشتی تأیید نشده است؛ پس از تأیید حساب می‌توانید ملک ثبت کنید.");
    }
    throw new Error(body.message || `ثبت ملک ناموفق بود (خطای ${response.status}). اطلاعات را بررسی و دوباره تلاش کنید.`);
  }
  return body;
}

/** ثبت اطلاعات معامله برای ملک ثبت‌شده؛ در صورت خطا ملک دوباره ساخته نمی‌شود. */
export async function createPropertyListing(
  propertyId: string,
  payload: PropertyListingPayload
): Promise<void> {
  const response = await fetch(`${API_URL}/properties/${encodeURIComponent(propertyId)}/listing`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await readApiBody<{ message?: string; code?: string }>(response);
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("نشست ورود معتبر نیست یا منقضی شده است. بدون بستن فرم، دوباره وارد حساب شوید و سپس ثبت معامله را ادامه دهید.");
    }
    if (body.code === "AGENT_NOT_VERIFIED") {
      throw new Error("حساب مشاور هنوز توسط هشتی تأیید نشده است؛ پس از تأیید حساب می‌توانید اطلاعات معامله را ثبت کنید.");
    }
    throw new Error(body.message || `ثبت اطلاعات معامله ناموفق بود (خطای ${response.status}). می‌توانید دوباره تلاش کنید.`);
  }
}


/** Upload a browser-optimized WebP image; image bytes are never stored in PostgreSQL. */
export async function uploadPropertyMedia(
  propertyId: string,
  imageData: string,
  sortOrder: number,
  type: "MAIN_IMAGE" | "IMAGE" = "IMAGE"
): Promise<{ id: string; url: string }> {
  const response = await fetch(`${API_URL}/properties/${encodeURIComponent(propertyId)}/media`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, imageData, sortOrder }),
  });
  const body = await readApiBody<{ propertyMedia?: { id: string; url: string }; message?: string }>(response);
  if (!response.ok || !body.propertyMedia) throw new Error(body.message || "بارگذاری تصویر ناموفق بود.");
  return body.propertyMedia;
}

export async function getPropertyMedia(propertyId: string): Promise<Array<{ id: string; url: string; type: string; sortOrder: number }>> {
  const response = await fetch(`${API_URL}/properties/${encodeURIComponent(propertyId)}/media`, {
    credentials: "include", cache: "no-store",
  });
  const body = await readApiBody<{ propertyMedia?: Array<{ id: string; url: string; type: string; sortOrder: number }>; message?: string }>(response);
  if (!response.ok) throw new Error(body.message || "دریافت تصاویر ملک ناموفق بود.");
  return body.propertyMedia ?? [];
}

export async function getPropertyMediaPreview(propertyId: string, mediaId: string): Promise<string> {
  const response = await fetch(`${API_URL}/properties/${encodeURIComponent(propertyId)}/media?fileId=${encodeURIComponent(mediaId)}`, {
    credentials: "include", cache: "no-store",
  });
  const body = await readApiBody<{ imageData?: string; message?: string }>(response);
  if (!response.ok || !body.imageData) throw new Error(body.message || "پیش‌نمایش تصویر دریافت نشد.");
  return body.imageData;
}
