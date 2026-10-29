"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, LoaderCircle, RefreshCw, Search, XCircle } from "lucide-react";
import { Modal } from "@/shared/components/Modal";
import { formatPersianDateTime } from "@/shared/utils/date";

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
  const [pendingReview, setPendingReview] = useState<{ kind: "case" | "owner"; caseItem?: VerificationCaseRow; propertyId?: string; ownerId?: string; nextStatus: "PENDING" | "VERIFIED" | "REJECTED"; title: string } | null>(null);
  const [reviewNotesDraft, setReviewNotesDraft] = useState("");

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

  const reviewCase = (item: VerificationCaseRow, nextStatus: "VERIFIED" | "REJECTED") => {
    setPendingReview({ kind: "case", caseItem: item, nextStatus, title: nextStatus === "VERIFIED" ? "تأیید پرونده ملک" : "رد پرونده ملک" });
    setReviewNotesDraft("");
    setError(null);
    setMessage(null);
  };

  const reviewOwner = (
    propertyId: string,
    ownerId: string,
    nextStatus: "PENDING" | "VERIFIED" | "REJECTED"
  ) => {
    const labels = { PENDING: "بازگرداندن مالک به وضعیت در انتظار", VERIFIED: "تأیید مالک", REJECTED: "رد مالک" } as const;
    setPendingReview({ kind: "owner", propertyId, ownerId, nextStatus, title: labels[nextStatus] });
    setReviewNotesDraft("");
    setError(null);
    setMessage(null);
  };

  const submitReview = async (event: FormEvent) => {
    event.preventDefault();
    if (!pendingReview) return;
    const note = reviewNotesDraft.trim();
    const required = pendingReview.kind === "owner" || pendingReview.nextStatus === "REJECTED";
    if (required && note.length < 3) {
      setError(pendingReview.kind === "owner" ? "برای ثبت تصمیم درباره مالک، دلیل حداقل ۳ کاراکتری لازم است." : "برای رد پرونده، دلیل حداقل ۳ کاراکتری لازم است.");
      return;
    }
    setError(null); setMessage(null);
    const labels = { PENDING: "بازگرداندن مالک به وضعیت در انتظار", VERIFIED: "تأیید مالک", REJECTED: "رد مالک" } as const;
    try {
      if (pendingReview.kind === "case" && pendingReview.caseItem) {
        const item = pendingReview.caseItem;
        setBusyId(item.id);
        await reviewVerificationCase(item.id, pendingReview.nextStatus as "VERIFIED" | "REJECTED", note || null);
        setMessage(pendingReview.nextStatus === "VERIFIED" ? "پرونده تأیید شد و در سوابق ثبت شد." : "پرونده رد شد و دلیل آن در سوابق ثبت شد.");
      } else if (pendingReview.kind === "owner" && pendingReview.propertyId && pendingReview.ownerId) {
        const key = `${pendingReview.propertyId}:${pendingReview.ownerId}`;
        setBusyOwnerId(key);
        await reviewVerificationOwner(pendingReview.propertyId, pendingReview.ownerId, pendingReview.nextStatus, note);
        setMessage(`${labels[pendingReview.nextStatus]} انجام شد؛ عامل، زمان، دلیل و تغییر وضعیت در تاریخچه ثبت شد.`);
      }
      setPendingReview(null);
      setOffset(0);
      setReload((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ثبت تصمیم ناموفق بود.");
    } finally {
      setBusyId(null);
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
        : <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[1150px] text-right text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3">رکورد پرونده</th>
                <th className="p-3">مشخصات ملک</th>
                <th className="p-3">وضعیت و یادداشت</th>
                <th className="p-3">رکوردهای مالکیت</th>
                <th className="p-3">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((item) => (
                <tr key={item.id} className="border-t border-slate-200 align-top">
                  <td className="p-3">
                    <p className="font-bold">پرونده تأیید ملک</p>
                    <p className="mt-1 break-all font-mono text-xs text-slate-500" dir="ltr">{item.id}</p>
                    <p className="mt-2 text-xs text-slate-500">ثبت: {formatPersianDateTime(item.createdAt)}</p>
                  </td>
                  <td className="p-3">
                    <p className="font-bold">{item.property.city}، {item.property.district}</p>
                    <p className="mt-1">{item.property.propertyType}</p>
                    <p className="mt-1 max-w-xs whitespace-pre-wrap leading-6 text-slate-600">{item.property.address}</p>
                    <p className="mt-2 break-all font-mono text-xs text-slate-500" dir="ltr">شناسه ملک: {item.propertyId}</p>
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${item.status === "VERIFIED" ? "bg-emerald-100 text-emerald-800" : item.status === "REJECTED" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-900"}`}>
                      {({ PENDING: "در انتظار", VERIFIED: "تأییدشده", REJECTED: "ردشده" })[item.status]}
                    </span>
                    {item.notes && <p className="mt-2 max-w-xs whitespace-pre-wrap leading-6 text-slate-600">یادداشت: {item.notes}</p>}
                  </td>
                  <td className="p-3">
                    {item.property.owners.length === 0 ? <span className="text-slate-500">مالک مرتبط ثبت نشده</span> : (
                      <div className="min-w-[250px] space-y-3">
                        {item.property.owners.map((owner) => {
                          const ownerBusyKey = `${item.propertyId}:${owner.ownerId}`;
                          return (
                            <div key={owner.ownerId} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                              <p className="font-semibold">{owner.owner.firstName} {owner.owner.lastName}</p>
                              <p className="mt-1 text-xs text-slate-500">شناسه مالک: <span dir="ltr" className="font-mono">{owner.ownerId}</span></p>
                              <p className="mt-1 text-xs text-slate-600">وضعیت مالکیت: {({ PENDING: "در انتظار", VERIFIED: "تأییدشده", REJECTED: "ردشده" })[owner.verificationStatus]}</p>
                              {owner.verificationStatus !== "VERIFIED" && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {owner.verificationStatus === "PENDING" && <>
                                    <button type="button" disabled={busyOwnerId === ownerBusyKey} onClick={() => void reviewOwner(item.propertyId, owner.ownerId, "VERIFIED")} className="rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-50">تأیید مالک</button>
                                    <button type="button" disabled={busyOwnerId === ownerBusyKey} onClick={() => void reviewOwner(item.propertyId, owner.ownerId, "REJECTED")} className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-700 disabled:opacity-50">رد مالک</button>
                                  </>}
                                  {owner.verificationStatus === "REJECTED" && <button type="button" disabled={busyOwnerId === ownerBusyKey} onClick={() => void reviewOwner(item.propertyId, owner.ownerId, "PENDING")} className="rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs font-bold text-amber-900 disabled:opacity-50">بازگرداندن به انتظار</button>}
                                  {busyOwnerId === ownerBusyKey && <span className="text-xs text-slate-500">در حال ثبت...</span>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    {item.status === "PENDING" ? (
                      <div className="flex min-w-[120px] flex-col items-start gap-2">
                        <button type="button" disabled={busyId === item.id} onClick={() => void reviewCase(item, "VERIFIED")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> تأیید پرونده</button>
                        <button type="button" disabled={busyId === item.id} onClick={() => void reviewCase(item, "REJECTED")} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50"><XCircle className="h-4 w-4" /> رد پرونده</button>
                        {busyId === item.id && <span className="text-xs text-slate-500">در حال ثبت...</span>}
                      </div>
                    ) : <span className="text-xs text-slate-500">عملیات رسیدگی انجام شده</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
      <div className="flex items-center justify-between gap-3"><button type="button" disabled={loading || offset === 0} onClick={() => setOffset(Math.max(0, offset - 25))} className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-40">قبلی</button><span className="text-xs text-slate-500">{Math.min(total, offset + 25).toLocaleString("fa-IR")} از {total.toLocaleString("fa-IR")}</span><button type="button" disabled={loading || offset + 25 >= total} onClick={() => setOffset(offset + 25)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-40">بعدی</button></div>
      <Modal open={Boolean(pendingReview)} title={pendingReview?.title ?? "ثبت تصمیم"} description="یادداشت یا دلیل تصمیم را ثبت کنید. این اطلاعات در سوابق مدیریتی ذخیره می‌شود." onClose={() => setPendingReview(null)}>
        <form onSubmit={submitReview} className="space-y-4">
          <label className="block space-y-1.5 text-sm font-semibold">{pendingReview?.kind === "case" && pendingReview.nextStatus === "VERIFIED" ? "یادداشت تأیید (اختیاری)" : "دلیل یا توضیح تصمیم"}<textarea rows={4} maxLength={2000} minLength={pendingReview?.kind === "owner" || pendingReview?.nextStatus === "REJECTED" ? 3 : undefined} required={pendingReview?.kind === "owner" || pendingReview?.nextStatus === "REJECTED"} value={reviewNotesDraft} onChange={(event) => setReviewNotesDraft(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setPendingReview(null)} className="rounded-lg border px-4 py-2.5 text-sm">انصراف</button><button type="submit" disabled={Boolean(busyId || busyOwnerId)} className="rounded-lg bg-[#043873] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">ثبت تصمیم</button></div>
        </form>
      </Modal>
    </section>
  );
}
