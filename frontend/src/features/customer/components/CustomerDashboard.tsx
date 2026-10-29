"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  Bell,
  Check,
  ChevronLeft,
  Edit3,
  FileText,
  Heart,
  LoaderCircle,
  MapPin,
  Plus,
  Save,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { useCustomerDashboardData } from "../hooks/useCustomerDashboardData";
import { formatPersianDate } from "@/shared/utils/date";
import { useCustomerRequestFilters } from "../hooks/useCustomerRequestFilters";
import type {
  CustomerRequestPropertyType,
  CustomerRequestTransactionType,
} from "../types/customerSearchRequest";
import type { CustomerSearchRequestRecord } from "../api/customerDashboardApi";
import {
  closeCustomerSearchRequest,
  removeCustomerFavorite,
  updateCustomerProfile,
  updateCustomerSearchRequest,
} from "../api/customerDashboardApi";
import {
  markUserNotificationAsRead,
} from "@/features/notification/api/notificationApi";

type DashboardTab = "requests" | "favorites" | "notifications" | "profile";

const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#043873] focus:ring-2 focus:ring-[#043873]/10";
const transactionOptions: Array<{ value: CustomerRequestTransactionType; label: string }> = [
  { value: "SALE", label: "خرید" },
  { value: "FULL_DEPOSIT", label: "رهن کامل" },
  { value: "RENT", label: "اجاره" },
];
const propertyOptions: Array<{ value: CustomerRequestPropertyType; label: string }> = [
  { value: "APARTMENT", label: "آپارتمان" },
  { value: "HOUSE", label: "خانه" },
  { value: "VILLA", label: "ویلا" },
  { value: "LAND", label: "زمین" },
  { value: "SHOP", label: "مغازه" },
  { value: "OFFICE", label: "اداری" },
  { value: "GARDEN", label: "باغ" },
];

function money(value: string | number | null): string {
  if (value === null || value === "") return "تعیین نشده";
  const number = Number(value);
  return Number.isFinite(number) ? new Intl.NumberFormat("fa-IR").format(number) + " تومان" : String(value);
}
function prettyDate(value: string): string {
  return formatPersianDate(value);
}
function transactionLabel(value: string): string {
  return transactionOptions.find((option) => option.value === value)?.label ?? value;
}
function propertyLabel(value: string): string {
  return propertyOptions.find((option) => option.value === value)?.label ?? value;
}

export function CustomerDashboard() {
  const [tab, setTab] = useState<DashboardTab | null>(null);
  const {
    user, profile, setProfile, requests, favorites, notifications,
    loading, pageError, actionMessage, setActionMessage,
    actionError, setActionError, busyId, setBusyId, editingId, setEditingId,
    editValues, setEditValues, firstName, setFirstName, lastName, setLastName, refreshData,
  } = useCustomerDashboardData();

  const {
    filteredRequests,
    requestSearch, setRequestSearch,
    requestStatusFilter, setRequestStatusFilter,
    requestTransactionFilter, setRequestTransactionFilter,
    requestTypeFilter, setRequestTypeFilter,
    requestCityFilter, setRequestCityFilter,
    requestBudgetMin, setRequestBudgetMin,
    requestBudgetMax, setRequestBudgetMax,
    resetRequestFilters,
  } = useCustomerRequestFilters(requests);

  const activeCount = useMemo(() => requests.filter((request) => request.status === "ACTIVE").length, [requests]);
  const unreadCount = useMemo(() => notifications.filter((notification) => !notification.isRead).length, [notifications]);

  const runAction = async (id: string, action: () => Promise<void>) => {
    setBusyId(id);
    setActionError(null);
    setActionMessage(null);
    try {
      await action();
      if (profile && user) await refreshData(profile, user);
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : "عملیات انجام نشد.");
    } finally {
      setBusyId(null);
    }
  };

  const startEdit = (request: CustomerSearchRequestRecord) => {
    setEditingId(request.id);
    setEditValues({
      city: request.city,
      budget: request.budget === null ? "" : String(request.budget),
      description: request.description ?? "",
      transactionType: request.transactionType,
      propertyType: request.propertyType,
    });
    setActionError(null);
    setActionMessage(null);
  };

  const saveEdit = async (requestId: string) => {
    if (!profile) return;
    const city = editValues.city.trim();
    if (!city) {
      setActionError("شهر موردنظر را وارد کنید.");
      return;
    }
    let budget: number | null = null;
    if (editValues.budget.trim()) {
      budget = Number(editValues.budget);
      if (!Number.isFinite(budget) || budget < 0) {
        setActionError("بودجه باید عددی معتبر و صفر یا بیشتر باشد.");
        return;
      }
    }
    await runAction(requestId, async () => {
      await updateCustomerSearchRequest(profile.id, requestId, {
        city,
        budget,
        description: editValues.description.trim() || null,
        transactionType: editValues.transactionType,
        propertyType: editValues.propertyType,
      });
      setEditingId(null);
      setActionMessage("درخواست با موفقیت به‌روزرسانی شد.");
    });
  };

  const tabItems: Array<{ id: DashboardTab; label: string; count?: number; icon: typeof FileText }> = [
    { id: "requests", label: "درخواست‌های من", count: requests.length, icon: FileText },
    { id: "favorites", label: "علاقه‌مندی‌ها", count: favorites.length, icon: Heart },
    { id: "notifications", label: "اعلان‌ها", count: unreadCount, icon: Bell },
    { id: "profile", label: "پروفایل", icon: UserRound },
  ];

  return (
    <main dir="rtl" className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-6 overflow-x-hidden bg-slate-50 px-4 py-6 text-slate-900 sm:px-8 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside aria-label="ابزارهای پنل مشتری" className="h-fit rounded-xl border border-slate-200 bg-white p-3">
        <h2 className="px-3 pb-2 pt-1 text-sm font-bold text-slate-500">پنل مشتری</h2>
        <nav className="flex gap-2 overflow-x-auto lg:flex-col" aria-label="ابزارهای مشتری">
          {tabItems.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" title={item.label} aria-current={tab === item.id ? "page" : undefined} onClick={() => setTab(item.id)} className={`flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-right text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#043873] lg:w-full ${tab === item.id ? "border-[#043873] bg-blue-50 text-[#043873]" : "border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-[#043873]"}`}><Icon className="h-4 w-4 shrink-0" /><span>{item.label}</span></button>; })}
          <Link href="/search" title="جست‌وجوی ملک" className="flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-right text-sm font-semibold text-slate-700 hover:bg-blue-50"><span>جست‌وجو</span></Link>
          <Link href="/request" title="درخواست جدید" className="flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-[#043873] px-3 py-2 text-right text-sm font-semibold text-white"><span>درخواست جدید</span></Link>
        </nav>
      </aside>
      <div className="min-w-0 space-y-5">
      <header hidden={tab === null} className="rounded-xl border border-slate-200 bg-white">
        <div className="flex w-full items-center justify-between gap-3 px-3 py-4 sm:px-5 lg:px-6">
          <Link href="/" className="text-lg font-black text-[#043873]">هشتی</Link>
          <div className="flex items-center gap-2">
            <Link href="/search" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50">
              <Search className="h-4 w-4" /> جست‌وجوی ملک
            </Link>
            <Link href="/request" className="inline-flex items-center gap-2 rounded-lg bg-[#043873] px-3 py-2 text-sm font-semibold text-white hover:bg-[#062a5b]">
              <Plus className="h-4 w-4" /> درخواست جدید
            </Link>
          </div>
        </div>
      </header>

      <section hidden={tab === null} className="mr-16 min-h-[calc(100vh-4rem)] w-auto px-3 py-4 sm:px-5 lg:mr-64 lg:px-6">
        <div className="mb-6">
          <p className="text-sm font-semibold text-[#2563eb]">پنل مشتری</p>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">{profile ? `سلام ${profile.firstName}` : "حساب مشتری"}</h1>
          <p className="mt-2 text-sm leading-7 text-slate-600">درخواست‌های جست‌وجو، علاقه‌مندی‌ها و اعلان‌ها را از یک محل مدیریت کنید.</p>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            <LoaderCircle className="h-5 w-5 animate-spin" /> در حال دریافت اطلاعات پنل...
          </div>
        ) : pageError ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm leading-7 text-red-800">
            {pageError} <div className="mt-3"><Link href="/" className="font-bold underline">بازگشت به صفحه اصلی</Link></div>
          </div>
        ) : (
          <>
            <div hidden={tab !== "requests"} className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard label="همه درخواست‌ها" value={String(requests.length)} icon={<FileText className="h-5 w-5" />} />
              <StatCard label="درخواست فعال" value={String(activeCount)} icon={<Search className="h-5 w-5" />} />
              <StatCard label="اعلان خوانده‌نشده" value={String(unreadCount)} icon={<Bell className="h-5 w-5" />} />
            </div>

            <div className="mb-5 hidden flex-wrap gap-2">
              {tabItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.id} type="button" onClick={() => setTab(item.id)}
                    className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${tab === item.id ? "border-[#043873] bg-[#043873] text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
                    <Icon className="h-4 w-4" /> {item.label}
                    {item.count !== undefined && <span className={`rounded-full px-2 py-0.5 text-xs ${tab === item.id ? "bg-white/15" : "bg-slate-100"}`}>{item.count}</span>}
                  </button>
                );
              })}
              <button type="button" onClick={() => profile && user && void runAction("refresh", async () => { await refreshData(profile, user); setActionMessage("اطلاعات به‌روز شد."); })}
                disabled={busyId !== null}
                className="mr-auto inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                {busyId === "refresh" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ChevronLeft className="h-4 w-4 rotate-180" />} به‌روزرسانی
              </button>
            </div>

            {actionMessage && <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{actionMessage}</div>}
            {actionError && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{actionError}</div>}

            {tab === "requests" && (
              <div className="space-y-3">
                {requests.length === 0 ? <EmptyState text="هنوز درخواستی ثبت نکرده‌اید." action={<Link href="/request" className="font-bold text-[#043873] underline">ثبت درخواست جدید</Link>} /> : <><div className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 xl:grid-cols-3"><input aria-label="جست‌وجوی درخواست" value={requestSearch} onChange={(event) => setRequestSearch(event.target.value)} placeholder="کد، شهر یا توضیحات..." className={inputClass} /><input aria-label="شهر درخواست" value={requestCityFilter} onChange={(event) => setRequestCityFilter(event.target.value)} placeholder="شهر" className={inputClass} /><select aria-label="نوع معامله درخواست" value={requestTransactionFilter} onChange={(event) => setRequestTransactionFilter(event.target.value)} className={inputClass}><option value="all">همه معاملات</option>{transactionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><select aria-label="نوع ملک درخواست" value={requestTypeFilter} onChange={(event) => setRequestTypeFilter(event.target.value)} className={inputClass}><option value="all">همه انواع ملک</option>{propertyOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><input aria-label="حداقل بودجه درخواست" type="number" min="0" value={requestBudgetMin} onChange={(event) => setRequestBudgetMin(event.target.value)} placeholder="حداقل بودجه" className={inputClass} /><input aria-label="حداکثر بودجه درخواست" type="number" min="0" value={requestBudgetMax} onChange={(event) => setRequestBudgetMax(event.target.value)} placeholder="حداکثر بودجه" className={inputClass} /><select aria-label="وضعیت درخواست" value={requestStatusFilter} onChange={(event) => setRequestStatusFilter(event.target.value)} className={inputClass}><option value="all">همه وضعیت‌ها</option><option value="ACTIVE">فعال</option><option value="CLOSED">بسته</option></select><div className="flex items-center justify-between gap-2 text-sm text-slate-500"><span>{filteredRequests.length} مورد</span><button type="button" onClick={resetRequestFilters} className="rounded-lg border bg-white px-3 py-2 text-xs font-semibold">پاک‌کردن فیلترها</button></div></div>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full min-w-[1000px] text-right text-sm"><thead className="bg-slate-100"><tr><th className="p-3">نیاز ملکی</th><th className="p-3">شهر و بودجه</th><th className="p-3">توضیحات</th><th className="p-3">وضعیت / تاریخ</th><th className="p-3">عملیات</th></tr></thead><tbody>{filteredRequests.map((request) => (
                    <tr key={request.id} className="border-t border-slate-200 align-top">
                      {editingId === request.id ? <td colSpan={5} className="p-4"><div className="space-y-4"><h3 className="font-bold">ویرایش درخواست</h3><div className="grid gap-3 sm:grid-cols-2">
                        <label className="space-y-1 text-sm font-medium">نوع معامله<select className={inputClass} value={editValues.transactionType} onChange={(e) => setEditValues((s) => ({ ...s, transactionType: e.target.value as CustomerRequestTransactionType }))}>{transactionOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
                        <label className="space-y-1 text-sm font-medium">نوع ملک<select className={inputClass} value={editValues.propertyType} onChange={(e) => setEditValues((s) => ({ ...s, propertyType: e.target.value as CustomerRequestPropertyType }))}>{propertyOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
                        <label className="space-y-1 text-sm font-medium">شهر<input className={inputClass} value={editValues.city} onChange={(e) => setEditValues((s) => ({ ...s, city: e.target.value }))} required /></label>
                        <label className="space-y-1 text-sm font-medium">بودجه (تومان)<input className={inputClass} type="number" min="0" value={editValues.budget} onChange={(e) => setEditValues((s) => ({ ...s, budget: e.target.value }))} /></label>
                      </div><label className="block space-y-1 text-sm font-medium">توضیحات<textarea className={inputClass} rows={3} value={editValues.description} onChange={(e) => setEditValues((s) => ({ ...s, description: e.target.value }))} /></label><div className="flex gap-2"><button type="button" disabled={busyId === request.id} onClick={() => void saveEdit(request.id)} className="inline-flex items-center gap-2 rounded-lg bg-[#043873] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"><Save className="h-4 w-4" /> ذخیره</button><button type="button" onClick={() => setEditingId(null)} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold"><X className="h-4 w-4" /> انصراف</button></div></div></td> : <>
                        <td className="p-3"><p className="font-bold">{transactionLabel(request.transactionType)} {propertyLabel(request.propertyType)}</p><p className="mt-1 break-all font-mono text-xs text-slate-400" dir="ltr">{request.id}</p></td>
                        <td className="p-3"><p>{request.city}</p><p className="mt-1 font-semibold">{money(request.budget)}</p></td>
                        <td className="max-w-sm whitespace-pre-wrap p-3 leading-6 text-slate-600">{request.description || "بدون توضیحات"}</td>
                        <td className="p-3"><StatusChip status={request.status} /><p className="mt-2 whitespace-nowrap text-xs text-slate-500">{prettyDate(request.createdAt)}</p></td>
                        <td className="p-3">{request.status === "ACTIVE" && <div className="flex flex-col items-start gap-2"><button type="button" onClick={() => startEdit(request)} className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50"><Edit3 className="h-4 w-4" /> ویرایش</button><button type="button" disabled={busyId === request.id} onClick={() => void runAction(request.id, async () => { await closeCustomerSearchRequest(profile!.id, request.id); setActionMessage("درخواست بسته شد."); })} className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"><X className="h-4 w-4" /> بستن درخواست</button></div>}</td>
                      </>}
                    </tr>
                  ))}</tbody></table></div>
              </div>
            )}

            {tab === "favorites" && (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">{favorites.length === 0 ? <div className="p-6"><EmptyState text="هنوز ملکی به علاقه‌مندی‌ها اضافه نکرده‌اید." action={<Link href="/search" className="font-bold text-[#043873] underline">جست‌وجوی ملک</Link>} /></div> : <table className="w-full min-w-[850px] text-right text-sm"><thead className="bg-slate-100"><tr><th className="p-3">ملک</th><th className="p-3">مشخصات</th><th className="p-3">قیمت</th><th className="p-3">عملیات</th></tr></thead><tbody>{favorites.map((favorite) => <tr key={favorite.id} className="border-t border-slate-200 align-top"><td className="p-3"><p className="font-bold">{favorite.property ? `${propertyLabel(favorite.property.propertyType)} در ${favorite.property.city}` : "آگهی غیرفعال"}</p><p className="mt-1 break-all font-mono text-xs text-slate-400" dir="ltr">{favorite.propertyId}</p></td><td className="p-3">{favorite.property ? <p>{favorite.property.district} · {favorite.property.area ?? "—"} متر · {favorite.property.rooms ?? "—"} اتاق</p> : <p className="text-slate-500">این آگهی دیگر در فهرست عمومی فعال نیست.</p>}</td><td className="p-3 font-semibold text-[#043873]">{favorite.property ? money(favorite.property.listing.salePrice ?? favorite.property.listing.depositAmount ?? favorite.property.listing.rentAmount) : "—"}</td><td className="p-3"><div className="flex flex-wrap gap-2">{favorite.property && <Link href={`/property/${encodeURIComponent(favorite.propertyId)}`} className="whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-semibold text-[#043873] underline">مشاهده ملک</Link>}<button type="button" disabled={busyId === favorite.propertyId} onClick={() => void runAction(favorite.propertyId, async () => { await removeCustomerFavorite(profile!.id, favorite.propertyId); setActionMessage("ملک از علاقه‌مندی‌ها حذف شد."); })} className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"><Heart className="h-4 w-4" /> حذف</button></div></td></tr>)}</tbody></table>}</div>
            )}

            {tab === "notifications" && (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">{notifications.length === 0 ? <div className="p-6"><EmptyState text="در حال حاضر اعلانی برای نمایش وجود ندارد." /></div> : <table className="w-full min-w-[850px] text-right text-sm"><thead className="bg-slate-100"><tr><th className="p-3">عنوان</th><th className="p-3">پیام</th><th className="p-3">زمان</th><th className="p-3">وضعیت</th><th className="p-3">عملیات</th></tr></thead><tbody>{notifications.map((notification) => <tr key={notification.id} className={`border-t border-slate-200 align-top ${notification.isRead ? "" : "bg-blue-50/30"}`}><td className="p-3 font-semibold">{notification.title}</td><td className="max-w-lg whitespace-pre-wrap p-3 leading-6 text-slate-600">{notification.message}</td><td className="whitespace-nowrap p-3">{prettyDate(notification.createdAt)}</td><td className="p-3">{notification.isRead ? "خوانده‌شده" : "خوانده‌نشده"}</td><td className="p-3">{!notification.isRead && <button type="button" disabled={busyId === notification.id} onClick={() => void runAction(notification.id, async () => { await markUserNotificationAsRead(notification.id); setActionMessage("اعلان خوانده‌شده علامت خورد."); })} className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-60"><Check className="h-4 w-4" /> خوانده شد</button>}</td></tr>)}</tbody></table>}</div>
            )}

            {tab === "profile" && profile && (
              <section className="max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <h2 className="text-lg font-bold">اطلاعات حساب</h2>
                <p className="mt-2 text-sm text-slate-600">شماره موبایل حساب: <span dir="ltr" className="font-semibold">{profile.user.mobile}</span></p>
                <form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); void runAction("profile", async () => { const updated = await updateCustomerProfile(profile.id, { firstName: firstName.trim(), lastName: lastName.trim() }); setProfile((current) => current ? { ...current, firstName: updated.firstName, lastName: updated.lastName } : current); setActionMessage("اطلاعات پروفایل ذخیره شد."); }); }}>
                  <label className="block space-y-1 text-sm font-medium">نام
                    <input className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                  </label>
                  <label className="block space-y-1 text-sm font-medium">نام خانوادگی
                    <input className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                  </label>
                  <button type="submit" disabled={busyId === "profile"} className="inline-flex items-center gap-2 rounded-xl bg-[#043873] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"><Save className="h-4 w-4" /> ذخیره تغییرات</button>
                </form>
                <p className="mt-6 rounded-xl bg-slate-50 p-3 text-xs leading-6 text-slate-500">تغییر رمز عبور به API مستقلی نیاز دارد که در نسخهٔ فعلی بک‌اند وجود ندارد؛ از افزودن فرم غیرعملی خودداری کرده‌ایم.</p>
              </section>
            )}
          </>
        )}
      </section>
      </div>
    </main>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#043873]">{icon}</div><div><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-black tabular-nums">{value}</p></div></div>;
}
function EmptyState({ text, action }: { text: string; action?: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center"><p className="text-sm leading-7 text-slate-600">{text}</p>{action && <div className="mt-3">{action}</div>}</div>;
}
function StatusChip({ status }: { status: string }) {
  const label = status === "ACTIVE" ? "فعال" : status === "CLOSED" ? "بسته‌شده" : status;
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{label}</span>;
}
