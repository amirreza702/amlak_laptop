const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export interface OwnerProfile {
  id: string;
  firstName: string;
  lastName: string;
  user?: { mobile: string };
}

/** کلاینت API مخصوص قابلیت‌های پنل مالک. */
export async function ownerApiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    cache: "no-store",
    ...init,
  });
  const body = await response.json().catch(() => ({})) as { message?: string };
  if (!response.ok) throw new Error(body.message || "درخواست به سرور ناموفق بود.");
  return body as T;
}
