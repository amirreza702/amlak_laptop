import type {
  CreateCustomerSearchRequestInput,
  CustomerProfileForRequest,
  CustomerSearchRequestResult,
} from "../types/customerSearchRequest";

// در خروجی استاتیک، Nginx مسیر هم‌مبدأ /api را به Backend هدایت می‌کند.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

interface ApiErrorResponse {
  message?: string;
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const result = (await response.json()) as ApiErrorResponse;
    const message = result.message || "";

    if (message === "Authentication required") {
      return "برای ادامه وارد حساب مشتری شوید.";
    }
    if (message === "You do not have permission to access this resource") {
      return "این قابلیت فقط برای حساب مشتری در دسترس است.";
    }
    if (message === "Customer not found" || message === "Customer profile not found") {
      return "پروفایل مشتری این حساب پیدا نشد.";
    }
    if (message === "City is required") {
      return "شهر موردنظر را وارد کنید.";
    }
    if (message === "Budget cannot be negative" || message === "Budget must be a non-negative number") {
      return "بودجه باید عددی معتبر و صفر یا بیشتر باشد.";
    }

    return message || "ارتباط با سرور با خطا مواجه شد.";
  } catch {
    return "ارتباط با سرور با خطا مواجه شد.";
  }
}

/**
 * دریافت شناسه پروفایل مشتری متناظر با نشست فعلی.
 * Backend کاربر را از Session تشخیص می‌دهد؛ Client شناسه User را حدس نمی‌زند.
 */
export async function getCurrentCustomerProfile(): Promise<CustomerProfileForRequest> {
  const response = await fetch(`${API_URL}/customers/me/profile`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return (await response.json()) as CustomerProfileForRequest;
}

/**
 * ثبت درخواست با endpoint موجود Backend.
 * شناسه از endpoint امن پروفایل خود مشتری به دست آمده است و Backend نیز مالکیت آن را کنترل می‌کند.
 */
export async function createCustomerSearchRequest(
  customerId: string,
  data: CreateCustomerSearchRequestInput
): Promise<CustomerSearchRequestResult> {
  const response = await fetch(
    `${API_URL}/customers/${encodeURIComponent(customerId)}/search-requests`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return (await response.json()) as CustomerSearchRequestResult;
}
