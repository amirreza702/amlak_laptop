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