"use client";

import type { ReactNode } from "react";
import { FileText, LoaderCircle } from "lucide-react";
import { useCustomerSearchRequest } from "../hooks/useCustomerSearchRequest";
import type {
  CustomerRequestPropertyType,
  CustomerRequestTransactionType,
} from "../types/customerSearchRequest";

const transactionOptions: Array<{
  value: CustomerRequestTransactionType;
  label: string;
}> = [
  { value: "SALE", label: "خرید" },
  { value: "FULL_DEPOSIT", label: "رهن کامل" },
  { value: "RENT", label: "اجاره" },
];

const propertyOptions: Array<{
  value: CustomerRequestPropertyType;
  label: string;
}> = [
  { value: "APARTMENT", label: "آپارتمان" },
  { value: "HOUSE", label: "خانه" },
  { value: "VILLA", label: "ویلا" },
  { value: "LAND", label: "زمین" },
  { value: "SHOP", label: "مغازه" },
  { value: "OFFICE", label: "اداری" },
  { value: "GARDEN", label: "باغ" },
];

const inputClassName =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-[#043873] focus:ring-2 focus:ring-[#043873]/10 disabled:bg-slate-100";

function Alert({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
    >
      {children}
    </div>
  );
}

export function CustomerSearchRequestPage() {
  const {
    authStatus,
    authMode,
    changeAuthMode,
    mobile,
    setMobile,
    password,
    setPassword,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    isAuthSubmitting,
    authError,
    registrationSuccess,
    submitAuthentication,
    retryLoadCustomerProfile,
    requestValues,
    setRequestField,
    isRequestSubmitting,
    requestError,
    submitRequest,
    createdRequest,
    startAnotherRequest,
  } = useCustomerSearchRequest();

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 text-slate-900">
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#043873]">
            <FileText className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            درخواست جست‌وجوی ملک
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            مشخصات ملک موردنظرتان را ثبت کنید تا درخواست شما در هشتی ثبت شود. برای حفظ حریم خصوصی، اطلاعات تماس شما در فهرست عمومی درخواست‌ها نمایش داده نمی‌شود.
          </p>
        </div>

        {authStatus === "checking" && (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            در حال بررسی وضعیت ورود...
          </div>
        )}

        {authStatus === "profile-error" && (
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-lg font-bold">بازیابی اطلاعات حساب مشتری</h2>
            <p className="text-sm leading-7 text-slate-600">
              ورود انجام شده، اما دریافت پروفایل مشتری تکمیل نشد. ابتدا دریافت پروفایل را دوباره امتحان کنید؛ در صورت نیاز به خروج، از دکمهٔ سراسری خروج بالای صفحه استفاده کنید.
            </p>
            {authError && <Alert>{authError}</Alert>}
            <button
              type="button"
              onClick={() => void retryLoadCustomerProfile()}
              disabled={isAuthSubmitting}
              className="rounded-xl bg-[#043873] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#062a5b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAuthSubmitting ? "در حال بررسی..." : "تلاش دوباره"}
            </button>
            <p className="text-sm text-slate-600">
              برای خروج از حساب، از دکمهٔ سراسری خروج بالای صفحه استفاده کنید.
            </p>
          </section>
        )}

        {authStatus === "wrong-role" && (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-lg font-bold">این بخش مخصوص حساب مشتری است</h2>
            <p className="text-sm leading-7 text-slate-600">
              در حال حاضر با نقش دیگری وارد شده‌اید. برای ثبت درخواست جست‌وجو باید با حساب مشتری وارد شوید. ابتدا از دکمهٔ سراسری خروج بالای صفحه استفاده کنید و سپس دوباره وارد شوید.
            </p>
            {authError && <Alert>{authError}</Alert>}
          </div>
        )}

        {authStatus === "anonymous" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-lg font-bold">ورود یا ایجاد حساب مشتری</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              برای ثبت و پیگیری درخواست، ابتدا وارد حساب مشتری شوید.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => changeAuthMode("login")}
                className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${authMode === "login" ? "bg-white text-[#043873] shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                ورود
              </button>
              <button
                type="button"
                onClick={() => changeAuthMode("register")}
                className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${authMode === "register" ? "bg-white text-[#043873] shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                ایجاد حساب مشتری
              </button>
            </div>

            <form onSubmit={submitAuthentication} className="mt-5 space-y-4">
              {authMode === "register" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block space-y-2 text-sm font-medium">
                    نام
                    <input
                      className={inputClassName}
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      autoComplete="given-name"
                      required
                    />
                  </label>
                  <label className="block space-y-2 text-sm font-medium">
                    نام خانوادگی
                    <input
                      className={inputClassName}
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
                  className={inputClassName}
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
                  className={inputClassName}
                  type="password"
                  dir="ltr"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={authMode === "register" ? "new-password" : "current-password"}
                  minLength={authMode === "register" ? 8 : undefined}
                  required
                />
              </label>

              {authError && <Alert>{authError}</Alert>}

              <button
                type="submit"
                disabled={isAuthSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#043873] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#062a5b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAuthSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {isAuthSubmitting
                  ? "لطفاً صبر کنید..."
                  : authMode === "register"
                    ? "ایجاد حساب و ادامه"
                    : "ورود و ادامه"}
              </button>
            </form>
          </section>
        )}

        {authStatus === "customer" && registrationSuccess && !createdRequest && (
          <div
            role="status"
            aria-live="polite"
            className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-7 text-emerald-800"
          >
            ثبت‌نام شما با موفقیت انجام شد و وارد حساب مشتری شده‌اید. اکنون می‌توانید مشخصات ملک موردنظرتان را وارد کنید.
          </div>
        )}

        {authStatus === "customer" && !createdRequest && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-lg font-bold">مشخصات ملک موردنظر</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              فقط اطلاعات موردنیاز برای شروع جست‌وجو را وارد کنید؛ بودجه و توضیحات تکمیلی اختیاری هستند.
            </p>

            <form onSubmit={submitRequest} className="mt-6 space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block space-y-2 text-sm font-medium">
                  نوع درخواست
                  <select
                    className={inputClassName}
                    value={requestValues.transactionType}
                    onChange={(event) => setRequestField("transactionType", event.target.value as CustomerRequestTransactionType)}
                  >
                    {transactionOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2 text-sm font-medium">
                  نوع ملک
                  <select
                    className={inputClassName}
                    value={requestValues.propertyType}
                    onChange={(event) => setRequestField("propertyType", event.target.value as CustomerRequestPropertyType)}
                  >
                    {propertyOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block space-y-2 text-sm font-medium">
                  شهر موردنظر <span className="text-red-600">*</span>
                  <input
                    className={inputClassName}
                    value={requestValues.city}
                    onChange={(event) => setRequestField("city", event.target.value)}
                    placeholder="مثلاً شاهرود"
                    required
                  />
                </label>

                <label className="block space-y-2 text-sm font-medium">
                  بودجه تقریبی (تومان)
                  <input
                    className={inputClassName}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={requestValues.budget}
                    onChange={(event) => setRequestField("budget", event.target.value)}
                    placeholder="اختیاری"
                  />
                </label>
              </div>

              <label className="block space-y-2 text-sm font-medium">
                توضیحات تکمیلی
                <textarea
                  className={`${inputClassName} min-h-32 resize-y`}
                  value={requestValues.description}
                  onChange={(event) => setRequestField("description", event.target.value)}
                  placeholder="محله، ویژگی‌های ضروری یا توضیحاتی که به جست‌وجو کمک می‌کند..."
                  rows={4}
                />
              </label>

              {requestError && <Alert>{requestError}</Alert>}

              <button
                type="submit"
                disabled={isRequestSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#043873] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#062a5b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRequestSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {isRequestSubmitting ? "در حال ثبت درخواست..." : "ثبت درخواست جست‌وجو"}
              </button>
            </form>
          </section>
        )}

        {authStatus === "customer" && createdRequest && (
          <section className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <FileText className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">درخواست شما ثبت شد</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              اطلاعات درخواست با موفقیت در هشتی ثبت شد. در این مرحله درخواست با وضعیت اولیهٔ سیستم ذخیره می‌شود؛ این پیام به معنی پیدا شدن یا تأیید یک ملک نیست.
            </p>
            <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              کد پیگیری: <span dir="ltr" className="select-all font-mono">{createdRequest.id}</span>
            </p>
            <button
              type="button"
              onClick={startAnotherRequest}
              className="mt-6 rounded-xl bg-[#043873] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#062a5b]"
            >
              ثبت درخواست دیگر
            </button>
          </section>
        )}
      </section>
    </main>
  );
}
