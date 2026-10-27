"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { BadgeCheck, Contact, FileText, LoaderCircle, LockKeyhole, RefreshCw, Save, ShieldAlert, UserRound } from "lucide-react";
import type { UserPublic } from "@/features/auth/api/authApi";
import { UserNotificationsPanel } from "@/shared/components/UserNotificationsPanel";
import { useAgentRequestFilters } from "../hooks/useAgentRequestFilters";
import { agentApiRequest as requestJson } from "../api/agentApi";
import type { AgentContactUsage, AgentProfile, ActiveAgentSubscription, ActiveRequest, ContactResult, SubscriptionPlan } from "../types/agent";
import { PropertyRegistrationPanel } from "@/features/property/components/PropertyRegistrationPanel";
import { OwnerAgentRequestsPanel } from "./OwnerAgentRequestsPanel";


function displayMoney(value: string | number | null) {
  if (value === null || value === "") return "تعیین نشده";
  const numeric = Number(value);
  return Number.isFinite(numeric) ? new Intl.NumberFormat("fa-IR").format(numeric) + " تومان" : String(value);
}
function transactionName(value: string) {
  return value === "SALE" ? "خرید" : value === "FULL_DEPOSIT" ? "رهن کامل" : value === "RENT" ? "اجاره" : value;
}
function propertyName(value: string) {
  const labels: Record<string, string> = { APARTMENT: "آپارتمان", HOUSE: "خانه", VILLA: "ویلا", LAND: "زمین", SHOP: "مغازه", OFFICE: "اداری", GARDEN: "باغ" };
  return labels[value] ?? value;
}

export function AgentDashboard({ user, onToolSelected }: { user: UserPublic; onToolSelected?: () => void }) {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profileState, setProfileState] = useState<"checking" | "verified" | "pending" | "rejected" | "unknown" | "error">("checking");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileReviewNotes, setProfileReviewNotes] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [address, setAddress] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveMessage, setProfileSaveMessage] = useState<string | null>(null);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [requests, setRequests] = useState<ActiveRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const {
    visibleRequests,
    requestSearch, setRequestSearch,
    requestFilter, setRequestFilter,
    requestTransaction, setRequestTransaction,
    requestPropertyType, setRequestPropertyType,
    requestCity, setRequestCity,
    budgetMin, setBudgetMin,
    budgetMax, setBudgetMax,
    requestFrom, setRequestFrom,
    requestTo, setRequestTo,
    resetRequestFilters,
  } = useAgentRequestFilters(requests);
  const [contacts, setContacts] = useState<Record<string, ContactResult["customer"]>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<ActiveAgentSubscription | null>(null);
  const [contactUsage, setContactUsage] = useState<AgentContactUsage | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setProfileId(null);
    setProfileState("checking");
    setProfileError(null);

    (async () => {
      try {
        // شناسه پروفایل همیشه از نشست معتبر سرور استخراج می‌شود، نه از مرورگر.
        const profile = await requestJson<AgentProfile>("/agents/me/profile");

        if (!active) return;
        setProfileId(profile.id);
        setFirstName(profile.firstName);
        setLastName(profile.lastName);
        setAgencyName(profile.agencyName ?? "");
        setAddress(profile.address ?? "");
        setProfileReviewNotes(profile.verificationNotes ?? null);
        if (profile.verificationStatus === "VERIFIED" && profile.isVerified) {
          setProfileState("verified");
        } else if (profile.verificationStatus === "REJECTED") {
          setProfileState("rejected");
        } else {
          setProfileState("pending");
        }
      } catch (error: unknown) {
        if (active) {
          setProfileState("error");
          setProfileError(error instanceof Error ? error.message : "بررسی وضعیت حساب مشاور انجام نشد.");
        }
      }
    })();

    return () => { active = false; };
  }, [user.mobile]);

  useEffect(() => {
    if (!profileId) return;
    let active = true;

    (async () => {
      setSubscriptionLoading(true);
      setSubscriptionError(null);
      try {
        const [plansResult, subscriptionResult, usageResult] = await Promise.all([
          requestJson<{ plans: SubscriptionPlan[] }>("/subscription-plans"),
          requestJson<{ subscription: ActiveAgentSubscription | null }>(
            "/agents/" + encodeURIComponent(profileId) + "/subscriptions/current"
          ),
          requestJson<{ usage: AgentContactUsage }>(
            "/agents/" + encodeURIComponent(profileId) + "/subscriptions/usage"
          ),
        ]);

        if (!active) return;
        setSubscriptionPlans(plansResult.plans);
        setCurrentSubscription(subscriptionResult.subscription);
        setContactUsage(usageResult.usage);
      } catch (error: unknown) {
        if (active) {
          setSubscriptionError(error instanceof Error ? error.message : "دریافت اطلاعات اشتراک انجام نشد.");
        }
      } finally {
        if (active) setSubscriptionLoading(false);
      }
    })();

    return () => { active = false; };
  }, [profileId]);

  const loadRequests = useCallback(async () => {
    setLoadingRequests(true);
    setRequestsError(null);
    try {
      setRequests(await requestJson<ActiveRequest[]>("/search-requests/active"));
    } catch (error: unknown) {
      setRequestsError(error instanceof Error ? error.message : "دریافت درخواست‌ها انجام نشد.");
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    if (profileState === "verified") void loadRequests();
  }, [profileState, loadRequests]);

  const openContact = async (requestId: string) => {
    if (!profileId) {
      setRequestsError("شناسهٔ پروفایل مشاور در دسترس نیست؛ دریافت آن به API سمت سرور نیاز دارد.");
      return;
    }
    setBusyId(requestId);
    setRequestsError(null);
    setActionMessage(null);
    try {
      const result = await requestJson<ContactResult>(
        `/agents/${encodeURIComponent(profileId)}/search-requests/${encodeURIComponent(requestId)}/contact`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }
      );
      setContacts((current) => ({ ...current, [requestId]: result.customer }));
      setActionMessage("دسترسی به اطلاعات تماس از سرور دریافت شد.");
    } catch (error: unknown) {
      setRequestsError(error instanceof Error ? error.message : "دسترسی به اطلاعات تماس انجام نشد.");
    } finally {
      setBusyId(null);
    }
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profileId) return;
    setIsSavingProfile(true);
    setProfileSaveError(null);
    setProfileSaveMessage(null);
    try {
      const updated = await requestJson<AgentProfile>(
        `/agents/${encodeURIComponent(profileId)}/profile`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            agencyName: agencyName.trim() || null,
            address: address.trim() || null,
          }),
        }
      );
      setFirstName(updated.firstName);
      setLastName(updated.lastName);
      setAgencyName(updated.agencyName ?? "");
      setAddress(updated.address ?? "");
      setProfileSaveMessage("اطلاعات پروفایل مشاور ذخیره شد.");
    } catch (error: unknown) {
      setProfileSaveError(error instanceof Error ? error.message : "ذخیرهٔ پروفایل مشاور انجام نشد.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen w-full mr-16 space-y-5 overflow-x-hidden bg-slate-50 px-3 py-4 sm:px-5 lg:mr-64 lg:px-6">
      <aside aria-label="ابزارهای پنل مشاور" className="fixed inset-y-0 right-0 z-30 w-16 overflow-x-hidden overflow-y-auto border-l border-slate-200 bg-white p-1.5 shadow-sm sm:p-2 lg:w-64 lg:p-3">
        <h2 className="hidden px-3 py-2 text-base font-black text-slate-900 lg:block">پنل مشاور</h2>
        <nav className="grid grid-cols-1 gap-1.5 lg:gap-2" aria-label="ابزارهای مشاور">
          {[["profile", "پروفایل"], ["property-management", "مدیریت املاک"], ["requests", "درخواست‌ها"], ["notifications", "اعلان‌ها"]].map(([target, label]) => (
            <button key={target} type="button" title={label} aria-current={selectedTool === target ? "page" : undefined} onClick={() => { setSelectedTool(target); onToolSelected?.(); }} className={`flex min-h-11 min-w-0 items-center justify-center rounded-lg border px-1 py-2 text-center text-[11px] font-semibold leading-4 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#043873] lg:justify-start lg:px-3 lg:text-right lg:text-sm ${selectedTool === target ? "border-[#043873] bg-blue-50 text-[#043873]" : "border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-[#043873]"}`}><span className="hidden lg:inline">{label}</span><span className="lg:hidden">{label.slice(0,2)}</span></button>
          ))}
        </nav>
      </aside>
      {profileState === "checking" && selectedTool === "profile" && (
        <section className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600"><LoaderCircle className="h-5 w-5 animate-spin" />در حال بررسی تأیید حساب مشاور...</section>
      )}

      {(profileState === "pending" || profileState === "rejected" || profileState === "unknown" || profileState === "error") && selectedTool === "profile" && (
        <section className={`rounded-2xl border p-5 ${profileState === "rejected" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
          <div className="flex items-center gap-3">
            <ShieldAlert className={`h-6 w-6 ${profileState === "rejected" ? "text-red-700" : "text-amber-700"}`} />
            <div>
              <h3 className={`font-bold ${profileState === "rejected" ? "text-red-950" : "text-amber-950"}`}>
                {profileState === "pending"
                  ? "حساب مشاور در انتظار بررسی هشتی است"
                  : profileState === "rejected"
                    ? "درخواست تأیید مشاور رد شده است"
                    : profileState === "unknown"
                      ? "وضعیت تأیید حساب قابل بازیابی نیست"
                      : "بررسی حساب مشاور ناموفق بود"}
              </h3>
              <p className={`mt-2 text-sm leading-7 ${profileState === "rejected" ? "text-red-900" : "text-amber-900"}`}>
                {profileState === "pending"
                  ? "پس از بررسی و تأیید هشتی، امکانات عملیاتی مشاور در دسترس خواهد بود."
                  : profileState === "rejected"
                    ? profileReviewNotes || "هشتی حساب را تأیید نکرده است. برای پیگیری، با پشتیبانی هشتی تماس بگیرید."
                    : profileError}
              </p>
            </div>
          </div>
          {(profileState === "unknown" || profileState === "error") && profileError && <p className="mt-3 text-xs leading-6 text-amber-900">لطفاً نشست ورود را بررسی کنید؛ اگر خطا ادامه داشت، پاسخ سرور را برای عیب‌یابی نگه دارید.</p>}
        </section>
      )}

      {profileState === "verified" && selectedTool === "property-management" && <PropertyRegistrationPanel mode="agent" />}

      {profileState === "verified" && (
        <section hidden={selectedTool !== "profile"} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-7 text-emerald-900">
          <h2 className="font-bold">حساب مشاور تأیید شده است</h2>
          <p className="mt-2">امکانات پنل بر اساس وضعیت حساب و سطح دسترسی شما نمایش داده می‌شود.</p>
        </section>
      )}

      {profileId && profileState !== "checking" && (
        <section hidden={selectedTool !== "profile"} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold">اشتراک و سهمیهٔ دسترسی به اطلاعات تماس</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            نمایش اطلاعات این بخش از API سرور انجام می‌شود. تخصیص یا ارتقای اشتراک فعلاً توسط هشتی انجام می‌شود؛ پرداخت آنلاین در این مسیر پیاده‌سازی نشده است.
          </p>
          {subscriptionLoading ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" /> در حال دریافت اطلاعات اشتراک...</p>
          ) : subscriptionError ? (
            <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{subscriptionError}</p>
          ) : (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">اشتراک فعلی</p>
                  <p className="mt-1 font-bold">{currentSubscription?.plan.name ?? "بدون اشتراک فعال"}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">مصرف ماه جاری</p>
                  <p className="mt-1 font-bold">{(contactUsage?.usedCount ?? 0).toLocaleString("fa-IR")} از {(contactUsage?.monthlyLimit ?? 0).toLocaleString("fa-IR")}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">سهمیه باقی‌مانده</p>
                  <p className="mt-1 font-bold">{(contactUsage?.remainingCount ?? 0).toLocaleString("fa-IR")}</p>
                </div>
              </div>
              <h3 className="mt-5 font-bold">پلن‌های فعال هشتی</h3>
              {subscriptionPlans.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">در حال حاضر پلن فعالی ثبت نشده است.</p>
              ) : (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {subscriptionPlans.map((plan) => (
                    <article key={plan.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-bold">{plan.name}</p>
                        {currentSubscription?.plan.id === plan.id && <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800">پلن فعلی</span>}
                      </div>
                      <p className="mt-2 text-sm text-slate-600">سقف دسترسی ماهانه: {plan.monthlyContactLimit.toLocaleString("fa-IR")} درخواست تماس</p>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {profileState === "verified" && (
        <>
          <div hidden={selectedTool !== "requests"} className="grid gap-3 sm:grid-cols-3">
            <SummaryCard icon={<BadgeCheck className="h-5 w-5" />} label="وضعیت حساب" value="تأیید شده" />
            <SummaryCard icon={<FileText className="h-5 w-5" />} label="درخواست‌های فعال" value={String(requests.length)} />
            <SummaryCard icon={<Contact className="h-5 w-5" />} label="اطلاعات تماس دریافت‌شده" value={String(Object.keys(contacts).length)} />
          </div>

          <section hidden={selectedTool !== "profile"} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2">
              <UserRound className="h-5 w-5 text-[#043873]" />
              <h2 className="text-lg font-bold">پروفایل مشاور</h2>
            </div>
            <form onSubmit={saveProfile} className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium">
                نام
                <input className="w-full rounded-xl border border-slate-300 px-3 py-2.5" value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
              </label>
              <label className="space-y-1 text-sm font-medium">
                نام خانوادگی
                <input className="w-full rounded-xl border border-slate-300 px-3 py-2.5" value={lastName} onChange={(event) => setLastName(event.target.value)} required />
              </label>
              <label className="space-y-1 text-sm font-medium">
                نام دفتر یا مجموعه (اختیاری)
                <input className="w-full rounded-xl border border-slate-300 px-3 py-2.5" value={agencyName} onChange={(event) => setAgencyName(event.target.value)} />
              </label>
              <label className="space-y-1 text-sm font-medium">
                نشانی دفتر (اختیاری)
                <input className="w-full rounded-xl border border-slate-300 px-3 py-2.5" value={address} onChange={(event) => setAddress(event.target.value)} />
              </label>
              {profileSaveError && <p role="alert" className="sm:col-span-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">{profileSaveError}</p>}
              {profileSaveMessage && <p role="status" className="sm:col-span-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{profileSaveMessage}</p>}
              <div className="sm:col-span-2">
                <button type="submit" disabled={isSavingProfile} className="inline-flex items-center gap-2 rounded-xl bg-[#043873] px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
                  {isSavingProfile ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} ذخیرهٔ پروفایل
                </button>
              </div>
            </form>
          </section>

          <section hidden={selectedTool !== "requests"} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">درخواست‌های فعال مشتریان</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">اطلاعات تماس تا زمان درخواست و تأیید دسترسی نمایش داده نمی‌شود.</p>
              </div>
              <button type="button" onClick={() => void loadRequests()} disabled={loadingRequests} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50">
                {loadingRequests ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} به‌روزرسانی
              </button>
            </div>
            {requestsError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{requestsError}</p>}
            {actionMessage && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{actionMessage}</p>}
            {!loadingRequests && requests.length > 0 && <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><input aria-label="جست‌وجوی متنی درخواست" value={requestSearch} onChange={(event) => setRequestSearch(event.target.value)} placeholder="کد یا توضیحات درخواست..." className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#043873]" /><input aria-label="شهر" value={requestCity} onChange={(event) => setRequestCity(event.target.value)} placeholder="شهر" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm" /><select aria-label="نوع معامله" value={requestTransaction} onChange={(event) => setRequestTransaction(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="all">همهٔ معاملات</option><option value="SALE">خرید</option><option value="FULL_DEPOSIT">رهن کامل</option><option value="RENT">اجاره</option></select><select aria-label="نوع ملک" value={requestPropertyType} onChange={(event) => setRequestPropertyType(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="all">همهٔ انواع ملک</option><option value="APARTMENT">آپارتمان</option><option value="HOUSE">خانه</option><option value="VILLA">ویلا</option><option value="LAND">زمین</option><option value="SHOP">مغازه</option><option value="OFFICE">اداری</option><option value="GARDEN">باغ</option></select><input aria-label="حداقل بودجه" type="number" min="0" value={budgetMin} onChange={(event) => setBudgetMin(event.target.value)} placeholder="حداقل بودجه (تومان)" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm" /><input aria-label="حداکثر بودجه" type="number" min="0" value={budgetMax} onChange={(event) => setBudgetMax(event.target.value)} placeholder="حداکثر بودجه (تومان)" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm" /><select aria-label="وضعیت بررسی هشتی" value={requestFilter} onChange={(event) => setRequestFilter(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="all">همهٔ وضعیت‌ها</option><option value="verified">بررسی‌شده توسط هشتی</option><option value="pending">در انتظار بررسی هشتی</option></select><div className="grid grid-cols-2 gap-2"><input aria-label="از تاریخ ایجاد" type="date" value={requestFrom} onChange={(event) => setRequestFrom(event.target.value)} className="min-w-0 rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs" /><input aria-label="تا تاریخ ایجاد" type="date" value={requestTo} onChange={(event) => setRequestTo(event.target.value)} className="min-w-0 rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs" /></div></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>{visibleRequests.length} درخواست مطابق فیلترها</span><button type="button" onClick={resetRequestFilters} className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100">پاک‌کردن فیلترها</button></div></div>}
            {loadingRequests ? (
              <div className="mt-5 flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />در حال دریافت درخواست‌ها...</div>
            ) : requests.length === 0 ? (
              <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">در حال حاضر درخواست فعالی وجود ندارد.</p>
            ) : visibleRequests.length === 0 ? (
              <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">درخواستی با این جست‌وجو و فیلتر پیدا نشد.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {visibleRequests.map((request) => (
                  <article key={request.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold">{transactionName(request.transactionType)} {propertyName(request.propertyType)} در {request.city}</h3>
                        <p className="mt-1 text-sm text-slate-600">بودجه: {displayMoney(request.budget)}</p>
                        {request.description && <p className="mt-2 text-sm leading-7 text-slate-600">{request.description}</p>}
                        <p className="mt-2 text-xs text-slate-400">کد درخواست: <span dir="ltr" className="font-mono">{request.id}</span></p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${request.hashtiVerified ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{request.hashtiVerified ? "بررسی هشتی شده" : "در انتظار بررسی هشتی"}</span>
                    </div>
                    {contacts[request.id] ? (
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm">
                        <b>{contacts[request.id].firstName} {contacts[request.id].lastName}</b>
                        <p className="mt-1" dir="ltr">{contacts[request.id].mobile}</p>
                      </div>
                    ) : (
                      <button type="button" onClick={() => void openContact(request.id)} disabled={busyId === request.id} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#043873] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
                        {busyId === request.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />} درخواست دسترسی به اطلاعات تماس
                      </button>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section hidden={selectedTool !== "requests"}>{profileId && <OwnerAgentRequestsPanel agentId={profileId} />}</section>

          <div className="grid gap-3 lg:grid-cols-2">
          </div>
        </>
      )}
      <div hidden={selectedTool !== "notifications"}><UserNotificationsPanel userId={user.id} /></div>
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#043873]">{icon}</div><div><p className="text-sm text-slate-500">{label}</p><p className="mt-1 font-black">{value}</p></div></div>;
}
