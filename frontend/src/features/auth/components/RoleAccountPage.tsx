"use client";

import { AgentDashboard } from "@/features/agent/components/AgentDashboard";
import { OwnerDashboard } from "@/features/owner/components/OwnerDashboard";
import { HashtiDashboard } from "@/features/hashti/components/HashtiDashboard";
import {
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  LoaderCircle,
  LogIn,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { useRoleAccountAuth, type AccountPortalRole } from "../hooks/useRoleAccountAuth";

const roleCopy: Record<AccountPortalRole, {
  title: string;
  heading: string;
  description: string;
  successTitle: string;
  successDescription: string;
}> = {
  OWNER: {
    title: "مالک",
    heading: "ورود یا ایجاد حساب مالک",
    description: "برای ثبت و مدیریت ملک، وارد حساب مالک شوید یا حساب جدید ایجاد کنید.",
    successTitle: "حساب مالک آماده است",
    successDescription: "ورود به حساب مالک با موفقیت انجام شد. برای ادامه، از گزینه‌های هشتی استفاده کنید.",
  },
  AGENT: {
    title: "مشاور املاک",
    heading: "ورود یا ایجاد حساب مشاور",
    description: "برای استفاده از امکانات مشاور املاک، وارد حساب خود شوید یا حساب جدید ایجاد کنید.",
    successTitle: "ورود به حساب مشاور انجام شد",
    successDescription: "هستی حساب و وضعیت تأیید آن در ادامه بررسی می‌شود؛ امکانات مشاور فقط پس از تأیید در رابط نمایش داده خواهند شد.",
  },
  HASHTI: {
    title: "کارکنان هشتی",
    heading: "ورود به پنل هشتی",
    description: "این بخش فقط برای حساب‌های کارکنان هشتی در دسترس است.",
    successTitle: "به پنل هشتی خوش آمدید",
    successDescription: "نشست شما با نقش کارکنان هشتی تأیید شد. ابزارهای مدیریتی بعدی از همین مسیر محافظت‌شده اضافه می‌شوند.",
  },
};

interface RoleAccountPageProps {
  role: AccountPortalRole;
}


export function RoleAccountPage({ role }: RoleAccountPageProps) {
  const copy = roleCopy[role];
  const [hasSelectedTool, setHasSelectedTool] = useState(false);
  const {
    authMode, mobile, setMobile, password, setPassword, firstName, setFirstName,
    lastName, setLastName, currentUser, isCheckingSession, isSubmitting, authError,
    successMessage, handleSubmit, changeMode,
    isAuthenticatedForThisRole,
  } = useRoleAccountAuth(role);

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 text-slate-900">
      <section className={role === "HASHTI" ? "w-full max-w-none px-0 py-4" : "mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12"}>
        {!hasSelectedTool && (
  <div className="mb-6">
    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#043873]">
      {role === "OWNER" ? (
        <Building2 className="h-6 w-6" />
      ) : role === "AGENT" ? (
        <BriefcaseBusiness className="h-6 w-6" />
      ) : (
        <ShieldCheck className="h-6 w-6" />
      )}
    </div>

    <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
      {role === "HASHTI" ? "پنل هشتی" : copy.heading}
    </h1>

    <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
      {copy.description}
    </p>
  </div>
)}

        {isCheckingSession ? (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            در حال بررسی وضعیت ورود...
          </div>
        ) : currentUser && currentUser.role !== role ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-900">
              <h2 className="font-bold">یک حساب دیگر در حال حاضر وارد شده است</h2>
              <p className="mt-2">
                این مرورگر با حساب دیگری وارد شده و به همین دلیل فرم ورود یا ثبت‌نام {copy.title} نمایش داده نمی‌شود.
              </p>
              <p className="mt-2">
                ابتدا از دکمهٔ «خروج» در بالای صفحه خارج شوید. پس از خروج، فرم این بخش در همین صفحه نمایش داده خواهد شد.
              </p>
              <p className="mt-2 text-xs">
                حساب فعال: <span dir="ltr">{currentUser.mobile}</span>
              </p>
            </div>
          </section>
        ) : isAuthenticatedForThisRole && currentUser ? (
          <div className="space-y-5">
            {!hasSelectedTool && <p className="text-sm text-slate-600">
              برای رفتن به صفحهٔ اصلی یا خروج از حساب، از دکمه‌های سراسری بالای صفحه استفاده کنید.
            </p>}
            {!hasSelectedTool && <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{copy.successTitle}</h2>
                  <p className="mt-1 text-sm leading-7 text-slate-600">{successMessage || copy.successDescription}</p>
                  <p className="mt-1 text-xs text-slate-500">حساب فعال: <span dir="ltr">{currentUser.mobile}</span></p>
                </div>
              </div>
            </section>}
            {role === "OWNER" && <OwnerDashboard user={currentUser} onToolSelected={() => setHasSelectedTool(true)} />}
            {role === "AGENT" && <AgentDashboard user={currentUser} onToolSelected={() => setHasSelectedTool(true)} />}
            {role === "HASHTI" && <HashtiDashboard user={currentUser} onToolSelected={() => setHasSelectedTool(true)} />}
          </div>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-lg font-bold">{copy.heading}</h2>
            {role !== "HASHTI" && (
              <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => changeMode("login")}
                  className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${authMode === "login" ? "bg-white text-[#043873] shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                >
                  ورود
                </button>
                <button
                  type="button"
                  onClick={() => changeMode("register")}
                  className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${authMode === "register" ? "bg-white text-[#043873] shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                >
                  ایجاد حساب
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {authMode === "register" && role !== "HASHTI" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block space-y-2 text-sm font-medium">
                    نام
                    <input
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-[#043873] focus:ring-2 focus:ring-[#043873]/10"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      autoComplete="given-name"
                      required
                    />
                  </label>
                  <label className="block space-y-2 text-sm font-medium">
                    نام خانوادگی
                    <input
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-[#043873] focus:ring-2 focus:ring-[#043873]/10"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      autoComplete="family-name"
                      required
                    />
                  </label>
                </div>
              )}

              <label className="block space-y-2 text-sm font-medium">
                شماره موبایل
                <input
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-[#043873] focus:ring-2 focus:ring-[#043873]/10"
                  type="tel"
                  inputMode="numeric"
                  dir="ltr"
                  placeholder="09123456789"
                  value={mobile}
                  onChange={(event) => setMobile(event.target.value)}
                  autoComplete="tel"
                  required
                />
              </label>

              <label className="block space-y-2 text-sm font-medium">
                رمز عبور
                <input
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-[#043873] focus:ring-2 focus:ring-[#043873]/10"
                  type="password"
                  dir="ltr"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={authMode === "register" ? "new-password" : "current-password"}
                  minLength={authMode === "register" ? 8 : undefined}
                  required
                />
              </label>

              {authError && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#043873] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#062a5b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : authMode === "register" ? (
                  <UserPlus className="h-4 w-4" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                {isSubmitting
                  ? "لطفاً صبر کنید..."
                  : authMode === "register"
                    ? "ایجاد حساب و ادامه"
                    : "ورود و ادامه"}
              </button>
            </form>
          </section>
        )}
      </section>
    </main>
  );
}
