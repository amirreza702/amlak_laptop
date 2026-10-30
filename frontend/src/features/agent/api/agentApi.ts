import type { ActiveRequest, AgentProfile } from "../types/agent";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

/** API client مخصوص قابلیت‌های مشاور؛ خطاهای دامنه‌ای به پیام فارسی تبدیل می‌شوند. */
export async function agentApiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { credentials: "include", cache: "no-store", ...init });
  const body = await response.json().catch(() => ({})) as { message?: string };
  if (!response.ok) {
    const msg = body.message || "درخواست به سرور ناموفق بود.";
    if (msg === "You do not have permission to access this resource") throw new Error("برای این عملیات مجوز ندارید.");
    if (msg === "Session is invalid or expired") throw new Error("نشست شما منقضی شده است؛ دوباره وارد شوید.");
    throw new Error(msg);
  }
  return body as T;
}


export interface AgentProfileUpdate {
  firstName: string;
  lastName: string;
  agencyName: string | null;
  address: string | null;
}

/** دریافت پروفایل مشاور از نشست معتبر سرور. */
export function getAgentProfile(): Promise<AgentProfile> {
  return agentApiRequest<AgentProfile>("/agents/me/profile");
}

/** دریافت درخواست‌های فعال مشتریان. */
export function getActiveSearchRequests(): Promise<ActiveRequest[]> {
  return agentApiRequest<ActiveRequest[]>("/agents/me/search-requests");
}

/** ذخیره مشخصات پروفایل مشاور. */
export function updateAgentProfile(agentId: string, data: AgentProfileUpdate): Promise<AgentProfile> {
  return agentApiRequest<AgentProfile>(
    `/agents/${encodeURIComponent(agentId)}/profile`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );
}
