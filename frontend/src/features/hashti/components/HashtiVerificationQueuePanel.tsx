"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, LoaderCircle, RefreshCw, Search, XCircle } from "lucide-react";

import {
  getVerificationQueue,
  reviewVerificationCase,
  reviewVerificationOwner,
} from "../api/hashtiVerificationQueueApi";
import type { VerificationCaseRow } from "../types/hashtiVerificationQueue";

export function HashtiVerificationQueuePanel() {
  const [status, setStatus] = useState("PENDING");
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [cases, setCases] = useState<VerificationCaseRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busyOwnerId, setBusyOwnerId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true); setError(null);
      const params = new URLSearchParams({ status, limit: "25", offset: String(offset) });
      if (appliedQuery.trim()) params.set("query", appliedQuery.trim());
      try {
        const result = await getVerificationQueue(params);
        if (active) { setCases(result.cases); setTotal(result.pagination.total); }
      } catch (cause) {
        if (active) { setError(cause instanceof Error ? cause.message : "دریافت پرونده‌ها ناموفق بود."); setCases([]); }
      } finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [status, appliedQuery, offset, reload]);

  const submitSearch = (event: FormEvent) => { event.preventDefault(); setOffset(0); setAppliedQuery(query); };

  const reviewCase = async (item: VerificationCaseRow, nextStatus: "VERIFIED" | "REJECTED") => {
    const notes = window.prompt(nextStatus === "VERIFIED" ? "یادداشت تأیید (اختیاری):" : "دلیل رد پرونده:");
    if (notes === null) return;
    if (nextStatus === "REJECTED" && notes.trim().length < 3) { setError("برای رد پرونده، دلیل حداقل ۳ کاراکتری لازم است."); return; }
    setBusyId(item.id); setError(null); setMessage(null);
    try {
      await reviewVerificationCase(item.id, nextStatus, notes.trim() || null);
      setMessage(nextStatus === "VERIFIED" ? "پرونده تأیید شد و در سوابق ثبت شد." : "پرونده رد شد و دلیل آن در سوابق ثبت شد.");
      setOffset(0); setReload((value) => value + 1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "رسیدگی به پرونده ناموفق بود."); }
    finally { setBusyId(null); }
  };

  const reviewOwner = async (
    propertyId: string,
    ownerId: string,
    nextStatus: "PENDING" | "VERIFIED" | "REJECTED"
  ) => {
    const labels = {
      PENDING: "بازگرداندن مالک به وضعیت در انتظار",
      VERIFIED: "تأیید مالک",
      REJECTED: "رد مالک",
    } as const;
    const reason = window.prompt(`دلیل یا توضیح برای «${labels[nextStatus]}» را وارد کنید:`);
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setError("برای ثبت تصمیم درباره مالک، دلیل حداقل ۳ کاراکتری لازم است.");
      return;
    }

    const key = `${propertyId}:${ownerId}`;
    setBusyOwnerId(key);
    setError(null);
    setMessage(null);
    try {
      await reviewVerificationOwner(propertyId, ownerId, nextStatus, reason.trim());
      setMessage(`${labels[nextStatus]} انجام شد؛ عامل، زمان، دلیل و تغییر وضعیت در تاریخچه ثبت شد.`);
      setOffset(0);
      setReload((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تغییر وضعیت مالک ناموفق بود.");
    } finally {
      setBusyOwnerId(null);
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm sm:p-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="text-lg font-bold">صف پرونده‌های تأیید ملک</h2><p className="mt-1 text-sm text-slate-600">جست‌وجو بر اساس شناسه، شهر، محله، نشانی یا یادداشت؛ هر رسیدگی در تاریخچه ثبت می‌شود.</p></div>
        <button type="button" disabled={loading} onClick={() => setReload((value) => value + 1)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} تازه‌سازی
        </button>
      </div>
      <form onSubmit={submitSearch} className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
        <label className="space-y-1 text-sm">جست‌وجو<input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="شناسه پرونده، ملک یا نشانی" /></label>
        <label className="space-y-1 text-sm">وضعیت<select value={status} onChange={(event) => { setStatus(event.target.value); setOffset(0); }} className="w-full rounded-lg border border-slate-300 px-3 py-2">
          <option value="PENDING">در انتظار بررسی</option><option value="VERIFIED">تأییدشده</option><option value="REJECTED">ردشده</option><option value="ALL">همه وضعیت‌ها</option>
        </select></label>
        <div className="flex items-end"><button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#043873] px-4 py-2.5 text-sm font-bold text-white"><Search className="h-4 w-4" /> جست‌وجو</button></div>
      </form>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      <p className="text-sm text-slate-600">تعداد پرونده‌های منطبق: {total.toLocaleString("fa-IR")}</p>
      {loading ? <p className="flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" /> در حال دریافت پرونده‌ها...</p>
        : !cases.length ? <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">پرونده‌ای با این فیلتر پیدا نشد.</p>
        : <div className="space-y-3">{cases.map((item) => (
          <article key={item.id} className="space-y-3 rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h3 className="font-bold">{item.property.city}، {item.property.district} · {item.property.propertyType}</h3>
                <p className="mt-1 text-sm text-slate-600">{item.property.address}</p>
                <p className="mt-1 text-xs text-slate-500">پرونده: <span dir="ltr" className="font-mono">{item.id}</span></p>
                <p className="mt-1 text-xs text-slate-500">ملک: <span dir="ltr" className="font-mono">{item.propertyId}</span> · ثبت: {new Date(item.createdAt).toLocaleString("fa-IR")}</p>
                <p className="mt-1 text-sm text-slate-700">وضعیت: {({ PENDING: "در انتظار", VERIFIED: "تأییدشده", REJECTED: "ردشده" })[item.status]}</p>
              </div>
              {item.status === "PENDING" && <div className="flex gap-2">
                <button type="button" disabled={busyId === item.id} onClick={() => void reviewCase(item, "VERIFIED")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> تأیید</button>
                <button type="button" disabled={busyId === item.id} onClick={() => void reviewCase(item, "REJECTED")} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700 disabled:opacity-50"><XCircle className="h-4 w-4" /> رد</button>
              </div>}
            </div>
            {item.property.owners.length > 0 && <div className="border-t border-slate-100 pt-3"><p className="mb-2 text-sm font-semibold">مالکان مرتبط</p><div className="flex flex-wrap gap-2">{item.property.owners.map((owner) => <span key={owner.ownerId} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">{owner.owner.firstName} {owner.owner.lastName} · {owner.verificationStatus}</span>)}</div></div>}
            {item.property.owners.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {item.property.owners.map((owner) => {
                  const ownerBusyKey = `${item.propertyId}:${owner.ownerId}`;
                  if (owner.verificationStatus === "VERIFIED") return null;
                  return (
                    <div key={owner.ownerId} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                      <span className="text-sm font-semibold">{owner.owner.firstName} {owner.owner.lastName}</span>
                      {owner.verificationStatus === "PENDING" && (
                        <>
                          <button
                            type="button"
                            disabled={busyOwnerId === ownerBusyKey}
                            onClick={() => void reviewOwner(item.propertyId, owner.ownerId, "VERIFIED")}
                            className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                          >
                            {busyOwnerId === ownerBusyKey ? "در حال ثبت..." : "تأیید مالک"}
                          </button>
                          <button
                            type="button"
                            disabled={busyOwnerId === ownerBusyKey}
                            onClick={() => void reviewOwner(item.propertyId, owner.ownerId, "REJECTED")}
                            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50"
                          >
                            رد مالک
                          </button>
                        </>
                      )}
                      {owner.verificationStatus === "REJECTED" && (
                        <button
                          type="button"
                          disabled={busyOwnerId === ownerBusyKey}
                          onClick={() => void reviewOwner(item.propertyId, owner.ownerId, "PENDING")}
                          className="rounded-lg border border-amber-200 px-3 py-2 text-xs font-bold text-amber-900 disabled:opacity-50"
                        >
                          بازگرداندن به انتظار
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {item.notes && <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">یادداشت: {item.notes}</p>}
          </article>
        ))}</div>}
      <div className="flex items-center justify-between gap-3"><button type="button" disabled={loading || offset === 0} onClick={() => setOffset(Math.max(0, offset - 25))} className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-40">قبلی</button><span className="text-xs text-slate-500">{Math.min(total, offset + 25).toLocaleString("fa-IR")} از {total.toLocaleString("fa-IR")}</span><button type="button" disabled={loading || offset + 25 >= total} onClick={() => setOffset(offset + 25)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-40">بعدی</button></div>
    </section>
  );
}
