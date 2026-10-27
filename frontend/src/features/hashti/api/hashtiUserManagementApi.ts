import type { HashtiAuditLog, HashtiManagedUser } from "../types/hashtiUserManagement";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

/** درخواست JSON مشترک برای عملیات مدیریت کاربران در پنل هشتی. */
export async function hashtiManagementRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    cache: "no-store",
    ...init,
  });
  const body = await response.json().catch(() => ({})) as { message?: string };
  if (!response.ok) {
    const message = body.message || "Request failed.";
    if (message === "Authentication required") {
      throw new Error("برای استفاده از پنل دوباره وارد شوید.");
    }
    if (message === "Super-admin permission required") {
      throw new Error("این بخش فقط در اختیار مدیر ارشد هشتی است.");
    }
    throw new Error(message);
  }
  return body as T;
}

export interface HashtiManagedUsersResponse {
  users: HashtiManagedUser[];
  pagination: { total: number; limit: number; offset: number };
}

export interface HashtiManagementAccessResponse {
  isSuperAdmin: boolean;
}

export interface HashtiAuditLogsResponse {
  logs: HashtiAuditLog[];
}
