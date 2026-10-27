const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

/** API client مخصوص قابلیت‌های مشاور؛ خطاهای دامنه‌ای به پیام فارسی تبدیل می‌شوند. */
export async function agentApiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { credentials: "include", cache: "no-store", ...init });
  const body = await response.json().catch(() => ({})) as { message?: string };
  if (!response.ok) {
    const msg = body.message || "درخواست به سرور ناموفق بود.";
    if (msg === "Active subscription not found") throw new Error("برای مشاهدهٔ اطلاعات تماس، اشتراک فعال لازم است.");
    if (msg === "Monthly contact access limit reached") throw new Error("سقف ماهانهٔ مشاهدهٔ اطلاعات تماس مصرف شده است.");
    if (msg === "You do not have permission to access this resource") throw new Error("برای این عملیات مجوز ندارید.");
    if (msg === "Session is invalid or expired") throw new Error("نشست شما منقضی شده است؛ دوباره وارد شوید.");
    throw new Error(msg);
  }
  return body as T;
}
