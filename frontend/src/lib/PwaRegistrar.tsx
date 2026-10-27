"use client";

import { useEffect } from "react";

/**
 * Service Worker را فقط در نسخهٔ Production ثبت می‌کند.
 *
 * دلیل:
 * در محیط Development، Cache ممکن است تغییرات کد را دیر نمایش دهد.
 */
export function PwaRegistrar() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("ثبت Service Worker هشتی ناموفق بود:", error);
      });
    });
  }, []);

  return null;
}
