"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  AUTH_STATE_CHANGE_EVENT,
  getCurrentUser,
  loginUser,
  registerUser,
  type UserPublic,
  type UserRole,
} from "../api/authApi";

export type AccountPortalRole = "OWNER" | "AGENT" | "HASHTI";
export type AuthMode = "login" | "register";

function translateError(message: string): string {
  if (message.includes("already registered")) {
    return "این شماره موبایل قبلاً ثبت شده است؛ حالت ورود را انتخاب کنید.";
  }
  if (message.includes("Invalid Iranian mobile number")) {
    return "شماره موبایل باید با 09 شروع شود و ۱۱ رقم داشته باشد.";
  }
  if (message.includes("at least 8 characters")) {
    return "رمز عبور باید حداقل ۸ کاراکتر داشته باشد.";
  }
  if (message.includes("incorrect")) {
    return "شماره موبایل یا رمز عبور صحیح نیست.";
  }
  if (message.includes("selected role") || message.includes("ROLE_MISMATCH")) {
    return "این حساب با نوع حساب انتخاب‌شده مطابقت ندارد. اطلاعات ورود را بررسی کنید.";
  }
  if (message.includes("inactive")) {
    return "این حساب کاربری غیرفعال است.";
  }
  return "عملیات انجام نشد. لطفاً اطلاعات را بررسی کنید و دوباره تلاش کنید.";
}

export function useRoleAccountAuth(role: AccountPortalRole) {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [currentUser, setCurrentUser] = useState<UserPublic | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const syncSession = useCallback(async () => {
    try {
      setCurrentUser(await getCurrentUser());
    } catch {
      setCurrentUser(null);
    } finally {
      setIsCheckingSession(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const refreshSession = async () => {
      try {
        const user = await getCurrentUser();
        if (active) setCurrentUser(user);
      } catch {
        if (active) setCurrentUser(null);
      } finally {
        if (active) setIsCheckingSession(false);
      }
    };

    const handleSessionChange = () => {
      void syncSession();
    };

    void refreshSession();
    window.addEventListener(AUTH_STATE_CHANGE_EVENT, handleSessionChange);
    return () => {
      active = false;
      window.removeEventListener(AUTH_STATE_CHANGE_EVENT, handleSessionChange);
    };
  }, [syncSession]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);
    setSuccessMessage(null);

    const normalizedMobile = mobile.trim();
    if (!/^09\d{9}$/.test(normalizedMobile)) {
      setAuthError("شماره موبایل باید با 09 شروع شود و ۱۱ رقم داشته باشد.");
      return;
    }
    if (!password) {
      setAuthError("رمز عبور را وارد کنید.");
      return;
    }

    if (authMode === "register") {
      if (role === "HASHTI") {
        setAuthError("برای کارکنان هشتی ثبت‌نام عمومی فعال نیست.");
        return;
      }
      if (!firstName.trim() || !lastName.trim()) {
        setAuthError("نام و نام خانوادگی را وارد کنید.");
        return;
      }
      if (password.length < 8) {
        setAuthError("رمز عبور باید حداقل ۸ کاراکتر داشته باشد.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (authMode === "register") {
        const registrationRole = role as Exclude<UserRole, "HASHTI">;
        await registerUser({
          mobile: normalizedMobile,
          password,
          role: registrationRole,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        });

      }

      const result = await loginUser(normalizedMobile, password, role);
      setCurrentUser(result.user);
      setPassword("");
      setSuccessMessage(
        authMode === "register"
          ? "ثبت‌نام با موفقیت انجام شد و ورود خودکار انجام گرفت."
          : "ورود با موفقیت انجام شد."
      );

      // پس از ورود کارکنان هشتی، کاربر را به همان صفحه مدیریتی برگردان
      // که پیش از ورود درخواست کرده بود؛ فقط مسیرهای داخلی پنل پذیرفته می‌شوند.
      if (role === "HASHTI" && typeof window !== "undefined") {
        const returnTo = new URLSearchParams(window.location.search).get("returnTo");
        if (returnTo?.startsWith("/admin/")) {
          window.location.assign(returnTo);
          return;
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("already registered")) setAuthMode("login");
      setAuthError(translateError(message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const changeMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthError(null);
    setSuccessMessage(null);
  };

  const isAuthenticatedForThisRole = currentUser?.role === role;

  return {
    authMode, setAuthMode, mobile, setMobile, password, setPassword,
    firstName, setFirstName, lastName, setLastName, currentUser, setCurrentUser,
    isCheckingSession, setIsCheckingSession, isSubmitting, setIsSubmitting,
    authError, setAuthError, successMessage, setSuccessMessage, syncSession,
    handleSubmit, changeMode, isAuthenticatedForThisRole,
  };
}
