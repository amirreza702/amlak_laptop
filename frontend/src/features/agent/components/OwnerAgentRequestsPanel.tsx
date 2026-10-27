"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, LockKeyhole, RefreshCw } from "lucide-react";
import { agentApiRequest } from "../api/agentApi";

type OwnerRequest = {
  id: string; description: string | null; status: string; createdAt: string;
  property: { propertyType: string; city: string; district: string; area: number | null; rooms: number | null; listing: { transactionType: string } | null };
};
type AccessResult = {
  owner: { firstName: string; lastName: string; mobile: string };
  property: { city: string; district: string; address: string; postalCode: string | null };
};
const propertyLabels: Record<string, string> = { APARTMENT: "آپارتمان", HOUSE: "خانه", VILLA: "ویلا", LAND: "زمین", SHOP: "مغازه", OFFICE: "اداری", GARDEN: "باغ" };
const transactionLabels: Record<string, string> = { SALE: "فروش", FULL_DEPOSIT: "رهن کامل", RENT: "اجاره" };

export function OwnerAgentRequestsPanel({ agentId }: { agentId: string }) {
  const [requests, setRequests] = useState<OwnerRequest[]>([]);
  const [access, setAccess] = useState<Record<string, AccessResult>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!agentId) return;
    setLoading(true); setError(null);
    try {
      const body = await agentApiRequest<{ requests?: OwnerRequest[] }>(`/agents/${encodeURIComponent(agentId)}/owner-requests`);
      setRequests(body.requests ?? []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "دریافت درخواست‌های مالکان ناموفق بود."); }
    finally { setLoading(false); }
  }, [agentId]);
  useEffect(() => { void load(); }, [load]);

  async function unlock(id: string) {
    setBusyId(id); setError(null); setMessage(null);
    try {
      const body = await agentApiRequest<AccessResult & { access: unknown }>(`/agents/${encodeURIComponent(agentId)}/owner-requests/${encodeURIComponent(id)}/contact`, { method: "POST" });
      setAccess((current) => ({ ...current, [id]: body }));
      setMessage("اطلاعات تماس و آدرس دقیق با یک سهمیه دسترسی شد.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "دریافت اطلاعات مالک ناموفق بود."); }
    finally { setBusyId(null); }
  }

  return <section dir="rtl" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">درخواست‌های مالکان</h2><p className="mt-1 text-sm leading-7 text-slate-600">درخواست‌های فعال برای مشاوران تأییدشده قابل مشاهده‌اند. مشاهدهٔ شماره تماس مالک و آدرس دقیق ملک با یک سهمیه از اشتراک ماهانه انجام می‌شود.</p></div>
      <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50">{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} تازه‌سازی</button>
    </div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    {loading ? <p className="flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />در حال دریافت درخواست‌ها...</p> : requests.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">در حال حاضر درخواست فعالی وجود ندارد.</p> : <div className="space-y-3">
      {requests.map((request) => <article key={request.id} className="rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div>
          <h3 className="font-bold">{propertyLabels[request.property.propertyType] ?? request.property.propertyType} در {request.property.city}، {request.property.district}</h3>
          <p className="mt-1 text-sm text-slate-600">نوع معامله: {request.property.listing ? transactionLabels[request.property.listing.transactionType] ?? request.property.listing.transactionType : "تعیین نشده"}{request.property.area ? ` • ${request.property.area} مترمربع` : ""}{request.property.rooms ? ` • ${request.property.rooms} اتاق` : ""}</p>
          {request.description && <p className="mt-2 text-sm leading-7 text-slate-600">{request.description}</p>}
          <p className="mt-2 text-xs text-slate-400">کد درخواست: <span dir="ltr" className="font-mono">{request.id}</span></p>
        </div>
        {!access[request.id] && <button type="button" onClick={() => void unlock(request.id)} disabled={busyId === request.id} className="inline-flex items-center gap-2 rounded-lg bg-[#043873] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busyId === request.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}دریافت تماس و آدرس</button>}
        </div>
        {access[request.id] && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
          <p className="font-bold">{access[request.id].owner.firstName} {access[request.id].owner.lastName}</p>
          <p className="mt-1" dir="ltr">{access[request.id].owner.mobile}</p>
          <p className="mt-3 font-semibold">آدرس دقیق ملک</p><p className="mt-1 leading-7">{access[request.id].property.address}، {access[request.id].property.district}، {access[request.id].property.city}</p>
          {access[request.id].property.postalCode && <p className="mt-1">کد پستی: <span dir="ltr">{access[request.id].property.postalCode}</span></p>}
        </div>}
      </article>)}
    </div>}
  </section>;
}
