"use client";


import { RecordDetailsRow } from "@/shared/components/RecordDetailsRow";
import { useState, type FormEvent, type ReactNode } from "react";
import { BadgeCheck, Contact, FileText, LoaderCircle, RefreshCw, Save, ShieldAlert, UserRound } from "lucide-react";
import type { UserPublic } from "@/features/auth/api/authApi";
import { UserNotificationsPanel } from "@/shared/components/UserNotificationsPanel";
import { PropertyRegistrationPanel } from "@/features/property/components/PropertyRegistrationPanel";
import { OwnerAgentRequestsPanel } from "./OwnerAgentRequestsPanel";
import { AgentCreateSearchRequestPanel } from "./AgentCreateSearchRequestPanel";
import { useAgentDashboard } from "../hooks/useAgentDashboard";
import { PersianDatePicker } from "@/shared/components/PersianDatePicker";
import { AgentPropertyManagementPanel } from "./AgentPropertyManagementPanel";
import { AgentPrivateNoteEditor } from "./AgentPrivateNoteEditor";
import { agentApiRequest } from "../api/agentApi";
import { Modal } from "@/shared/components/Modal";


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
const requestTransactionOptions = [{value:"SALE",label:"خرید"},{value:"FULL_DEPOSIT",label:"رهن کامل"},{value:"RENT",label:"اجاره"}] as const;
const requestPropertyOptions = [{value:"APARTMENT",label:"آپارتمان"},{value:"HOUSE",label:"خانه"},{value:"VILLA",label:"ویلا"},{value:"LAND",label:"زمین"},{value:"SHOP",label:"مغازه"},{value:"OFFICE",label:"اداری"},{value:"GARDEN",label:"باغ"}] as const;

export function AgentDashboard({ user, onToolSelected }: { user: UserPublic; onToolSelected?: () => void }) {
  const [propertyModalOpen, setPropertyModalOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const {
    selectedTool, setSelectedTool,
    profileId, profileState, profileError, profileReviewNotes,
    firstName, setFirstName, lastName, setLastName,
    agencyName, setAgencyName, address, setAddress,
    isSavingProfile, profileSaveMessage, profileSaveError,
    requests, loadingRequests, requestsError,
    privateNotes, savingNoteKey, saveNote, noteError, noteMessage,
    visibleRequests,
    requestSearch, setRequestSearch,
    requestTransaction, setRequestTransaction,
    requestPropertyType, setRequestPropertyType,
    requestCity, setRequestCity,
    budgetMin, setBudgetMin,
    budgetMax, setBudgetMax,
    requestFrom, setRequestFrom,
    requestTo, setRequestTo,
    resetRequestFilters,
    loadRequests, saveProfile,
  } = useAgentDashboard(user);
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [editingRequestCity, setEditingRequestCity] = useState("");
  const [editingRequestTransaction, setEditingRequestTransaction] = useState<"SALE" | "FULL_DEPOSIT" | "RENT">("SALE");
  const [editingRequestPropertyType, setEditingRequestPropertyType] = useState<"APARTMENT" | "HOUSE" | "VILLA" | "LAND" | "SHOP" | "OFFICE" | "GARDEN">("APARTMENT");
  const [editingRequestDescription, setEditingRequestDescription] = useState("");
  const [editingRequestBudget, setEditingRequestBudget] = useState("");
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(null);
  const [recordActionError, setRecordActionError] = useState<string | null>(null);
  const [recordActionMessage, setRecordActionMessage] = useState<string | null>(null);

  const openRequestEditor = (request: { id: string; city: string; transactionType: string; propertyType: string; description: string | null; budget: string | number | null }) => {
    setEditingRequestId(request.id);
    setEditingRequestCity(request.city);
    setEditingRequestTransaction(request.transactionType as "SALE" | "FULL_DEPOSIT" | "RENT");
    setEditingRequestPropertyType(request.propertyType as "APARTMENT" | "HOUSE" | "VILLA" | "LAND" | "SHOP" | "OFFICE" | "GARDEN");
    setEditingRequestDescription(request.description ?? "");
    setEditingRequestBudget(request.budget == null ? "" : String(request.budget));
    setRecordActionError(null);
    setRecordActionMessage(null);
  };

  const saveRequestEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingRequestId) return;
    const city = editingRequestCity.trim();
    const budget = Number(editingRequestBudget);
    if (!city) { setRecordActionError("شهر درخواست الزامی است."); return; }
    if (!editingRequestBudget.trim() || !Number.isFinite(budget) || budget < 0) { setRecordActionError("بودجه باید عددی معتبر و صفر یا بیشتر باشد."); return; }
    setRecordActionError(null);
    try {
      await agentApiRequest(`/agents/me/search-requests/${encodeURIComponent(editingRequestId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionType: editingRequestTransaction, propertyType: editingRequestPropertyType, city, description: editingRequestDescription.trim(), budget }),
      });
      setEditingRequestId(null);
      setRecordActionMessage("درخواست با موفقیت ویرایش شد.");
      await loadRequests();
    } catch (error) {
      setRecordActionError(error instanceof Error ? error.message : "ویرایش درخواست ناموفق بود.");
    }
  };

  const deleteRequest = async () => {
    if (!deletingRequestId) return;
    setRecordActionError(null);
    try {
      await agentApiRequest(`/agents/me/search-requests/${encodeURIComponent(deletingRequestId)}`, { method: "DELETE" });
      setDeletingRequestId(null);
      setRecordActionMessage("درخواست با موفقیت حذف شد.");
      await loadRequests();
    } catch (error) {
      setRecordActionError(error instanceof Error ? error.message : "حذف درخواست ناموفق بود.");
    }
  };

  return (
    <div dir="rtl" className="mx-auto grid min-h-[calc(100vh-7rem)] w-full max-w-none grid-cols-1 gap-4 bg-slate-50 px-3 pt-20 pb-4 text-slate-900 sm:px-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-6">
      <aside aria-label="ابزارهای پنل مشاور" className="h-fit min-w-0 rounded-xl border border-slate-200 bg-white p-3 lg:sticky lg:top-24">
        <h2 className="px-3 pb-2 pt-1 text-sm font-bold text-slate-500">پنل مشاور</h2>
        <nav className="flex gap-2 overflow-x-auto lg:flex-col" aria-label="ابزارهای مشاور">
          {[["profile", "پروفایل"], ["property-management", "مدیریت املاک"], ["owner-management", "مدیریت مالکان"], ["requests", "مدیریت مشتریان"], ["notifications", "اعلان‌ها"]].map(([target, label]) => (
            <button key={target} type="button" title={label} aria-current={selectedTool === target ? "page" : undefined} onClick={() => { setSelectedTool(target); onToolSelected?.(); }} className={`flex min-h-11 shrink-0 items-center justify-center rounded-lg border px-3 py-2 text-right text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#043873] lg:w-full ${selectedTool === target ? "border-[#043873] bg-blue-50 text-[#043873]" : "border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-[#043873]"}`}>{label}</button>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 w-full space-y-5">
      {profileState === "checking" && selectedTool === "profile" && (
        <section className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600"><LoaderCircle className="h-5 w-5 animate-spin" />در حال بررسی تأیید حساب مشاور...</section>
      )}

      {(profileState === "pending" || profileState === "rejected" || profileState === "unknown" || profileState === "error") && selectedTool === "profile" && (
        <section className={`rounded-xl border p-5 ${profileState === "rejected" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
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

      {profileState === "verified" && selectedTool === "property-management" && <>
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div><h2 className="text-lg font-bold">مدیریت املاک</h2><p className="mt-1 text-sm text-slate-600">رکوردهای ملک مرتبط با حساب مشاور را مدیریت کنید.</p></div>
          <button type="button" onClick={() => setPropertyModalOpen(true)} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#043873] px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-900">ایجاد ملک جدید</button>
        </section>
        <AgentPropertyManagementPanel notes={privateNotes} savingNoteKey={savingNoteKey} saveNote={saveNote} noteError={noteError} noteMessage={noteMessage} />
        <Modal open={propertyModalOpen} title="ایجاد ملک جدید" description="مشخصات ملک و اطلاعات معامله را وارد کنید." onClose={() => setPropertyModalOpen(false)} size="full">
          <PropertyRegistrationPanel mode="agent" onSavePrivateNote={async (propertyId, note) => { if (!(await saveNote("property", propertyId, note))) throw new Error("ذخیره یادداشت خصوصی ملک ناموفق بود."); }} />
        </Modal>
      </>}
            {profileState === "verified" && (
        <section hidden={selectedTool !== "profile"} className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-7 text-emerald-900">
          <h2 className="font-bold">حساب مشاور تأیید شده است</h2>
          <p className="mt-2">امکانات پنل بر اساس وضعیت حساب و سطح دسترسی شما نمایش داده می‌شود.</p>
        </section>
      )}

      {profileState === "verified" && (
        <>
          <div hidden={selectedTool !== "requests"} className="grid gap-3 sm:grid-cols-3">
            <SummaryCard icon={<BadgeCheck className="h-5 w-5" />} label="وضعیت حساب" value="تأیید شده" />
            <SummaryCard icon={<FileText className="h-5 w-5" />} label="درخواست‌های فعال" value={String(requests.length)} />
            <SummaryCard icon={<Contact className="h-5 w-5" />} label="درخواست‌های دارای شماره تماس" value={String(requests.filter((request) => request.contactMobile).length)} />
          </div>

          <section hidden={selectedTool !== "profile"} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
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

          <section hidden={selectedTool !== "requests"} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">مدیریت مشتریان و درخواست‌ها</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">شماره تماس ثبت‌کننده مستقیماً در رکورد هر درخواست نمایش داده می‌شود.</p>
              </div>
              <button type="button" onClick={() => setCustomerModalOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-[#043873] px-3 py-2 text-sm font-bold text-white">ایجاد مشتری جدید</button>
              <button type="button" onClick={() => void loadRequests()} disabled={loadingRequests} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50">
                {loadingRequests ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} به‌روزرسانی
              </button>
            </div>
            {requestsError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{requestsError}</p>}
            {noteError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{noteError}</p>}
            {noteMessage && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{noteMessage}</p>}
            {!loadingRequests && requests.length > 0 && <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><input aria-label="جست‌وجوی متنی درخواست" value={requestSearch} onChange={(event) => setRequestSearch(event.target.value)} placeholder="کد یا توضیحات درخواست..." className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#043873]" /><input aria-label="شهر" value={requestCity} onChange={(event) => setRequestCity(event.target.value)} placeholder="شهر" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm" /><select aria-label="نوع معامله" value={requestTransaction} onChange={(event) => setRequestTransaction(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="all">همهٔ معاملات</option><option value="SALE">خرید</option><option value="FULL_DEPOSIT">رهن کامل</option><option value="RENT">اجاره</option></select><select aria-label="نوع ملک" value={requestPropertyType} onChange={(event) => setRequestPropertyType(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="all">همهٔ انواع ملک</option><option value="APARTMENT">آپارتمان</option><option value="HOUSE">خانه</option><option value="VILLA">ویلا</option><option value="LAND">زمین</option><option value="SHOP">مغازه</option><option value="OFFICE">اداری</option><option value="GARDEN">باغ</option></select><input aria-label="حداقل بودجه" type="number" min="0" value={budgetMin} onChange={(event) => setBudgetMin(event.target.value)} placeholder="حداقل بودجه (تومان)" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm" /><input aria-label="حداکثر بودجه" type="number" min="0" value={budgetMax} onChange={(event) => setBudgetMax(event.target.value)} placeholder="حداکثر بودجه (تومان)" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm" /><div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><PersianDatePicker label="از تاریخ ایجاد" value={requestFrom} onChange={setRequestFrom} /><PersianDatePicker label="تا تاریخ ایجاد" value={requestTo} onChange={setRequestTo} endOfDay /></div></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>{visibleRequests.length} درخواست مطابق فیلترها</span><button type="button" onClick={resetRequestFilters} className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100">پاک‌کردن فیلترها</button></div></div>}
            {loadingRequests ? (
              <div className="mt-5 flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />در حال دریافت درخواست‌ها...</div>
            ) : requests.length === 0 ? (
              <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">در حال حاضر درخواست فعالی وجود ندارد.</p>
            ) : visibleRequests.length === 0 ? (
              <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">درخواستی با این جست‌وجو و فیلتر پیدا نشد.</p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[1050px] text-right text-sm"><thead className="bg-slate-100"><tr><th className="p-3">نیاز ملکی</th><th className="p-3">بودجه / توضیحات</th><th className="p-3">ثبت‌کننده و شناسه</th><th className="p-3">اطلاعات تماس</th><th className="p-3">یادداشت خصوصی</th><th className="p-3">عملیات</th></tr></thead><tbody>{visibleRequests.map((request) => (
                  <RecordDetailsRow key={request.id} record={request} title="رکورد" className="border-t border-slate-200 align-top">
                    <td className="p-3"><p className="font-bold">{transactionName(request.transactionType)} {propertyName(request.propertyType)} در {request.city}</p></td>
                    <td className="p-3"><p>{displayMoney(request.budget)}</p>{request.description && <p className="mt-2 max-w-sm whitespace-pre-wrap leading-6 text-slate-600">{request.description}</p>}</td>
                    <td className="p-3"><p>{request.createdByRole === "AGENT" ? "مشاور املاک" : "خود مشتری"}</p><p className="mt-1 break-all font-mono text-xs text-slate-500" dir="ltr">{request.id}</p></td>
                    <td className="p-3"><div className="min-w-[180px]"><p className="font-bold">{request.contactName}</p>{request.contactMobile ? <a href={`tel:${request.contactMobile}`} dir="ltr" className="mt-1 inline-block text-[#043873] hover:underline">{request.contactMobile}</a> : <p className="mt-1 text-xs text-slate-500">شماره تماس ثبت نشده است.</p>}</div></td>
                    <td className="p-3">{request.isCreatedByMe ? <AgentPrivateNoteEditor entityType="request" entityId={request.id} notes={privateNotes} saving={savingNoteKey === `request:${request.id}`} onSave={saveNote} /> : request.customerId ? <AgentPrivateNoteEditor entityType="customer" entityId={request.customerId} notes={privateNotes} saving={savingNoteKey === `customer:${request.customerId}`} onSave={saveNote} /> : <p className="max-w-[220px] text-xs leading-6 text-slate-500">این درخواست به حساب مشتری ثبت‌شده متصل نیست.</p>}</td>
                    <td className="p-3"><div className="flex flex-col items-start gap-2">{request.isCreatedByMe && <><button type="button" onClick={() => openRequestEditor(request)} className="whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700">ویرایش درخواست من</button><button type="button" onClick={() => { setDeletingRequestId(request.id); setRecordActionError(null); }} className="whitespace-nowrap rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">حذف درخواست من</button></>}</div></td>
                  </RecordDetailsRow>
                ))}</tbody></table></div>
            )}
          </section>

          <section hidden={selectedTool !== "owner-management"}>{profileId && <OwnerAgentRequestsPanel agentId={profileId} notes={privateNotes} savingNoteKey={savingNoteKey} saveNote={saveNote} noteError={noteError} noteMessage={noteMessage} />}</section>
          

          <div className="grid gap-3 lg:grid-cols-2">
          </div>
        </>
      )}
      <div hidden={selectedTool !== "notifications"}><UserNotificationsPanel userId={user.id} /></div>
      <Modal open={customerModalOpen} title="ایجاد مشتری جدید" description="نیاز ملکی مشتری را به‌عنوان درخواست جدید ثبت کنید." onClose={() => setCustomerModalOpen(false)}>
        <AgentCreateSearchRequestPanel onCreated={() => { void loadRequests(); }} />
      </Modal>
      {recordActionMessage && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{recordActionMessage}</p>}
      <Modal open={Boolean(editingRequestId)} title="ویرایش درخواست مشتری" description="اطلاعات درخواست را اصلاح کنید." onClose={() => setEditingRequestId(null)}>
        <form onSubmit={saveRequestEdit} className="space-y-4">
          <label className="block space-y-1.5 text-sm font-semibold">نوع معامله<select value={editingRequestTransaction} onChange={event=>setEditingRequestTransaction(event.target.value as typeof editingRequestTransaction)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5">{requestTransactionOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="block space-y-1.5 text-sm font-semibold">نوع ملک<select value={editingRequestPropertyType} onChange={event=>setEditingRequestPropertyType(event.target.value as typeof editingRequestPropertyType)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5">{requestPropertyOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="block space-y-1.5 text-sm font-semibold">شهر درخواست<input required value={editingRequestCity} onChange={(event) => setEditingRequestCity(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
          <label className="block space-y-1.5 text-sm font-semibold">بودجه (تومان)<input required type="number" min="0" value={editingRequestBudget} onChange={(event) => setEditingRequestBudget(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
          <label className="block space-y-1.5 text-sm font-semibold">توضیحات<textarea rows={4} value={editingRequestDescription} onChange={(event) => setEditingRequestDescription(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
          {recordActionError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{recordActionError}</p>}
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditingRequestId(null)} className="rounded-lg border px-4 py-2.5 text-sm">انصراف</button><button type="submit" className="rounded-lg bg-[#043873] px-4 py-2.5 text-sm font-bold text-white">ذخیره تغییرات</button></div>
        </form>
      </Modal>
      <Modal open={Boolean(deletingRequestId)} title="تأیید حذف درخواست" description="این عملیات قابل بازگشت نیست. آیا از حذف این درخواست مطمئن هستید؟" onClose={() => setDeletingRequestId(null)}>
        {recordActionError && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{recordActionError}</p>}
        <div className="flex justify-end gap-2"><button type="button" onClick={() => setDeletingRequestId(null)} className="rounded-lg border px-4 py-2.5 text-sm">انصراف</button><button type="button" onClick={() => void deleteRequest()} className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-bold text-white">حذف درخواست</button></div>
      </Modal>
      </main>
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#043873]">{icon}</div><div><p className="text-sm text-slate-500">{label}</p><p className="mt-1 font-black">{value}</p></div></div>;
}
