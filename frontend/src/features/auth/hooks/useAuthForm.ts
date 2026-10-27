"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { loginUser, logoutUser } from "../api/authApi";
import type { AuthRole } from "../types";

interface UseAuthFormOptions {
  isOpen: boolean;
  role: AuthRole;
  onClose: () => void;
  onSuccess?: () => void;
}

export function useAuthForm({
  isOpen,
  role,
  onClose,
  onSuccess,
}: UseAuthFormOptions) {
  const [mounted, setMounted] = useState(false);
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isAgent = role === "agent";
  const expectedRole = isAgent ? "AGENT" : "OWNER";
  const roleLabel = isAgent ? "مشاور املاک" : "مالک";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setErrorMessage(null);
      setMobile("");
      setPassword("");
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, role]);

  const handleMobileChange = useCallback((value: string) => {
    setMobile(value);
  }, []);

  const handlePasswordChange = useCallback((value: string) => {
    setPassword(value);
  }, []);

  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!mobile.trim() || !password.trim()) {
      setErrorMessage("لطفاً شماره همراه و رمز عبور را وارد کنید.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await loginUser(mobile.trim(), password);

      if (result.user.role !== expectedRole) {
        try {
          await logoutUser();
        } catch {
          // خطای خروج نباید پیام اصلی عدم تطابق نقش را بپوشاند.
        }

        throw new Error(`این حساب کاربری، حساب ${roleLabel} نیست.`);
      }

      onSuccess?.();
      onClose();
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "خطا در برقراری ارتباط با سرور"
      );
    } finally {
      setIsLoading(false);
    }
  }, [expectedRole, mobile, onClose, onSuccess, password, roleLabel]);

  return {
    mounted,
    mobile,
    password,
    isLoading,
    errorMessage,
    isAgent,
    roleLabel,
    handleMobileChange,
    handlePasswordChange,
    handleSubmit,
  };
}
