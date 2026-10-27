// src/features/auth/api/authApi.ts

// API هم‌مبدأ؛ Nginx در Docker مسیر /api را به Backend هدایت می‌کند.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

// رویداد مشترک برای به‌روزرسانی وضعیت ورود در اجزای سراسری.
export const AUTH_STATE_CHANGE_EVENT = "hashti:auth-state-changed";

function notifyAuthStateChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_STATE_CHANGE_EVENT));
  }
}

/**
 * قرارداد عمومی کاربر مطابق پاسخ‌های فعلی بک‌اند.
 * پاسخ /auth/me فقط id، mobile و role را برمی‌گرداند؛
 * پاسخ ورود علاوه بر آن isActive را نیز دارد.
 */
export type UserRole = "CUSTOMER" | "OWNER" | "AGENT" | "HASHTI";

export interface UserPublic {
  id: string;
  mobile: string;
  role: UserRole;
  isActive?: boolean;
}

/** نام قدیمی برای جلوگیری از شکستن importهای موجود. */
export type AgentPublic = UserPublic;

export interface AuthResponse {
  message: string;
  user: UserPublic;
}

export interface RegisterUserInput {
  mobile: string;
  password: string;
  role: Exclude<UserRole, "HASHTI">;
  firstName: string;
  lastName: string;
}

/** پاسخ ثبت‌نام فعلی Backend؛ profileId شناسهٔ پروفایل نقش‌محور است. */
export interface RegisterUserResponse {
  message: string;
  user: UserPublic & {
    profileId: string;
    createdAt?: string;
  };
}

interface CurrentUserResponse {
  user: UserPublic;
}

interface ApiErrorResponse {
  message?: string;
}

async function readJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

async function getErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const data = await readJson<ApiErrorResponse>(response);
    return data.message || fallback;
  } catch {
    return fallback;
  }
}

// ثبت‌نام؛ طبق قرارداد Backend ایجاد Session را انجام نمی‌دهد.
export async function registerUser(
  input: RegisterUserInput
): Promise<RegisterUserResponse> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "ثبت‌نام انجام نشد. اطلاعات را بررسی کنید.")
    );
  }

  return readJson<RegisterUserResponse>(response);
}

// ورود با نشست و کوکی HttpOnly؛ مسیر دقیق مطابق authRoutes بک‌اند است.
export async function loginUser(
  mobile: string,
  password: string,
  expectedRole?: UserRole
): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ mobile, password, ...(expectedRole ? { expectedRole } : {}) }),
  });

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "ورود ناموفق بود. لطفاً اطلاعات را بررسی کنید."
      )
    );
  }

  const result = await readJson<AuthResponse>(response);
  notifyAuthStateChanged();
  return result;
}

// بررسی نشست فعلی؛ API بک‌اند پاسخ را داخل فیلد user قرار می‌دهد.
export async function getCurrentUser(): Promise<UserPublic> {
  const response = await fetch(`${API_URL}/auth/me`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "ابتدا وارد حساب کاربری خود شوید.")
    );
  }

  const data = await readJson<CurrentUserResponse>(response);
  return data.user;
}

// خروج از نشست فعلی.
export async function logoutUser(): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "خطا در خروج از حساب کاربری.")
    );
  }

  const result = await readJson<{ message: string }>(response);
  notifyAuthStateChanged();
  return result;
}

/**
 * نام‌های قدیمی حفظ شده‌اند تا مصرف‌کننده‌های فعلی بدون تغییر نام
 * توابع همچنان کار کنند؛ نوع خروجی اکنون UserPublic است، نه پروفایل فرضی مشاور.
 */
export const loginAgent = loginUser;
export const getCurrentAgent = getCurrentUser;
export const logoutAgent = logoutUser;


/** اطلاعات امن کاربر برای فهرست مدیریت هشتی */
export interface AdminUser {
  id: string;
  mobile: string;
  role: UserRole;
  isActive: boolean;
  isSuperAdmin?: boolean;
  adminPermissions?: string[];
  createdAt: string;
  updatedAt: string;
  customer: { id: string; firstName: string; lastName: string } | null;
  owner: { id: string; firstName: string; lastName: string } | null;
  agent: {
    id: string;
    firstName: string;
    lastName: string;
    agencyName: string | null;
    isVerified: boolean;
  } | null;
}

export interface AdminUsersResponse {
  items: AdminUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** دریافت فهرست مدیریتی؛ مجوز HASHTI در بک‌اند کنترل می‌شود. */
export async function getAdminUsers(filters: {
  search?: string;
  role?: UserRole | "";
  isActive?: "true" | "false" | "";
  page?: number;
  limit?: number;
} = {}): Promise<AdminUsersResponse> {
  const params = new URLSearchParams();
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.role) params.set("role", filters.role);
  if (filters.isActive) params.set("isActive", filters.isActive);
  params.set("page", String(filters.page ?? 1));
  params.set("limit", String(filters.limit ?? 20));

  const response = await fetch(`${API_URL}/auth/admin/users?${params.toString()}`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "دریافت فهرست کاربران ناموفق بود."));
  }

  return readJson<AdminUsersResponse>(response);
}
