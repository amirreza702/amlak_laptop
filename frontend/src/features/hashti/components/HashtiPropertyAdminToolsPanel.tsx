"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, ChevronDown, LoaderCircle, RefreshCw, Search, TimerReset, UserPlus } from "lucide-react";
import { Modal } from "@/shared/components/Modal";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(API_URL + path, {
    credentials: "include",
    cache: "no-store",
    ...init,
  });
  const body = await response.json().catch(() => ({})) as { message?: string };
  if (!response.ok) {
    if (body.message === "Authentication required") throw new Error("برای انجام عملیات دوباره وارد شوید.");
    throw new Error(body.message || "درخواست ناموفق بود.");
  }
  return body as T;
}

type HashtiPropertyRecord = {
  id: string;
  propertyType: string;
  registrationSource: string;
  city: string;
  district: string;
  address: string;
  postalCode: string | null;
  area: number | null;
  rooms: number | null;
  isActive: boolean;
  createdAt: string;
  confirmUntil: string | null;
  listing: { status: string; transactionType: string; publishedAt: string | null; expiredAt: string | null } | null;
  owners: { ownerId: string; share: number; isPrimary: boolean; verificationStatus: string; owner: { firstName: string; lastName: string } }[];
  agents: { agentId: string; status: string; approvedByOwner: boolean; approvedAt: string | null; isFirstRegistrant: boolean; agent: { firstName: string; lastName: string } }[];
  verificationCases: { id: string; status: string; notes: string | null; createdAt: string; reviewedAt: string | null }[];
};
type Pagination = { total: number; limit: number; offset: number };

const propertyLabels: Record<string, string> = { APARTMENT: "آپارتمان", HOUSE: "خانه", VILLA: "ویلا", LAND: "زمین", SHOP: "مغازه", OFFICE: "اداری", GARDEN: "باغ" };
const listingLabels: Record<string, string> = { DRAFT: "پیش‌نویس", PENDING_OWNER_APPROVAL: "در انتظار تأیید مالک", PENDING_HASHTI_VERIFICATION: "در انتظار تأیید هشتی", PUBLISHED: "منتشرشده", REJECTED: "ردشده", EXPIRED: "منقضی", PAUSED: "متوقف", SOLD: "فروخته‌شده", RENTED: "اجاره‌رفته" };
const verificationLabels: Record<string, string> = { PENDING: "در انتظار", VERIFIED: "تأییدشده", REJECTED: "ردشده" };
const transactionLabels: Record<string, string> = { SALE: "فروش", FULL_DEPOSIT: "رهن کامل", RENT: "اجاره" };
const statusOptions = [
  { value: "ALL", label: "همه وضعیت‌ها" },
  { value: "DRAFT", label: "پیش‌نویس" },
  { value: "PENDING_OWNER_APPROVAL", label: "در انتظار تأیید مالک" },
  { value: "PENDING_HASHTI_VERIFICATION", label: "در انتظار تأیید هشتی" },
  { value: "PUBLISHED", label: "منتشرشده" },
  { value: "REJECTED", label: "ردشده" },
  { value: "EXPIRED", label: "منقضی" },
  { value: "PAUSED", label: "متوقف" },
  { value: "SOLD", label: "فروخته‌شده" },
  { value: "RENTED", label: "اجاره‌رفته" },
];
const dateLabel = (value: string | null) => value ? new Date(value).toLocaleDateString("fa-IR") : "—";

/** همه عملیات مدیریت ملک در ردیف همان رکورد قرار دارند؛ APIهای فعلی مالکیت و انقضا حفظ شده‌اند. */
export function HashtiPropertyAdminToolsPanel() {
  const [properties, setProperties] = useState<HashtiPropertyRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, limit: 25, offset: 0 });
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [listingStatus, setListingStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [ownerFormFor, setOwnerFormFor] = useState<string | null>(null);
  const [expireConfirmFor, setExpireConfirmFor] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState("");
  const [share, setShare] = useState("6");
  const [isPrimary, setIsPrimary] = useState(false);
  const [busyOwnerPropertyId, setBusyOwnerPropertyId] = useState<string | null>(null);
  const [busyExpireId, setBusyExpireId] = useState<string | null>(null);

  const load = useCallback(async (offset = 0) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: String(pagination.limit), offset: String(offset), status: listingStatus });
      if (appliedQuery.trim()) params.set("query", appliedQuery.trim());
      const result = await requestJson<{ properties?: HashtiPropertyRecord[]; pagination?: Pagination }>("/hashti/properties?" + params.toString());
      setProperties(Array.isArray(result.properties) ? result.properties : []);
      setPagination((current) => ({ ...current, ...(result.pagination ?? {}), offset }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "دریافت رکوردهای املاک ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }, [appliedQuery, listingStatus, pagination.limit]);

  useEffect(() => { void Promise.resolve().then(() => load(0)); }, [load]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setAppliedQuery(query.trim());
  };

  async function addOwner(event: FormEvent, propertyId: string) {
    event.preventDefault();
    const normalizedOwnerId = ownerId.trim();
    const parsedShare = Number(share);
    if (!normalizedOwnerId) {
      setError("شناسه پروفایل مالک الزامی است.");
      return;
    }
    if (!Number.isFinite(parsedShare) || parsedShare <= 0 || parsedShare > 6) {
      setError("سهم مالکیت باید بیشتر از صفر و حداکثر ۶ دانگ باشد.");
      return;
    }

    setBusyOwnerPropertyId(propertyId);
    setError(null);
    setMessage(null);
    try {
      await requestJson("/properties/" + encodeURIComponent(propertyId) + "/owners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerId: normalizedOwnerId, share: parsedShare, isPrimary }),
      });
      setMessage("رکورد مالکیت ثبت شد؛ تاریخچه مالکیت و گزارش مدیریتی در سمت سرور حفظ می‌شوند.");
      setOwnerId("");
      setShare("6");
      setIsPrimary(false);
      setOwnerFormFor(null);
      await load(pagination.offset);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ثبت رابطه مالکیت ناموفق بود.");
    } finally {
      setBusyOwnerPropertyId(null);
    }
  }

  async function expireListing(propertyId: string) {
    setBusyExpireId(propertyId);
    setError(null);
    setMessage(null);
    try {
      const result = await requestJson<{ expired: boolean; statusChanged: boolean; listing: { status: string }; confirmUntil: string | null }>(
        "/properties/" + encodeURIComponent(propertyId) + "/expire",
        { method: "PUT" },
      );
      if (result.statusChanged) setMessage("وضعیت آگهی به منقضی تغییر کرد؛ تاریخچه موجود حفظ شد.");
      else if (result.expired) setMessage("مهلت تأیید گذشته است، اما وضعیت فعلی آگهی نیاز به تغییر نداشت.");
      else setMessage("مهلت تأیید تمام نشده یا تعیین نشده است؛ تغییری اعمال نشد.");
      setExpireConfirmFor(null);
      await load(pagination.offset);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "بررسی انقضای آگهی ناموفق بود.");
    } finally {
      setBusyExpireId(null);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">مدیریت املاک</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">هر ردیف یک رکورد ملک است؛ وضعیت آگهی، مالکیت، مشاوران و پرونده تأیید در همان ردیف نمایش داده می‌شوند. عملیات مالکیت و انقضا به همان شناسه ملک متصل‌اند.</p>
        </div>
        <button type="button" onClick={() => void load(pagination.offset)} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} تازه‌سازی
        </button>
      </div>

      <form onSubmit={submitSearch} className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_220px_auto]">
        <label className="space-y-1 text-sm"><span>جست‌وجوی رکورد ملک</span><input maxLength={200} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="شناسه، شهر، محله، نشانی یا کد پستی" className="w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        <label className="space-y-1 text-sm"><span>وضعیت آگهی</span><select value={listingStatus} onChange={(event) => setListingStatus(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2">{statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <button type="submit" disabled={loading} className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#043873] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Search className="h-4 w-4" /> جست‌وجو</button>
      </form>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      {loading && properties.length === 0 ? <p className="flex items-center gap-2 py-4 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" /> در حال دریافت رکوردهای املاک...</p> : properties.length === 0 ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">رکورد ملکی با این فیلترها پیدا نشد.</p> : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[1450px] text-right text-sm">
            <thead className="bg-slate-100"><tr><th className="p-3">رکورد ملک</th><th className="p-3">آگهی و وضعیت</th><th className="p-3">رکوردهای مالکیت</th><th className="p-3">رکوردهای مشاور</th><th className="p-3">پرونده تأیید</th><th className="p-3">عملیات رکورد</th></tr></thead>
            <tbody>{properties.map((property) => {
              const latestCase = property.verificationCases[0];
              return (
                <tr key={property.id} className="border-t border-slate-200 align-top">
                  <td className="p-3">
                    <p className="font-bold">{propertyLabels[property.propertyType] ?? property.propertyType} · {property.city}، {property.district}</p>
                    <p className="mt-1 max-w-xs whitespace-pre-wrap leading-6 text-slate-600">{property.address}</p>
                    <p className="mt-2 text-xs text-slate-600">{property.area ? property.area + " مترمربع" : "متراژ نامشخص"}{property.rooms !== null ? " · " + property.rooms + " اتاق" : ""}</p>
                    <p className="mt-2 break-all font-mono text-xs text-slate-500" dir="ltr">{property.id}</p>
                    {property.postalCode && <p className="mt-1 text-xs text-slate-500">کد پستی: <span dir="ltr">{property.postalCode}</span></p>}
                    <p className="mt-1 text-xs text-slate-500">منبع ثبت: {property.registrationSource === "AGENT" ? "مشاور" : property.registrationSource === "OWNER" ? "مالک" : "هشتی"} · {dateLabel(property.createdAt)}</p>
                    {!property.isActive && <span className="mt-2 inline-block rounded bg-slate-200 px-2 py-1 text-xs">ملک غیرفعال</span>}
                  </td>
                  <td className="p-3">
                    <p className="font-semibold">{property.listing ? listingLabels[property.listing.status] ?? property.listing.status : "آگهی ندارد"}</p>
                    {property.listing && <p className="mt-1 text-xs text-slate-600">{transactionLabels[property.listing.transactionType] ?? property.listing.transactionType}</p>}
                    <p className="mt-2 text-xs text-slate-500">مهلت تأیید: {dateLabel(property.confirmUntil)}</p>
                    <p className="mt-1 text-xs text-slate-500">انتشار: {dateLabel(property.listing?.publishedAt ?? null)}</p>
                    {property.listing?.expiredAt && <p className="mt-1 text-xs text-slate-500">انقضا: {dateLabel(property.listing.expiredAt)}</p>}
                  </td>
                  <td className="p-3">
                    {property.owners.length ? <div className="min-w-[220px] space-y-3">{property.owners.map((owner) => <div key={owner.ownerId} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0"><p className="font-semibold">{owner.owner.firstName} {owner.owner.lastName}{owner.isPrimary ? " · اصلی" : ""}</p><p className="mt-1 text-xs text-slate-600">سهم: {owner.share} دانگ · {verificationLabels[owner.verificationStatus] ?? owner.verificationStatus}</p><p className="mt-1 break-all font-mono text-xs text-slate-400" dir="ltr">{owner.ownerId}</p></div>)}</div> : <span className="text-slate-500">مالک مرتبط ثبت نشده</span>}
                  </td>
                  <td className="p-3">
                    {property.agents.length ? <div className="min-w-[200px] space-y-3">{property.agents.map((agent) => <div key={agent.agentId} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0"><p className="font-semibold">{agent.agent.firstName} {agent.agent.lastName}</p><p className="mt-1 text-xs text-slate-600">{agent.status === "ACTIVE" ? "ارتباط فعال" : "ارتباط خاتمه‌یافته"} · {agent.approvedByOwner ? "تأیید مالک" : "بدون تأیید مالک"}</p><p className="mt-1 break-all font-mono text-xs text-slate-400" dir="ltr">{agent.agentId}</p></div>)}</div> : <span className="text-slate-500">مشاور مرتبط ثبت نشده</span>}
                  </td>
                  <td className="p-3">
                    {latestCase ? <div className="min-w-[190px]"><p className="font-semibold">{verificationLabels[latestCase.status] ?? latestCase.status}</p><p className="mt-1 break-all font-mono text-xs text-slate-500" dir="ltr">{latestCase.id}</p><p className="mt-1 text-xs text-slate-500">ثبت: {dateLabel(latestCase.createdAt)} · بررسی: {dateLabel(latestCase.reviewedAt)}</p>{latestCase.notes && <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-slate-600">{latestCase.notes}</p>}</div> : <span className="text-slate-500">پرونده‌ای ثبت نشده</span>}
                  </td>
                  <td className="p-3">
                    <div className="flex min-w-[190px] flex-col items-start gap-2">
                      <button type="button" onClick={() => { setOwnerFormFor(ownerFormFor === property.id ? null : property.id); setOwnerId(""); setError(null); }} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold"><UserPlus className="h-4 w-4" /> افزودن مالک به این ملک <ChevronDown className="h-3 w-3" /></button>
                      {property.listing && property.listing.status === "PUBLISHED" && <button type="button" onClick={() => setExpireConfirmFor(property.id)} disabled={busyExpireId === property.id} className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 disabled:opacity-50">{busyExpireId === property.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <TimerReset className="h-4 w-4" />} بررسی انقضای آگهی</button>}
                      {ownerFormFor === property.id && <Modal open={ownerFormFor === property.id} title="افزودن مالک به ملک" description={"شناسه ملک: " + property.id} onClose={() => setOwnerFormFor(null)}><form onSubmit={(event) => void addOwner(event, property.id)} className="space-y-4">
                        <label className="block space-y-1 text-xs"><span>شناسه پروفایل مالک</span><input required maxLength={200} value={ownerId} onChange={(event) => setOwnerId(event.target.value)} className="w-full rounded border border-slate-300 bg-white px-2 py-1.5" dir="ltr" /></label>
                        <label className="block space-y-1 text-xs"><span>سهم مالکیت (دانگ)</span><input required type="number" min="0.01" max="6" step="0.01" value={share} onChange={(event) => setShare(event.target.value)} className="w-full rounded border border-slate-300 bg-white px-2 py-1.5" dir="ltr" /></label>
                        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={isPrimary} onChange={(event) => setIsPrimary(event.target.checked)} className="h-4 w-4" /> مالک اصلی</label>
                        <button type="submit" disabled={busyOwnerPropertyId === property.id} className="inline-flex w-full items-center justify-center gap-2 rounded bg-[#043873] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{busyOwnerPropertyId === property.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} ثبت مالکیت</button>
                      </form></Modal>}
                    </div>
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}

      <Modal open={Boolean(expireConfirmFor)} title="بررسی انقضای آگهی" description="این عملیات وضعیت آگهی را بر اساس مهلت تأیید بررسی می‌کند. در صورت لزوم وضعیت به منقضی تغییر می‌کند." onClose={() => setExpireConfirmFor(null)}>
        {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" onClick={() => setExpireConfirmFor(null)} className="rounded-lg border px-4 py-2.5 text-sm">انصراف</button><button type="button" disabled={!expireConfirmFor || busyExpireId === expireConfirmFor} onClick={() => { if (expireConfirmFor) void expireListing(expireConfirmFor); }} className="rounded-lg bg-amber-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busyExpireId ? "در حال بررسی..." : "تأیید و بررسی"}</button></div>
      </Modal>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-slate-500">تعداد رکوردها: {pagination.total.toLocaleString("fa-IR")}</span>
        <div className="flex gap-2">
          <button type="button" disabled={loading || pagination.offset === 0} onClick={() => void load(Math.max(0, pagination.offset - pagination.limit))} className="rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-40">قبلی</button>
          <button type="button" disabled={loading || pagination.offset + pagination.limit >= pagination.total} onClick={() => void load(pagination.offset + pagination.limit)} className="rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-40">بعدی</button>
        </div>
      </div>
    </section>
  );
}
