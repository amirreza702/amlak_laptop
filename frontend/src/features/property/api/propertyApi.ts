import type { PropertyFormData } from "../types/property";

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
  propertyType: "APARTMENT" | "HOUSE" | "VILLA" | "LAND" | "SHOP" | "OFFICE" | "GARDEN";
  city: string;
  district: string;
  address: string;
  postalCode: string | null;
  latitudeExact: number;
  longitudeExact: number;
  area: number | null;
  rooms: number | null;
  floor: number | null;
}

export interface PropertyRegistrationResponse {
  message?: string;
  code?: string;
  property?: { id?: string };
}

export interface PropertyListingPayload {
  transactionType: "SALE" | "FULL_DEPOSIT" | "RENT";
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
