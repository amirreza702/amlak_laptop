const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export interface UserNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message || fallback;
  } catch {
    return fallback;
  }
}

export async function getUserNotifications(userId: string): Promise<UserNotification[]> {
  const response = await fetch(
    `${API_URL}/notifications/user/${encodeURIComponent(userId)}`,
    { credentials: "include", cache: "no-store" }
  );
  if (!response.ok) throw new Error(await readError(response, "دریافت اعلان‌ها انجام نشد."));
  return response.json() as Promise<UserNotification[]>;
}

export async function markUserNotificationAsRead(notificationId: string): Promise<UserNotification> {
  const response = await fetch(
    `${API_URL}/notifications/${encodeURIComponent(notificationId)}/read`,
    { method: "PATCH", credentials: "include" }
  );
  if (!response.ok) throw new Error(await readError(response, "به‌روزرسانی اعلان انجام نشد."));
  return response.json() as Promise<UserNotification>;
}
