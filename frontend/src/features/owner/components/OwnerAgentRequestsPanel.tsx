"use client";


import { RecordDetailsRow } from "@/shared/components/RecordDetailsRow";
import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, RefreshCw, Send } from "lucide-react";
import { Modal } from "@/shared/components/Modal";
import { ownerApiRequest } from "../api/ownerApi";
import type { OwnerProperty } from "../types/owner";

type OwnerRequest = {
  id: string; propertyId: string; description: string | null; status: string; createdAt: string;
  property: { propertyType: string; city: string; district: string; area: number | null; agents: Array<{ agentId: string; status: string; approvedByOwner: boolean }> };
  responses: Array<{ status: string; agent: { id: string; firstName: string; lastName: string; agencyName: string | null; user: { mobile: string } } }>;
};

const propertyLabels: Record<string, string> = {
  APARTMENT: "آپارتمان", HOUSE: "خانه", VILLA: "ویلا", LAND: "زمین", SHOP: "مغازه", OFFICE: "اداری", GARDEN: "باغ",
};

export function OwnerAgentRequestsPanel({ ownerId }: { ownerId?: string }) {
  const [properties, setProperties] = useState<OwnerProperty[]>([]);
  const [requests, setRequests] = useState<OwnerRequest[]>([]);
  const [propertyId, setPropertyId] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pendingCloseRequestId, setPendingCloseRequestId] = useState<string | null>(null);
  const [pendingAgentDecision, setPendingAgentDecision] = useState<{ propertyId: string; agentId: string; action: "approval" | "revoke" } | null>(null);

  const load = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true); setError(null);
    try {
      const [propertyBody, requestBody] = await Promise.all([
        ownerApiRequest<{ properties?: OwnerProperty[] }>("/owners/me/properties"),
        ownerApiRequest<{ requests?: OwnerRequest[] }>(`/owners/${encodeURIComponent(ownerId)}/agent-requests`),
      ]);
      setProperties(propertyBody.properties ?? []);
      setRequests(requestBody.requests ?? []);
      setPropertyId((current) => current || propertyBody.properties?.[0]?.propertyId || "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "بارگیری درخواست‌ها ناموفق بود.");
    } finally { setLoading(false); }
  }, [ownerId]);

  useEffect(() => { void Promise.resolve().then(() => load()); }, [load]);

  async function submit() {
    if (!ownerId || !propertyId) { setError("ابتدا یکی از املاک خود را انتخاب کنید."); return; }
    setBusy(true); setError(null); setMessage(null);
    try {
      await ownerApiRequest(`/owners/${encodeURIComponent(ownerId)}/agent-requests`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, description }),
      });
      setDescription("");
      setMessage("درخواست برای مشاوران واجد شرایط ارسال شد.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ثبت درخواست ناموفق بود.");
    } finally { setBusy(false); }
  }

  async function closeRequest(id: string) {
    if (!ownerId) return;
    setBusy(true); setError(null); setMessage(null);
    try {
      await ownerApiRequest(`/owners/${encodeURIComponent(ownerId)}/agent-requests/${encodeURIComponent(id)}/close`, { method: "PUT" });
      setMessage("درخواست بسته شد.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "بستن درخواست ناموفق بود."); }
    finally { setBusy(false); }
  }

  async function setAgentApproval(propertyId: string, agentId: string, action: "approval" | "revoke") {
    setBusy(true); setError(null); setMessage(null);
    try {
      await ownerApiRequest("/properties/" + encodeURIComponent(propertyId) + "/agents/" + encodeURIComponent(agentId) + "/" + action, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
      });
      setMessage(action === "approval" ? "مشاور منتخب این ملک تأیید شد؛ تأیید قبلی در صورت وجود لغو شد." : "انتخاب مشاور لغو شد؛ شماره تماس مالک جایگزین می‌شود.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تغییر مشاور منتخب ناموفق بود."); }
    finally { setBusy(false); }
  }

  const visibleRequests = requests.filter((request) => {
    const responseText = request.responses.map((response) => response.status + " " + response.agent.firstName + " " + response.agent.lastName + " " + (response.agent.agencyName ?? "") + " " + response.agent.user.mobile).join(" ");
    const searchable = [request.id, request.propertyId, request.property.propertyType, request.property.city, request.property.district, request.property.area, request.description, request.status, request.createdAt, responseText].join(" ").toLocaleLowerCase();
    return searchable.includes(search.trim().toLocaleLowerCase());
  });

  return <section dir="rtl" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-bold">درخواست مشاور برای ملک</h2><p className="mt-1 text-sm leading-7 text-slate-600">درخواست به مشاوران واجد شرایط نمایش داده می‌شود. اطلاعات تماس و آدرس دقیق فقط از مسیر دسترسی اشتراکی در اختیار مشاور قرار می‌گیرد.</p></div>
      <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50">{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} تازه‌سازی</button>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1 text-sm font-medium">ملک موردنظر
        <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" disabled={loading || properties.length === 0}>
          <option value="">انتخاب ملک</option>
          {properties.map((item) => <option key={item.propertyId} value={item.propertyId}>{propertyLabels[item.property.propertyType] ?? item.property.propertyType} — {item.property.city}، {item.property.district}</option>)}
        </select>
      </label>
      <label className="space-y-1 text-sm font-medium">توضیحات برای مشاوران (اختیاری)
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={2} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" placeholder="مثلاً نوع همکاری موردنظر" />
      </label>
    </div>
    <button type="button" onClick={() => void submit()} disabled={busy || loading || !propertyId} className="inline-flex items-center gap-2 rounded-xl bg-[#043873] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Send className="h-4 w-4" />{busy ? "در حال ارسال..." : "ارسال درخواست به مشاوران"}</button>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold">درخواست‌های ثبت‌شده و پاسخ مشاوران</h3><input value={search} onChange={(e) => setSearch(e.target.value)} aria-label="جست‌وجوی درخواست و مشاور" placeholder="جست‌وجو در تمام اطلاعات نمایش‌داده‌شده..." className="min-w-[240px] flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm" /></div>
      {loading ? <p className="flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />در حال دریافت...</p> : requests.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">هنوز درخواستی ثبت نشده است.</p> : visibleRequests.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">درخواستی با این جست‌وجو پیدا نشد.</p> : <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[1100px] text-right text-sm"><thead className="bg-slate-100"><tr><th className="p-3">ملک</th><th className="p-3">توضیحات</th><th className="p-3">وضعیت</th><th className="p-3">تاریخ</th><th className="p-3">عملیات</th><th className="p-3">پاسخ و انتخاب مشاور</th></tr></thead><tbody>{visibleRequests.map((request) => <RecordDetailsRow key={request.id} record={request} title="رکورد" className="border-t border-slate-200 align-top"><td className="p-3"><p className="font-semibold">{propertyLabels[request.property.propertyType] ?? request.property.propertyType} در {request.property.city}، {request.property.district}</p><p className="mt-1 text-xs text-slate-500">{request.property.area ?? "—"} مترمربع</p><p className="mt-1 break-all font-mono text-xs text-slate-400" dir="ltr">{request.id}</p></td><td className="max-w-sm whitespace-pre-wrap p-3">{request.description || "بدون توضیحات"}</td><td className="p-3">{request.status === "ACTIVE" ? "فعال و قابل مشاهده برای مشاوران" : "بسته‌شده"}</td><td className="whitespace-nowrap p-3">{new Date(request.createdAt).toLocaleDateString("fa-IR")}</td><td className="p-3">{request.status === "ACTIVE" && <button type="button" onClick={() => setPendingCloseRequestId(request.id)} disabled={busy} className="whitespace-nowrap rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">بستن درخواست</button>}</td><td className="min-w-[280px] p-3"><div className="space-y-3">{request.responses.map((response) => { const relation = request.property.agents.find((item) => item.agentId === response.agent.id); return <div key={response.agent.id} className="rounded-lg border border-slate-200 p-3"><p className="font-semibold">{response.agent.firstName} {response.agent.lastName}</p><p className="text-xs text-slate-500">{response.agent.agencyName || "بدون نام آژانس"} · {response.status === "ACCEPTED" ? "پذیرفته‌شده توسط مشاور" : "ردشده توسط مشاور"}</p>{response.status === "ACCEPTED" && request.status === "ACTIVE" && <div className="mt-2 flex flex-wrap gap-2">{relation?.approvedByOwner ? <><span className="rounded bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800">مشاور منتخب</span><button type="button" disabled={busy} onClick={() => setPendingAgentDecision({ propertyId: request.propertyId, agentId: response.agent.id, action: "revoke" })} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50">لغو انتخاب</button></> : <button type="button" disabled={busy} onClick={() => setPendingAgentDecision({ propertyId: request.propertyId, agentId: response.agent.id, action: "approval" })} className="rounded-lg bg-[#043873] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">انتخاب این مشاور</button>}</div>}</div>; })}{request.responses.length === 0 && <span className="text-xs text-slate-500">هنوز مشاوری پاسخ نداده است.</span>}</div></td></RecordDetailsRow>)}</tbody></table></div>}
    </div>

    <Modal open={Boolean(pendingAgentDecision)} title={pendingAgentDecision?.action === "approval" ? "انتخاب مشاور برای ملک" : "لغو انتخاب مشاور"} description={pendingAgentDecision?.action === "approval" ? "با تأیید، این مشاور تنها مشاور منتخب ملک می‌شود و انتخاب قبلی لغو خواهد شد." : "با لغو انتخاب، شماره تماس مالک به‌جای شماره مشاور نمایش داده می‌شود."} onClose={() => { if (!busy) setPendingAgentDecision(null); }}>
      <div className="flex justify-end gap-2" dir="rtl"><button type="button" disabled={busy} onClick={() => setPendingAgentDecision(null)} className="rounded-lg border px-4 py-2.5">انصراف</button><button type="button" disabled={busy} onClick={() => { if (pendingAgentDecision) { const action = pendingAgentDecision; setPendingAgentDecision(null); void setAgentApproval(action.propertyId, action.agentId, action.action); } }} className="rounded-lg bg-[#043873] px-4 py-2.5 font-bold text-white disabled:opacity-50">{busy ? "در حال ثبت..." : "تأیید عملیات"}</button></div>
    </Modal>
    <Modal open={Boolean(pendingCloseRequestId)} title="بستن درخواست همکاری" description="پس از بستن، درخواست برای مشاوران جدید قابل پاسخ‌گویی نخواهد بود." onClose={() => { if (!busy) setPendingCloseRequestId(null); }}>
      <div className="flex justify-end gap-2" dir="rtl"><button type="button" disabled={busy} onClick={() => setPendingCloseRequestId(null)} className="rounded-lg border px-4 py-2.5">انصراف</button><button type="button" disabled={busy} onClick={() => { if (pendingCloseRequestId) { const id = pendingCloseRequestId; setPendingCloseRequestId(null); void closeRequest(id); } }} className="rounded-lg bg-red-700 px-4 py-2.5 font-bold text-white disabled:opacity-50">بستن درخواست</button></div>
    </Modal>
  </section>;
}
