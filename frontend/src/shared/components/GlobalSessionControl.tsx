"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  House,
  LogOut,
  LoaderCircle,
  LayoutDashboard,
} from "lucide-react";

import {
  AUTH_STATE_CHANGE_EVENT,
  getCurrentUser,
  logoutUser,
  type UserPublic,
} from "@/features/auth/api/authApi";

export function GlobalSessionControl() {
  const pathname = usePathname();
  const latestCheckId = useRef(0);

  const [user, setUser] = useState<UserPublic | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const syncSession = useCallback(async () => {
    const checkId = ++latestCheckId.current;

    try {
      const currentUser = await getCurrentUser();

      if (checkId === latestCheckId.current) {
        setUser(currentUser);
        setLogoutError(null);
      }
    } catch {
      if (checkId === latestCheckId.current) {
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    const handleAuthStateChange = () => {
      void syncSession();
    };

    void syncSession();

    window.addEventListener(
      AUTH_STATE_CHANGE_EVENT,
      handleAuthStateChange
    );

    return () => {
      window.removeEventListener(
        AUTH_STATE_CHANGE_EVENT,
        handleAuthStateChange
      );
    };
  }, [pathname, syncSession]);

  const handleLogout = async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);
    setLogoutError(null);

    try {
      await logoutUser();
      setUser(null);
    } catch {
      setLogoutError(
        "خروج انجام نشد؛ اتصال به سرور را بررسی کنید."
      );
    } finally {
      setIsSigningOut(false);
    }
  };

  const showHomeButton = pathname !== "/";

  if (!user && !showHomeButton && !logoutError) {
    return null;
  }

  const dashboardHref =
    user?.role === "CUSTOMER"
      ? "/customer"
      : user?.role === "OWNER"
        ? "/owner"
        : user?.role === "AGENT"
          ? "/agent"
          : "/hashti";

  const buttonClass =
    "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F9CF9] disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <>
      {(showHomeButton || user) && (
        <div
          className="fixed left-4 top-4 z-[2000] flex items-center gap-2"
          dir="ltr"
        >
          {showHomeButton && (
            <Link
              href="/"
              aria-label="خانه"
              title="خانه"
              className={buttonClass}
              dir="rtl"
            >
              <House className="h-4 w-4" />
              خانه
            </Link>
          )}

          {user && (
            <>
              <Link
                href={dashboardHref}
                aria-label="پنل من"
                title="پنل من"
                className={buttonClass}
                dir="rtl"
              >
                <LayoutDashboard className="h-4 w-4" />
                پنل
              </Link>

              <button
                type="button"
                onClick={() => void handleLogout()}
                disabled={isSigningOut}
                aria-label="خروج از حساب کاربری"
                title="خروج"
                className={buttonClass}
                dir="rtl"
              >
                {isSigningOut ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                {isSigningOut ? "در حال خروج..." : "خروج"}
              </button>
            </>
          )}

          {logoutError && (
            <span
              role="alert"
              className="absolute left-0 top-full mt-2 whitespace-nowrap rounded-lg bg-white px-3 py-2 text-sm text-red-700 shadow"
              dir="rtl"
            >
              {logoutError}
            </span>
          )}
        </div>
      )}

      {logoutError && !showHomeButton && !user && (
        <div
          role="alert"
          dir="rtl"
          className="fixed left-4 top-16 z-[2000] rounded-lg bg-white px-3 py-2 text-sm text-red-700 shadow"
        >
          {logoutError}
        </div>
      )}
    </>
  );
}
