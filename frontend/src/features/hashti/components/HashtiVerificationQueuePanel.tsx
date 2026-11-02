"use client";
import { RecordDetailsRow } from "@/shared/components/RecordDetailsRow";
import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, LoaderCircle, RefreshCw, Search, XCircle } from "lucide-react";
import { Modal } from "@/shared/components/Modal";
import { formatPersianDateTime } from "@/shared/utils/date";
import { getOwnerVerificationQueue, reviewVerificationOwner } from "../api/hashtiVerificationQueueApi";
import type { OwnerVerificationQueueProperty, VerificationStatus } from "../types/hashtiVerificationQueue";

const statusLabels: Record<VerificationStatus, string> = {
  PENDING: "در انتظار بررسی", VERIFIED: "تأییدشده", REJECTED: "ردشده",
};

export function HashtiVerificationQueuePanel() {
  const [status, setStatus] = useState<VerificationStatus | "ALL">("PENDING");
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [properties, setProperties] = useState<OwnerVerificationQueueProperty[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busyOwnerId, setBusyOwnerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [pendingReview, setPendingReview] = useState<{ propertyId: string; ownerId: string; nextStatus: VerificationStatus; title: string } | null>(null);
  const [reviewNotesDraft, setReviewNotesDraft] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError(null);
      const params = new URLSearchParams({ status, limit: "25", offset: String(offset) });
      if (appliedQuery.trim()) params.set("query", appliedQuery.trim());
      try {
        const result = await getOwnerVerificationQueue(params);
        if (active) { setProperties(result.properties); setTotal(result.pagination.total); }
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : "دریافت صف تأیید مالکیت ناموفق بود.");
          setProperties([]); setTotal(0);
        }
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [status, appliedQuery, offset, reload]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault(); setOffset(0); setAppliedQuery(query);
  };
  const reviewOwner = (propertyId: string, ownerId: string, nextStatus: VerificationStatus) => {
    const title = nextStatus === "VERIFIED" ? "تأیید مالکیت" : nextStatus === "REJECTED" ? "رد مالکیت" : "بازگرداندن مالکیت به انتظار";
    setPendingReview({ propertyId, ownerId, nextStatus, title });
    setReviewNotesDraft(""); setError(null); setMessage(null);
  };
  const submitReview = async (event: FormEvent) => {
    event.preventDefault();
    if (!pendingReview) return;
    const note = reviewNotesDraft.trim();
    if (note.length < 3) { setError("برای ثبت تصمیم درباره مالک، دلیل حداقل ۳ کاراکتری لازم است."); return; }
    const key = `${pendingReview.propertyId}:${pendingReview.ownerId}`;
    setBusyOwnerId(key); setError(null); setMessage(null);
    try {
      await reviewVerificationOwner(pendingReview.propertyId, pendingReview.ownerId, pendingReview.nextStatus, note);
      setMessage(`${pendingReview.title} انجام شد؛ عامل، زمان، دلیل و تغییر وضعیت در تاریخچه ثبت شد.`);
      setPendingReview(null); setOffset(0); setReload((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ثبت تصمیم ناموفق بود.");
    } finally { setBusyOwnerId(null); }
  };

  return <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" dir="rtl">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 className="text-lg font-bold">صف بررسی و تأیید مالکیت</h2>
        <p className="mt-1 text-sm text-slate-600">این صف مستقیماً از وضعیت مالکیت هر ملک ساخته می‌شود و به پرونده مدارک قدیمی وابسته نیست.</p>
      </div>
      <button type="button" disabled={loading} onClick={() => setReload((value) => value + 1)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">
        {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} تازه‌سازی
      </button>
    </div>
    <form onSubmit={submitSearch} className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
      <label className="space-y-1 text-sm">جست‌وجو<input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="شهر، محله، نشانی یا نام مالک" /></label>
      <label className="space-y-1 text-sm">وضعیت مالکیت<select value={status} onChange={(event) => { setStatus(event.target.value as VerificationStatus | "ALL"); setOffset(0); }} className="w-full rounded-lg border border-slate-300 px-3 py-2">
        <option value="PENDING">در انتظار بررسی</option><option value="VERIFIED">تأییدشده</option><option value="REJECTED">ردشده</option><option value="ALL">همه وضعیت‌ها</option>
      </select></label>
      <div className="flex items-end"><button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#043873] px-4 py-2.5 text-sm font-bold text-white"><Search className="h-4 w-4" /> جست‌وجو</button></div>
    </form>
    {error && !pendingReview && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    <p className="text-sm text-slate-600">تعداد املاک منطبق: {total.toLocaleString("fa-IR")}</p>
    {loading ? <p className="flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" /> در حال دریافت...</p>
      : !properties.length ? <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">ملکی با این وضعیت مالکیت پیدا نشد.</p>
      : <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[950px] text-right text-sm">
          <thead className="bg-slate-100"><tr><th className="p-3">مشخصات ملک</th><th className="p-3">مالکین مرتبط و وضعیت</th></tr></thead>
          <tbody>{properties.map((item) => <RecordDetailsRow key={item.id} record={item} title="ملک" className="border-t border-slate-200 align-top">
            <td className="p-3">
              <p className="font-bold">{item.city}، {item.district}</p><p className="mt-1">{item.propertyType}</p>
              <p className="mt-1 max-w-xs whitespace-pre-wrap leading-6 text-slate-600">{item.address}</p>
              <p className="mt-2 text-xs text-slate-500">ثبت ملک: {formatPersianDateTime(item.createdAt)}</p>
            </td>
            <td className="p-3">{item.owners.length === 0 ? <span className="text-slate-500">مالک مرتبطی با این وضعیت وجود ندارد.</span> : <div className="min-w-[380px] space-y-3">
              {item.owners.map((owner) => {
                const key = `${item.id}:${owner.ownerId}`;
                return <div key={owner.ownerId} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <p className="font-semibold">{owner.owner.firstName} {owner.owner.lastName}{owner.isPrimary ? " · مالک اصلی" : ""}</p>
                  <p className="mt-1 text-xs text-slate-600">شماره همراه: <span dir="ltr">{owner.owner.user.mobile}</span> · سهم: {owner.share} دانگ</p>
                  <p className="mt-1 text-xs text-slate-600">وضعیت: {statusLabels[owner.verificationStatus]}</p>
                  {owner.verifiedAt && <p className="mt-1 text-xs text-slate-500">زمان تأیید: {formatPersianDateTime(owner.verifiedAt)}</p>}
                  {owner.verificationStatus !== "VERIFIED" && <div className="mt-2 flex flex-wrap gap-2">
                    {owner.verificationStatus === "PENDING" && <>
                      <button type="button" disabled={Boolean(busyOwnerId)} onClick={() => reviewOwner(item.id, owner.ownerId, "VERIFIED")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" /> تأیید مالک</button>
                      <button type="button" disabled={Boolean(busyOwnerId)} onClick={() => reviewOwner(item.id, owner.ownerId, "REJECTED")} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-700 disabled:opacity-50"><XCircle className="h-3.5 w-3.5" /> رد مالک</button>
                    </>}
                    {owner.verificationStatus === "REJECTED" && <button type="button" disabled={Boolean(busyOwnerId)} onClick={() => reviewOwner(item.id, owner.ownerId, "PENDING")} className="rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs font-bold text-amber-900 disabled:opacity-50">بازگرداندن به انتظار</button>}
                    {busyOwnerId === key && <span className="text-xs text-slate-500">در حال ثبت...</span>}
                  </div>}
                </div>;
              })}
            </div>}</td>
          </RecordDetailsRow>)}</tbody>
        </table>
      </div>}
    <div className="flex items-center justify-between gap-3">
      <button type="button" disabled={loading || offset === 0} onClick={() => setOffset(Math.max(0, offset - 25))} className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-40">قبلی</button>
      <span className="text-xs text-slate-500">{Math.min(total, offset + 25).toLocaleString("fa-IR")} از {total.toLocaleString("fa-IR")}</span>
      <button type="button" disabled={loading || offset + 25 >= total} onClick={() => setOffset(offset + 25)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-40">بعدی</button>
    </div>
    <Modal open={Boolean(pendingReview)} title={pendingReview?.title ?? "ثبت تصمیم"} description="دلیل تصمیم را ثبت کنید. این اطلاعات در سوابق مدیریتی ملک ذخیره می‌شود." onClose={() => { setPendingReview(null); setError(null); }}>
      <form onSubmit={submitReview} className="space-y-4">
        <label className="block space-y-1.5 text-sm font-semibold">دلیل یا توضیح تصمیم<textarea rows={4} maxLength={2000} minLength={3} required value={reviewNotesDraft} onChange={(event) => setReviewNotesDraft(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => { setPendingReview(null); setError(null); }} className="rounded-lg border px-4 py-2.5 text-sm">انصراف</button>
          <button type="submit" disabled={Boolean(busyOwnerId)} className="rounded-lg bg-[#043873] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">ثبت تصمیم</button>
        </div>
      </form>
    </Modal>
  </section>;
}
