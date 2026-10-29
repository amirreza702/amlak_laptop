"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import type { Coordinates, PropertyType, TransactionType } from "@/features/property/types/propertyRegistration";
import { LoaderCircle, RefreshCw, Search, Pencil, Trash2 } from "lucide-react";
import { Modal } from "@/shared/components/Modal";
import { agentApiRequest } from "../api/agentApi";
import { AgentPrivateNoteEditor } from "./AgentPrivateNoteEditor";
import { useAgentPrivateNotes } from "../hooks/useAgentPrivateNotes";

const PropertyLocationPicker = dynamic(() => import("@/features/property/components/PropertyLocationPicker"), {
  ssr: false,
  loading: () => <div className="flex h-72 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500">در حال بارگذاری نقشه...</div>,
});

type PropertyRecord = {
  propertyId: string;
  canManage: boolean;
  status: "ACTIVE" | "REVOKED";
  approvedByOwner: boolean;
  approvedAt: string | null;
  registeredAt: string;
  isFirstRegistrant: boolean;
  property: {
    id: string;
    registrationSource: "OWNER" | "AGENT";
    createdByUserId: string;
    propertyType: string;
    city: string;
    district: string;
    address: string;
    latitudeExact: number;
    longitudeExact: number;
    postalCode: string | null;
    area: number | null;
    rooms: number | null;
    floor: number | null;
    isActive: boolean;
    createdAt: string;
    confirmUntil: string | null;
    listing: { status: string; transactionType: string; salePrice: string | number | null; depositAmount: string | number | null; rentAmount: string | number | null; publishedAt: string | null } | null;
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
  const [filters, setFilters] = useState({ city: "", district: "", postalCode: "", ownerName: "", propertyType: "", transactionType: "", listingStatus: "", isActive: "", areaMin: "", areaMax: "", roomsMin: "", roomsMax: "" });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [editingProperty, setEditingProperty] = useState<PropertyRecord["property"] | null>(null);
  const [editValues, setEditValues] = useState({ propertyType: "APARTMENT" as PropertyType, city: "", district: "", address: "", postalCode: "", area: "", rooms: "", floor: "", coordinates: null as Coordinates | null, transactionType: "SALE" as TransactionType, salePrice: "", depositAmount: "", rentAmount: "", internalNote: "" });
  const [savingProperty, setSavingProperty] = useState(false);
  const [deletingPropertyId, setDeletingPropertyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { notes, savingNoteKey, saveNote, noteError, noteMessage, refreshNotes } = useAgentPrivateNotes();

  const load = useCallback(async (offset = 0, search = appliedQuery, currentFilters = appliedFilters) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: String(pagination.limit), offset: String(offset) });
      if (search.trim()) params.set("query", search.trim());
      for (const [key, value] of Object.entries(currentFilters)) if (value.trim()) params.set(key, value.trim());
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
  }, [appliedQuery, appliedFilters, pagination.limit]);

  useEffect(() => { void Promise.resolve().then(() => load(0)); }, [load]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAppliedQuery(query.trim());
    setAppliedFilters(filters);
  };

  async function savePropertyEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editingProperty) return;
    setSavingProperty(true); setActionError(null); setActionMessage(null);
    try {
      if (!editValues.coordinates) throw new Error("لطفاً موقعیت ملک را روی نقشه انتخاب کنید.");
      const propertyId = encodeURIComponent(editingProperty.id);
      await agentApiRequest(`/properties/${propertyId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ propertyType: editValues.propertyType, city: editValues.city.trim(), district: editValues.district.trim(), address: editValues.address.trim(), postalCode: editValues.postalCode.trim() || null, latitudeExact: editValues.coordinates.latitude, longitudeExact: editValues.coordinates.longitude, area: editValues.area.trim() ? Number(editValues.area) : null, rooms: editValues.rooms.trim() ? Number(editValues.rooms) : null, floor: editValues.floor.trim() ? Number(editValues.floor) : null }) });
      const pricePayload = { transactionType: editValues.transactionType, salePrice: editValues.transactionType === "SALE" ? editValues.salePrice.trim() : null, depositAmount: editValues.transactionType === "FULL_DEPOSIT" ? editValues.depositAmount.trim() : null, rentAmount: editValues.transactionType === "RENT" ? editValues.rentAmount.trim() : null };
      if (editValues.transactionType === "SALE" && !pricePayload.salePrice || editValues.transactionType === "FULL_DEPOSIT" && !pricePayload.depositAmount || editValues.transactionType === "RENT" && !pricePayload.rentAmount) throw new Error("قیمت یا مبلغ مربوط به نوع معامله را وارد کنید.");
      await agentApiRequest(`/properties/${propertyId}/${editingProperty.listing ? "price" : "listing"}`, { method: editingProperty.listing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pricePayload) });
      const noteSaved = await saveNote("property", editingProperty.id, editValues.internalNote);
      if (!noteSaved) throw new Error("مشخصات ملک ذخیره شد، اما ذخیره یادداشت خصوصی ناموفق بود.");
      setEditingProperty(null); setActionMessage("همه مشخصات ملک، موقعیت، اطلاعات معامله و یادداشت خصوصی ذخیره شد."); await load(pagination.offset);
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "ویرایش ملک ناموفق بود."); }
    finally { setSavingProperty(false); }
  }

  async function deleteOwnerProperty() {
    if (!deletingPropertyId) return;
    setActionError(null); setActionMessage(null);
    try { await agentApiRequest(`/agents/me/properties/${encodeURIComponent(deletingPropertyId)}`, { method: "DELETE" }); setDeletingPropertyId(null); setActionMessage("ملک از فهرست فعال خارج شد؛ سوابق آن حفظ شده‌اند."); await load(pagination.offset); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : "حذف ملک ناموفق بود."); }
  }

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
      <form onSubmit={submitSearch} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={200} placeholder="جست‌وجوی کلی: شناسه، نشانی، مالک..." className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <input value={filters.city} onChange={e => setFilters(v => ({...v,city:e.target.value}))} placeholder="شهر" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
          <input value={filters.district} onChange={e => setFilters(v => ({...v,district:e.target.value}))} placeholder="محله / منطقه" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
          <input value={filters.postalCode} onChange={e => setFilters(v => ({...v,postalCode:e.target.value}))} placeholder="کد پستی" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
          <input value={filters.ownerName} onChange={e => setFilters(v => ({...v,ownerName:e.target.value}))} placeholder="نام مالک" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
          <select value={filters.propertyType} onChange={e => setFilters(v => ({...v,propertyType:e.target.value}))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">همه انواع ملک</option>{Object.entries(propertyLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
          <select value={filters.transactionType} onChange={e => setFilters(v => ({...v,transactionType:e.target.value}))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">همه معاملات</option><option value="SALE">فروش</option><option value="FULL_DEPOSIT">رهن کامل</option><option value="RENT">اجاره</option></select>
          <select value={filters.listingStatus} onChange={e => setFilters(v => ({...v,listingStatus:e.target.value}))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">همه وضعیت‌های آگهی</option>{Object.entries(listingLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
          <select value={filters.isActive} onChange={e => setFilters(v => ({...v,isActive:e.target.value}))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">فعال و غیرفعال</option><option value="true">فعال</option><option value="false">غیرفعال</option></select>
          <input type="number" min="0" value={filters.areaMin} onChange={e => setFilters(v => ({...v,areaMin:e.target.value}))} placeholder="حداقل متراژ" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
          <input type="number" min="0" value={filters.areaMax} onChange={e => setFilters(v => ({...v,areaMax:e.target.value}))} placeholder="حداکثر متراژ" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
          <input type="number" min="0" value={filters.roomsMin} onChange={e => setFilters(v => ({...v,roomsMin:e.target.value}))} placeholder="حداقل اتاق" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
          <input type="number" min="0" value={filters.roomsMax} onChange={e => setFilters(v => ({...v,roomsMax:e.target.value}))} placeholder="حداکثر اتاق" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        </div>
        <div className="flex flex-wrap gap-2"><button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-[#043873] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Search className="h-4 w-4" /> اعمال فیلترها</button><button type="button" onClick={() => { const empty={city:"",district:"",postalCode:"",ownerName:"",propertyType:"",transactionType:"",listingStatus:"",isActive:"",areaMin:"",areaMax:"",roomsMin:"",roomsMax:""}; setFilters(empty); setAppliedFilters(empty); setQuery(""); setAppliedQuery(""); }} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm">پاک‌کردن فیلترها</button></div>
      </form>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {actionError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{actionError}</p>}
      {actionMessage && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{actionMessage}</p>}
      {noteError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{noteError}</p>}
      {noteMessage && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{noteMessage}</p>}
      {loading && properties.length === 0 ? <p className="flex items-center gap-2 py-4 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" /> در حال دریافت رکوردها...</p> : properties.length === 0 ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">رکورد ملکی مرتبطی برای این مشاور پیدا نشد.</p> : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[1250px] text-right text-sm">
            <thead className="bg-slate-100"><tr><th className="p-3">رکورد ملک</th><th className="p-3">وضعیت آگهی</th><th className="p-3">مالکیت</th><th className="p-3">تأییدها</th><th className="p-3">ارتباط مشاور</th><th className="p-3">یادداشت خصوصی ملک</th><th className="p-3">عملیات</th></tr></thead>
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
                  <td className="p-3"><div className="flex min-w-[130px] flex-col gap-2">{record.canManage && property.isActive ? <><button type="button" onClick={() => { setEditingProperty(property); setEditValues({propertyType:property.propertyType as PropertyType,city:property.city,district:property.district,address:property.address,postalCode:property.postalCode ?? "",area:property.area == null ? "" : String(property.area),rooms:property.rooms == null ? "" : String(property.rooms),floor:property.floor == null ? "" : String(property.floor),coordinates:{latitude:property.latitudeExact,longitude:property.longitudeExact},transactionType:(property.listing?.transactionType ?? "SALE") as TransactionType,salePrice:property.listing?.salePrice == null ? "" : String(property.listing.salePrice),depositAmount:property.listing?.depositAmount == null ? "" : String(property.listing.depositAmount),rentAmount:property.listing?.rentAmount == null ? "" : String(property.listing.rentAmount),internalNote:notes.find(note=>note.entityType==="property" && note.entityId===property.id)?.note ?? ""}); setActionError(null); setActionMessage(null); }} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold"><Pencil className="h-3.5 w-3.5" /> ویرایش ملک</button><button type="button" onClick={() => { setDeletingPropertyId(property.id); setActionError(null); }} className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"><Trash2 className="h-3.5 w-3.5" /> حذف از فهرست</button></> : <span className="text-xs text-slate-500">ویرایش و حذف فقط برای ملک فعال ثبت‌شده توسط همین مشاور در دسترس است.</span>}</div></td>
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
      <Modal open={Boolean(editingProperty)} title="ویرایش مشخصات ملک" description="تغییرات در سابقهٔ ملک ثبت می‌شوند." onClose={() => setEditingProperty(null)} size="full">
        <form onSubmit={savePropertyEdit} className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">نوع ملک<select required value={editValues.propertyType} onChange={e=>setEditValues(v=>({...v,propertyType:e.target.value}))} className="w-full rounded-lg border px-3 py-2">{Object.entries(propertyLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
          <label className="space-y-1 text-sm">شهر<input required maxLength={100} value={editValues.city} onChange={e=>setEditValues(v=>({...v,city:e.target.value}))} className="w-full rounded-lg border px-3 py-2" /></label>
          <label className="space-y-1 text-sm">محله / منطقه<input required maxLength={120} value={editValues.district} onChange={e=>setEditValues(v=>({...v,district:e.target.value}))} className="w-full rounded-lg border px-3 py-2" /></label>
          <label className="space-y-1 text-sm">نشانی<input required maxLength={500} value={editValues.address} onChange={e=>setEditValues(v=>({...v,address:e.target.value}))} className="w-full rounded-lg border px-3 py-2" /></label>
          <label className="space-y-1 text-sm">کد پستی<input maxLength={10} value={editValues.postalCode} onChange={e=>setEditValues(v=>({...v,postalCode:e.target.value}))} className="w-full rounded-lg border px-3 py-2" /></label>
          <label className="space-y-1 text-sm">متراژ<input type="number" min="0" step="any" value={editValues.area} onChange={e=>setEditValues(v=>({...v,area:e.target.value}))} className="w-full rounded-lg border px-3 py-2" /></label>
          <label className="space-y-1 text-sm">تعداد اتاق<input type="number" min="0" step="1" value={editValues.rooms} onChange={e=>setEditValues(v=>({...v,rooms:e.target.value}))} className="w-full rounded-lg border px-3 py-2" /></label>
          <label className="space-y-1 text-sm">طبقه<input type="number" min="0" max="200" step="1" value={editValues.floor} onChange={e=>setEditValues(v=>({...v,floor:e.target.value}))} className="w-full rounded-lg border px-3 py-2" /></label>
          <fieldset className="space-y-2 rounded-xl border p-3 sm:col-span-2"><legend className="px-2 text-sm font-bold">موقعیت جغرافیایی (اجباری)</legend><PropertyLocationPicker value={editValues.coordinates} onChange={(coordinates) => setEditValues(v => ({ ...v, coordinates }))} city={editValues.city} /></fieldset>
          <div className="space-y-3 rounded-xl border p-3 sm:col-span-2"><h3 className="font-bold">نوع معامله و قیمت</h3><label className="block space-y-1 text-sm">نوع معامله<select required value={editValues.transactionType} onChange={e=>setEditValues(v=>({...v,transactionType:e.target.value as TransactionType}))} className="w-full rounded-lg border px-3 py-2"><option value="SALE">فروش</option><option value="FULL_DEPOSIT">رهن کامل</option><option value="RENT">اجاره</option></select></label>{editValues.transactionType === "SALE" && <label className="block space-y-1 text-sm">قیمت فروش (تومان)<input required type="number" min="1" step="1" value={editValues.salePrice} onChange={e=>setEditValues(v=>({...v,salePrice:e.target.value}))} className="w-full rounded-lg border px-3 py-2" /></label>}{editValues.transactionType === "FULL_DEPOSIT" && <label className="block space-y-1 text-sm">مبلغ رهن کامل (تومان)<input required type="number" min="1" step="1" value={editValues.depositAmount} onChange={e=>setEditValues(v=>({...v,depositAmount:e.target.value}))} className="w-full rounded-lg border px-3 py-2" /></label>}{editValues.transactionType === "RENT" && <label className="block space-y-1 text-sm">مبلغ اجاره ماهانه (تومان)<input required type="number" min="1" step="1" value={editValues.rentAmount} onChange={e=>setEditValues(v=>({...v,rentAmount:e.target.value}))} className="w-full rounded-lg border px-3 py-2" /></label>}</div>
          <label className="space-y-1 text-sm sm:col-span-2">توضیحات خصوصی مشاور (اختیاری)<textarea rows={4} maxLength={10000} value={editValues.internalNote} onChange={e=>setEditValues(v=>({...v,internalNote:e.target.value}))} className="w-full rounded-lg border px-3 py-2" placeholder="فقط برای شما و مدیر ارشد هشتی" /></label>
          <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={()=>setEditingProperty(null)} className="rounded-lg border px-4 py-2">انصراف</button><button disabled={savingProperty} type="submit" className="rounded-lg bg-[#043873] px-4 py-2 font-bold text-white disabled:opacity-50">{savingProperty ? "در حال ذخیره..." : "ذخیره تغییرات"}</button></div>
        </form>
      </Modal>
      <Modal open={Boolean(deletingPropertyId)} title="حذف ملک از فهرست فعال" description="اطلاعات و سوابق ملک پاک نمی‌شوند؛ فقط از فهرست فعال خارج می‌شود." onClose={() => setDeletingPropertyId(null)}>
        <div className="flex justify-end gap-2"><button type="button" onClick={()=>setDeletingPropertyId(null)} className="rounded-lg border px-4 py-2">انصراف</button><button type="button" onClick={()=>void deleteOwnerProperty()} className="rounded-lg bg-red-700 px-4 py-2 font-bold text-white">تأیید حذف</button></div>
      </Modal>
    </section>
  );
}
