"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/features/auth/api/authApi";

/** کنترل تکمیلی رابط؛ کنترل اصلی در AdminAccessGuard انجام می‌شود. */
export function useAdminHomeAccess() {
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getCurrentUser()
      .then((user) => {
        if (!active) return;
        if (user.role !== "HASHTI" || user.isSuperAdmin !== true) {
          setError("فقط مدیر ارشد هشتی اجازه ورود به پنل مدیریت را دارد.");
        }
      })
      .catch(() => {
        if (active) setError("نشست مدیریتی معتبر نیست؛ دوباره وارد شوید.");
      });

    return () => {
      active = false;
    };
  }, []);

  return error;
}
