"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getCurrentUser } from "@/features/auth/api/authApi";

type AccessState = "checking" | "allowed" | "redirecting" | "denied";

type AdminAccessGuardProps = Readonly<{
  children: React.ReactNode;
}>;

/**
 * فقط مدیر ارشد (isSuperAdmin) اجازه ورود به پنل مدیریتی را دارد.
 * احراز هویت و تشخیص مدیر از اطلاعات معتبر نشست سرور انجام می‌شود.
 */
export default function AdminAccessGuard({ children }: AdminAccessGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [accessState, setAccessState] = useState<AccessState>("checking");

  useEffect(() => {
    let active = true;

    void Promise.resolve().then(() => { if (active) setAccessState("checking"); });

    getCurrentUser()
      .then((user) => {
        if (!active) return;

        if (user.role === "HASHTI" && user.isSuperAdmin === true) {
          setAccessState("allowed");
          return;
        }

        // کاربر واردشده اما غیرمدیر را به فرم ورود برنمی‌گردانیم؛
        // تا چرخه ریدایرکت ایجاد نشود، دسترسی صریحاً رد می‌شود.
        setAccessState("denied");
      })
      .catch(() => {
        if (!active) return;
        const returnTo = pathname === "/admin" || pathname.startsWith("/admin/")
          ? pathname
          : "/admin";
        setAccessState("redirecting");
        router.replace(`/hashti?returnTo=${encodeURIComponent(returnTo)}`);
      });

    return () => {
      active = false;
    };
  }, [pathname, router]);

  if (accessState === "denied") {
    return (
      <main dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-700">
        <section role="alert" className="max-w-lg rounded-xl border border-amber-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-bold">دسترسی به پنل مدیریت مجاز نیست</h1>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            فقط حساب مدیر ارشد هشتی می‌تواند وارد این پنل شود. حساب‌های دیگر کارکنان هشتی دسترسی ورود به پنل مدیریت را ندارند.
          </p>
        </section>
      </main>
    );
  }

  if (accessState !== "allowed") {
    return (
      <main dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-700">
        <p className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm shadow-sm">
          {accessState === "redirecting" ? "در حال انتقال به صفحه ورود هشتی..." : "در حال بررسی دسترسی..."}
        </p>
      </main>
    );
  }

  return children;
}
