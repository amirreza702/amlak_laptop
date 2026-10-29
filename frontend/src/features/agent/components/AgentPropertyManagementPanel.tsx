"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { LoaderCircle, RefreshCw, Search } from "lucide-react";
import { agentApiRequest } from "../api/agentApi";
import { AgentPrivateNoteEditor } from "./AgentPrivateNoteEditor";
import { useAgentPrivateNotes } from "../hooks/useAgentPrivateNotes";

type PropertyRecord = {
  propertyId: string;
  status: "ACTIVE" | "REVOKED";
  approvedByOwner: boolean;
  approvedAt: string | null;
  registeredAt: string;
  isFirstRegistrant: boolean;
  property: {
    id: string;
    propertyType: string;
    city: string;
    district: string;
    area: number | null;
    rooms: number | null;
    isActive: boolean;
    createdAt: string;
    confirmUntil: string | null;
    listing: { status: string; transactionType: string; publishedAt: string | null } | null;
    owners: { ownerId: string; share: number; isPrimary: boolean; verificationStatus: string; owner: { firstName: string; lastName: string } }[];
    verificationCases: { status: string; createdAt: string; reviewedAt: string | null }[];
  };
};
type Pagination = { total: number; limit: number; offset: number };

const propertyLabels: Record<string, string> = {
  APARTMENT: "آپارتمان", HOUSE: "خانه", VILLA: "ویلا", LAND: "زمین",
  SHOP: "مغازه", OFFICE: "اداری", GARDEN: "باغ",
};
const listingLabels: Record<string, string> = {
  DRAFT: "پیش‌نویس", PENDING_OWNER_APPROVAL: "در انتظار تأیید مالک",
  PENDING_HASHTI_VERIFICATION: "در انتظار تأیید هشتی", PUBLISHED: "منتشرشده",
  REJECTED: "ردشده", EXPIRED: "منقضی", PAUSED: "متوقف",
  SOLD: "فروخته‌شده", RENTED: "اجاره‌رفته",
};
const verificationLabels: Record<string, string> = { PENDING: "در انتظار", VERIFIED: "تأییدشده", REJECTED: "ردشده" };
const transactionLabels: Record<string, string> = { SALE: "فروش", FULL_DEPOSIT: "رهن کامل", RENT: "اجاره" };
const dateLabel = (value: string | null) => value ? new Date(value).toLocaleDateString("fa-IR") : "—";

export function AgentPropertyManagementPanel() {
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, limit: 25, offset: 0 });
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { notes, savingNoteKey, saveNote, noteError, noteMessage, refreshNotes } = useAgentPrivateNotes();

  const load = useCallback(async (offset = 0, search = appliedQuery) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: String(pagination.limit), offset: String(offset) });
      if (search.trim()) params.set("query", search.trim());
      const body = await agentApiRequest<{ properties?: PropertyRecord[]; pagination?: Pagination }>(
        "/agents/me/properties?" + params.toString()
      );
      setProperties(Array.isArray(body.properties) ? body.properties : []);
      setPagination((current) => ({ ...current, ...(body.pagination ?? {}), offset }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "دریافت رکوردهای املاک مشاور ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }, [appliedQuery, pagination.limit]);

  useEffect(() => { void load(0); }, [load]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAppliedQuery(query.trim());
  };

  return (
    <section dir="rtl" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">مدیریت املاک و یادداشت‌های خصوصی</h2>
          <p className="mt-1 text-sm leading-7 text-slate-600">هر ردیف یک رکورد واقعی ملک مرتبط با این مشاور است. یادداشت خصوصی به شناسه ثابت همان ملک متصل می‌شود.</p>
        </div>
        <button type="button" onClick={() => { void load(pagination.offset); void refreshNotes(); }} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} تازه‌سازی
        </button>
      </div>
      <form onSubmit={submitSearch} className="flex flex-wrap gap-2">
        <input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={200} placeholder="جست‌وجو با شناسه، شهر، محله یا نشانی" className="min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-[#043873] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Search className="h-4 w-4" /> جست‌وجو</button>
      </form>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {noteError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{noteError}</p>}
      {noteMessage && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{noteMessage}</p>}
      {loading && properties.length === 0 ? <p className="flex items-center gap-2 py-4 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" /> در حال دریافت رکوردها...</p> : properties.length === 0 ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">رکورد ملکی مرتبطی برای این مشاور پیدا نشد.</p> : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[1250px] text-right text-sm">
            <thead className="bg-slate-100"><tr><th className="p-3">رکورد ملک</th><th className="p-3">وضعیت آگهی</th><th className="p-3">مالکیت</th><th className="p-3">تأییدها</th><th className="p-3">ارتباط مشاور</th><th className="p-3">یادداشت خصوصی ملک</th></tr></thead>
            <tbody>{properties.map((record) => {
              const property = record.property;
              const latestCase = property.verificationCases[0];
              return (
                <tr key={property.id} className="border-t border-slate-200 align-top">
                  <td className="p-3">
                    <p className="font-bold">{propertyLabels[property.propertyType] ?? property.propertyType} در {property.city}، {property.district}</p>
                    <p className="mt-1 text-xs text-slate-600">{property.area ? `${property.area} مترمربع` : "متراژ نامشخص"}{property.rooms !== null ? ` · ${property.rooms} اتاق` : ""}</p>
                    <p className="mt-2 break-all font-mono text-xs text-slate-500" dir="ltr">{property.id}</p>
                    <p className="mt-1 text-xs text-slate-500">ثبت ملک: {dateLabel(property.createdAt)}</p>
                    {!property.isActive && <span className="mt-2 inline-block rounded bg-slate-200 px-2 py-1 text-xs">ملک غیرفعال</span>}
                  </td>
                  <td className="p-3">
                    <p>{property.listing ? (listingLabels[property.listing.status] ?? property.listing.status) : "آگهی ثبت نشده"}</p>
                    {property.listing && <p className="mt-1 text-xs text-slate-600">{transactionLabels[property.listing.transactionType] ?? property.listing.transactionType}</p>}
                    <p className="mt-2 text-xs text-slate-500">مهلت تأیید: {dateLabel(property.confirmUntil)}</p>
                  </td>
                  <td className="p-3">
                    {property.owners.length ? <div className="min-w-[190px] space-y-2">{property.owners.map((owner) => <div key={owner.ownerId} className="border-b border-slate-100 pb-2 last:border-0"><p className="font-semibold">{owner.owner.firstName} {owner.owner.lastName}{owner.isPrimary ? " · اصلی" : ""}</p><p className="mt-1 text-xs text-slate-600">سهم {owner.share} دانگ · {verificationLabels[owner.verificationStatus] ?? owner.verificationStatus}</p></div>)}</div> : <span className="text-slate-500">مالک مرتبط ثبت نشده</span>}
                  </td>
                  <td className="p-3">
                    <p>پرونده هشتی: {latestCase ? (verificationLabels[latestCase.status] ?? latestCase.status) : "تشکیل نشده"}</p>
                    {latestCase && <p className="mt-1 text-xs text-slate-500">تاریخ پرونده: {dateLabel(latestCase.createdAt)}</p>}
                  </td>
                  <td className="p-3">
                    <p>{record.status === "ACTIVE" ? "ارتباط فعال" : "ارتباط خاتمه‌یافته"}</p>
                    <p className="mt-1 text-xs text-slate-600">{record.approvedByOwner ? "تأیید مالک دارد" : "در انتظار تأیید مالک"}</p>
                    <p className="mt-1 text-xs text-slate-500">ثبت ارتباط: {dateLabel(record.registeredAt)}</p>
                    {record.isFirstRegistrant && <span className="mt-2 inline-block rounded bg-blue-50 px-2 py-1 text-xs text-blue-800">ثبت‌کننده نخست</span>}
                  </td>
                  <td className="p-3"><AgentPrivateNoteEditor entityType="property" entityId={property.id} notes={notes} saving={savingNoteKey === `property:${property.id}`} onSave={saveNote} /></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-slate-500">تعداد رکوردها: {pagination.total.toLocaleString("fa-IR")}</span>
        <div className="flex gap-2">
          <button type="button" disabled={loading || pagination.offset === 0} onClick={() => void load(Math.max(0, pagination.offset - pagination.limit))} className="rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-40">قبلی</button>
          <button type="button" disabled={loading || pagination.offset + pagination.limit >= pagination.total} onClick={() => void load(pagination.offset + pagination.limit)} className="rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-40">بعدی</button>
        </div>
      </div>
    </section>
  );
}
