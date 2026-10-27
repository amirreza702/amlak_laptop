"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getCurrentUser } from "@/features/auth/api/authApi";

type AccessState = "checking" | "allowed" | "redirecting";

/**
 * از همه مسیرهای مدیریتی محافظت می‌کند.
 * کاربر بدون نشست یا با نقش غیر HASHTI به فرم ورود هشتی هدایت می‌شود
 * و پس از ورود موفق، به مسیر مدیریتی درخواستی برمی‌گردد.
 */
export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const [accessState, setAccessState] = useState<AccessState>("checking");

  useEffect(() => {
    let active = true;

    setAccessState("checking");

    const redirectToLogin = () => {
      if (!active) return;
      setAccessState("redirecting");
      const returnTo = pathname.startsWith("/admin/") ? pathname : "/admin";
      router.replace(`/hashti?returnTo=${encodeURIComponent(returnTo)}`);
    };

    getCurrentUser()
      .then((user) => {
        if (!active) return;
        if (user.role === "HASHTI") {
          setAccessState("allowed");
          return;
        }
        redirectToLogin();
      })
      .catch(redirectToLogin);

    return () => {
      active = false;
    };
  }, [pathname, router]);

  if (accessState !== "allowed") {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-700"
      >
        <p className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm shadow-sm">
          {accessState === "redirecting"
            ? "در حال انتقال به صفحه ورود هشتی..."
            : "در حال بررسی دسترسی..."}
        </p>
      </main>
    );
  }

  return children;
}
