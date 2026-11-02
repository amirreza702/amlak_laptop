"use client";

import { useCallback, useEffect, useState } from "react";
import { getUserNotifications, markUserNotificationAsRead, type UserNotification } from "@/features/notification/api/notificationApi";

export function useUserNotifications(userId: string) {
  const [items, setItems] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      setItems(await getUserNotifications(userId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "دریافت اعلان‌ها انجام نشد.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
    // به‌روزرسانی پس‌زمینه نباید جدول را از DOM خارج کند؛
    // در غیر این صورت مدال جزئیاتِ بازشده با کلیک روی اعلان بسته می‌شود.
    const refresh = () => { void load(false); };
    window.addEventListener("focus", refresh);
    window.addEventListener("hashti:notifications-updated", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("hashti:notifications-updated", refresh);
    };
  }, [load]);

  const markRead = useCallback(async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      const updated = await markUserNotificationAsRead(id);
      setItems((current) => current.map((item) => item.id === id ? updated : item));
      window.dispatchEvent(new Event("hashti:notifications-updated"));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "ثبت وضعیت اعلان انجام نشد.");
    } finally {
      setBusyId(null);
    }
  }, []);

  return { items, loading, busyId, error, load, markRead };
}
