"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, RefreshCw, Send } from "lucide-react";
import { ownerApiRequest } from "../api/ownerApi";
import type { OwnerProperty } from "../types/owner";

type OwnerRequest = {
  id: string; propertyId: string; description: string | null; status: string; createdAt: string;
  property: { propertyType: string; city: string; district: string; area: number | null };
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

  useEffect(() => { void load(); }, [load]);

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
      <h3 className="font-bold">درخواست‌های ثبت‌شده</h3>
      {loading ? <p className="flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />در حال دریافت...</p> : requests.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">هنوز درخواستی ثبت نشده است.</p> : requests.map((request) => <article key={request.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 p-4">
        <div><p className="font-bold">{propertyLabels[request.property.propertyType] ?? request.property.propertyType} در {request.property.city}، {request.property.district}</p><p className="mt-1 text-sm text-slate-600">{request.description || "بدون توضیحات"}</p><p className="mt-2 text-xs text-slate-500">وضعیت: {request.status === "ACTIVE" ? "فعال و قابل مشاهده برای مشاوران" : "بسته‌شده"}</p></div>
        {request.status === "ACTIVE" && <button type="button" onClick={() => void closeRequest(request.id)} disabled={busy} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">بستن درخواست</button>}
      </article>)}
    </div>
  </section>;
}
