// src/features/auth/hooks/useCurrentAgent.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AUTH_STATE_CHANGE_EVENT,
  getCurrentUser,
  loginUser,
  logoutUser,
  type UserPublic,
} from "../api/authApi";

export function useCurrentAgent() {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // بازیابی نشست جاری از پاسخ { user } بک‌اند
  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setError(null);
    } catch (err: unknown) {
      setUser(null);
      setError(
        err instanceof Error ? err.message : "ابتدا وارد حساب شوید."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUser();

    const handleAuthStateChange = () => {
      void fetchUser();
    };

    window.addEventListener(AUTH_STATE_CHANGE_EVENT, handleAuthStateChange);
    return () => {
      window.removeEventListener(AUTH_STATE_CHANGE_EVENT, handleAuthStateChange);
    };
  }, [fetchUser]);

  // ورود و به‌روزرسانی وضعیت با کاربر واقعی پاسخ بک‌اند
  const handleLogin = async (mobile: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await loginUser(mobile, password);
      setUser(result.user);
      setError(null);
      return result.user;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطا در ورود");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // خروج از نشست
  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logoutUser();
      setUser(null);
      setError("ابتدا وارد حساب شوید.");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    // user قرارداد درست برای همه نقش‌هاست.
    user,
    // نام agent برای سازگاری با مصرف‌کننده‌های قبلی حفظ شده؛
    // مقدار آن می‌تواند هر نقشی باشد و دیگر پروفایل مشاور فرض نمی‌شود.
    agent: user,
    isLoading,
    error,
    login: handleLogin,
    logout: handleLogout,
    refetch: fetchUser,
  };
}
