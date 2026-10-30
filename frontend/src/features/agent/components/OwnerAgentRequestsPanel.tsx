"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { agentApiRequest } from "../api/agentApi";
import { AgentPrivateNoteEditor } from "./AgentPrivateNoteEditor";
import type { AgentPrivateNote } from "../hooks/useAgentPrivateNotes";

type OwnerRequest = {
  id: string;
  ownerId: string;
  propertyId: string;
  description: string | null;
  status: string;
  createdAt: string;
  responses?: Array<{ status: string }>;
  property: { propertyType: string; city: string; district: string; area: number | null; rooms: number | null; listing: { transactionType: string } | null; agents?: Array<{ status: string; approvedByOwner: boolean }> };
};
type AccessResult = {
  owner: { id: string; firstName: string; lastName: string; mobile: string };
  property: { id: string; city: string; district: string; address: string; postalCode: string | null };
};
const propertyLabels: Record<string, string> = { APARTMENT: "آپارتمان", HOUSE: "خانه", VILLA: "ویلا", LAND: "زمین", SHOP: "مغازه", OFFICE: "اداری", GARDEN: "باغ" };
const transactionLabels: Record<string, string> = { SALE: "فروش", FULL_DEPOSIT: "رهن کامل", RENT: "اجاره" };

export function OwnerAgentRequestsPanel({ agentId, notes: privateNotes, savingNoteKey, saveNote, noteError, noteMessage }: {
  agentId: string;
  notes: AgentPrivateNote[];
  savingNoteKey: string | null;
  saveNote: (entityType: AgentPrivateNote["entityType"], entityId: string, note: string) => Promise<boolean>;
  noteError: string | null;
  noteMessage: string | null;
}) {
  const [requests, setRequests] = useState<OwnerRequest[]>([]);
  const [access, setAccess] = useState<Record<string, AccessResult>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState({ text: "", ownerName: "", ownerMobile: "", city: "", district: "", propertyType: "", transactionType: "", status: "", areaMin: "", areaMax: "", roomsMin: "", roomsMax: "" });

  const load = useCallback(async () => {
    if (!agentId) return;
    setLoading(true); setError(null);
    try {
      const body = await agentApiRequest<{ requests?: OwnerRequest[] }>(`/agents/${encodeURIComponent(agentId)}/owner-requests`);
      setRequests(body.requests ?? []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "دریافت درخواست‌های مالکان ناموفق بود."); }
    finally { setLoading(false); }
  }, [agentId]);
  useEffect(() => { void Promise.resolve().then(() => load()); }, [load]);

  const filteredRequests = requests.filter((request) => {
    const text = filters.text.trim().toLocaleLowerCase();
    const areaMin = filters.areaMin === "" ? undefined : Number(filters.areaMin); const areaMax = filters.areaMax === "" ? undefined : Number(filters.areaMax);
    const roomsMin = filters.roomsMin === "" ? undefined : Number(filters.roomsMin); const roomsMax = filters.roomsMax === "" ? undefined : Number(filters.roomsMax);
    const unlockedOwner = access[request.id]?.owner;
    const ownerName = `${unlockedOwner?.firstName ?? ""} ${unlockedOwner?.lastName ?? ""}`.trim().toLocaleLowerCase();
    const ownerMobile = unlockedOwner?.mobile ?? "";
    const propertyPrivateNote = privateNotes.find((note) => note.entityType === "property" && note.entityId === request.propertyId)?.note ?? "";
    const searchable = [request.id, request.propertyId, request.description ?? "", request.property.city, request.property.district, request.property.propertyType, request.property.listing?.transactionType ?? "", ownerName, ownerMobile, propertyPrivateNote].join(" ").toLocaleLowerCase();
    return (!text || searchable.includes(text)) && (!filters.ownerName.trim() || ownerName.includes(filters.ownerName.trim().toLocaleLowerCase())) && (!filters.ownerMobile.trim() || ownerMobile.includes(filters.ownerMobile.trim())) && (!filters.city || request.property.city.toLocaleLowerCase().includes(filters.city.toLocaleLowerCase())) && (!filters.district || request.property.district.toLocaleLowerCase().includes(filters.district.toLocaleLowerCase())) && (!filters.propertyType || request.property.propertyType === filters.propertyType) && (!filters.transactionType || request.property.listing?.transactionType === filters.transactionType) && (!filters.status || request.status === filters.status) && (areaMin === undefined || (request.property.area !== null && request.property.area >= areaMin)) && (areaMax === undefined || (request.property.area !== null && request.property.area <= areaMax)) && (roomsMin === undefined || (request.property.rooms !== null && request.property.rooms >= roomsMin)) && (roomsMax === undefined || (request.property.rooms !== null && request.property.rooms <= roomsMax));
  });

  async function respond(id: string, response: "ACCEPTED" | "REJECTED") {
    setBusyId(id); setError(null); setMessage(null);
    try {
      await agentApiRequest(`/agents/${encodeURIComponent(agentId)}/owner-requests/${encodeURIComponent(id)}/response`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ response }),
      });
      setMessage(response === "ACCEPTED" ? "درخواست همکاری را پذیرفتید؛ اکنون منتظر تصمیم مالک بمانید." : "درخواست همکاری رد شد.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "ثبت پاسخ ناموفق بود."); }
    finally { setBusyId(null); }
  }

  async function unlock(id: string) {
    setBusyId(id); setError(null); setMessage(null);
    try {
      const body = await agentApiRequest<AccessResult & { access: unknown }>(`/agents/${encodeURIComponent(agentId)}/owner-requests/${encodeURIComponent(id)}/contact`, { method: "POST" });
      setAccess((current) => ({ ...current, [id]: body }));
      setMessage("اطلاعات تماس و نشانی دقیق دریافت شد و دسترسی ثبت شد.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "دریافت اطلاعات مالک ناموفق بود."); }
    finally { setBusyId(null); }
  }

  return (
    <section dir="rtl" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">درخواست‌های مالکان</h2><p className="mt-1 text-sm leading-7 text-slate-600">درخواست‌های فعال برای مشاوران تأییدشده قابل مشاهده‌اند. دریافت شماره تماس مالک و نشانی دقیق ملک جداگانه انجام می‌شود و در سوابق دسترسی ثبت خواهد شد.</p></div>
      <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50">{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} تازه‌سازی</button>
    </div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    {noteError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{noteError}</p>}
    {noteMessage && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{noteMessage}</p>}
    {!loading && requests.length > 0 && <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 xl:grid-cols-4">
      <input value={filters.text} onChange={e=>setFilters(v=>({...v,text:e.target.value}))} placeholder="شناسه درخواست/ملک یا توضیحات" className="rounded-lg border bg-white px-3 py-2 text-sm" />
      <input value={filters.ownerName} onChange={e=>setFilters(v=>({...v,ownerName:e.target.value}))} placeholder="نام مالک (پس از دریافت دسترسی)" className="rounded-lg border bg-white px-3 py-2 text-sm" />
      <input value={filters.ownerMobile} onChange={e=>setFilters(v=>({...v,ownerMobile:e.target.value}))} placeholder="موبایل مالک (پس از دریافت دسترسی)" className="rounded-lg border bg-white px-3 py-2 text-sm" />
      <input value={filters.city} onChange={e=>setFilters(v=>({...v,city:e.target.value}))} placeholder="شهر" className="rounded-lg border bg-white px-3 py-2 text-sm" />
      <input value={filters.district} onChange={e=>setFilters(v=>({...v,district:e.target.value}))} placeholder="محله / منطقه" className="rounded-lg border bg-white px-3 py-2 text-sm" />
      <select value={filters.propertyType} onChange={e=>setFilters(v=>({...v,propertyType:e.target.value}))} className="rounded-lg border bg-white px-3 py-2 text-sm"><option value="">همه انواع ملک</option>{Object.entries(propertyLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
      <select value={filters.transactionType} onChange={e=>setFilters(v=>({...v,transactionType:e.target.value}))} className="rounded-lg border bg-white px-3 py-2 text-sm"><option value="">همه معاملات</option>{Object.entries(transactionLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
      <select value={filters.status} onChange={e=>setFilters(v=>({...v,status:e.target.value}))} className="rounded-lg border bg-white px-3 py-2 text-sm"><option value="">همه وضعیت‌ها</option>{Array.from(new Set(requests.map(r=>r.status))).map(value=><option key={value} value={value}>{value}</option>)}</select>
      <input type="number" min="0" value={filters.areaMin} onChange={e=>setFilters(v=>({...v,areaMin:e.target.value}))} placeholder="حداقل متراژ" className="rounded-lg border bg-white px-3 py-2 text-sm" />
      <input type="number" min="0" value={filters.areaMax} onChange={e=>setFilters(v=>({...v,areaMax:e.target.value}))} placeholder="حداکثر متراژ" className="rounded-lg border bg-white px-3 py-2 text-sm" />
      <input type="number" min="0" value={filters.roomsMin} onChange={e=>setFilters(v=>({...v,roomsMin:e.target.value}))} placeholder="حداقل اتاق" className="rounded-lg border bg-white px-3 py-2 text-sm" />
      <input type="number" min="0" value={filters.roomsMax} onChange={e=>setFilters(v=>({...v,roomsMax:e.target.value}))} placeholder="حداکثر اتاق" className="rounded-lg border bg-white px-3 py-2 text-sm" />
      <button type="button" onClick={()=>setFilters({text:"",ownerName:"",ownerMobile:"",city:"",district:"",propertyType:"",transactionType:"",status:"",areaMin:"",areaMax:"",roomsMin:"",roomsMax:""})} className="rounded-lg border bg-white px-3 py-2 text-sm">پاک‌کردن فیلترها</button><p className="self-center text-xs text-slate-600">{filteredRequests.length.toLocaleString("fa-IR")} درخواست مطابق فیلتر</p>
    </div>}
    {loading ? <p className="flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />در حال دریافت درخواست‌ها...</p> : requests.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">در حال حاضر درخواست فعالی وجود ندارد.</p> : filteredRequests.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">درخواستی با این فیلترها پیدا نشد.</p> : <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[950px] text-right text-sm"><thead className="bg-slate-100"><tr><th className="p-3">ملک</th><th className="p-3">مشخصات درخواست</th><th className="p-3">اطلاعات تماس و نشانی</th><th className="p-3">یادداشت خصوصی مرتبط</th><th className="p-3">عملیات</th></tr></thead><tbody>{filteredRequests.map((request) => (
        <tr key={request.id} className="border-t border-slate-200 align-top">
          <td className="p-3"><p className="font-bold">{propertyLabels[request.property.propertyType] ?? request.property.propertyType} در {request.property.city}، {request.property.district}</p><p className="mt-1 text-xs text-slate-500">{request.property.area ? `${request.property.area} مترمربع` : ""}{request.property.rooms ? ` · ${request.property.rooms} اتاق` : ""}</p><p className="mt-1 break-all font-mono text-xs text-slate-400" dir="ltr">{request.id}</p></td>
          <td className="p-3"><p>{request.property.listing ? transactionLabels[request.property.listing.transactionType] ?? request.property.listing.transactionType : "نوع معامله تعیین نشده"}</p>{request.description && <p className="mt-2 max-w-sm whitespace-pre-wrap text-slate-600">{request.description}</p>}<p className="mt-2 text-xs text-slate-500">{request.status}</p><p className="mt-1 text-xs font-semibold text-blue-800">{request.responses?.[0]?.status === "ACCEPTED" ? "پذیرفته‌شده؛ در انتظار تأیید مالک" : request.responses?.[0]?.status === "REJECTED" ? "ردشده توسط شما" : "هنوز پاسخ نداده‌اید"}</p></td>
          <td className="p-3">{access[request.id] ? <div className="min-w-[220px] rounded-lg border border-emerald-200 bg-emerald-50 p-3"><p className="font-bold">{access[request.id].owner.firstName} {access[request.id].owner.lastName}</p><p className="mt-1" dir="ltr">{access[request.id].owner.mobile}</p><p className="mt-2 font-semibold">آدرس دقیق ملک</p><p className="mt-1 whitespace-pre-wrap leading-6">{access[request.id].property.address}، {access[request.id].property.district}، {access[request.id].property.city}</p>{access[request.id].property.postalCode && <p className="mt-1">کد پستی: <span dir="ltr">{access[request.id].property.postalCode}</span></p>}</div> : <span className="text-slate-500">هنوز دسترسی دریافت نشده است.</span>}</td>
          <td className="p-3"><div className="min-w-[230px]"><p className="mb-1 text-xs font-bold text-slate-600">یادداشت خصوصی همین ملک</p><AgentPrivateNoteEditor entityType="property" entityId={request.propertyId} notes={privateNotes} saving={savingNoteKey === `property:${request.propertyId}`} onSave={saveNote} /></div></td>
          <td className="p-3">{!request.responses?.[0] || request.responses[0].status === "PENDING" ? <div className="flex flex-col gap-2"><button type="button" onClick={() => void respond(request.id, "ACCEPTED")} disabled={busyId === request.id} className="whitespace-nowrap rounded-lg bg-[#043873] px-3 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busyId === request.id ? "در حال ثبت..." : "پذیرش همکاری"}</button><button type="button" onClick={() => void respond(request.id, "REJECTED")} disabled={busyId === request.id} className="whitespace-nowrap rounded-lg border border-red-200 px-3 py-2.5 text-sm font-bold text-red-700 disabled:opacity-50">رد درخواست</button></div> : <div className="space-y-2"><span className="text-xs text-slate-600">{request.responses[0].status === "ACCEPTED" ? "پاسخ ثبت شده؛ منتظر مالک" : "درخواست رد شده"}</span>{request.responses[0].status === "ACCEPTED" && !request.property.agents?.[0]?.approvedByOwner && <p className="text-xs text-slate-500">منتظر انتخاب نهایی مالک هستید.</p>}{request.responses[0].status === "ACCEPTED" && request.property.agents?.[0]?.approvedByOwner && !access[request.id] && <button type="button" onClick={() => void unlock(request.id)} disabled={busyId === request.id} className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-[#043873] px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{busyId === request.id ? "در حال دریافت..." : "دریافت تماس و آدرس"}</button>}</div>}</td>
        </tr>
      ))}</tbody></table></div>}
    </section>
  );
}
