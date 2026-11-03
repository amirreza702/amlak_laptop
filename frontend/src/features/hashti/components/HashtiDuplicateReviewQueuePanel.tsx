"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, FileSearch, LoaderCircle, RefreshCw, XCircle } from "lucide-react";
import {
  decideHashtiDuplicateReview,
  getHashtiDuplicateReviewQueue,
  publishHashtiPropertyAfterDuplicateReview,
  rejectHashtiPropertyAfterDuplicateReview,
} from "@/features/hashti/api/hashtiApi";
import type { DuplicateReviewQueueProperty } from "@/features/hashti/types/hashti";

function scoreLabel(value: number) {
  return `${Math.round(value * 100).toLocaleString("fa-IR")}٪`;
}

const propertyLabels: Record<string, string> = {
  APARTMENT: "آپارتمان", HOUSE: "خانه", VILLA: "ویلا", LAND: "زمین",
  SHOP: "مغازه", OFFICE: "اداری", GARDEN: "باغ",
};

export function HashtiDuplicateReviewQueuePanel() {
  const [items, setItems] = useState<DuplicateReviewQueueProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getHashtiDuplicateReviewQueue();
      setItems(result.properties);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "دریافت صف بررسی مشابهت ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(() => load()); }, [load]);

  async function decide(reviewId: string, decision: "SAME_PROPERTY" | "DIFFERENT_PROPERTY") {
    setBusyId(reviewId);
    setError(null);
    setMessage(null);
    try {
      await decideHashtiDuplicateReview(reviewId, { decision, notes: null });
      setMessage(decision === "SAME_PROPERTY"
        ? "این کاندیدا به‌عنوان همان ملک ثبت شد."
        : "این کاندیدا به‌عنوان ملک متفاوت ثبت شد.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ثبت تصمیم مشابهت ناموفق بود.");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(propertyId: string) {
    setBusyId(propertyId);
    setError(null);
    setMessage(null);
    try {
      await rejectHashtiPropertyAfterDuplicateReview(propertyId);
      setMessage("به دلیل تشخیص تکراری بودن، آگهی رد شد.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "رد آگهی ناموفق بود.");
    } finally {
      setBusyId(null);
    }
  }

  async function publish(propertyId: string) {
    setBusyId(propertyId);
    setError(null);
    setMessage(null);
    try {
      await publishHashtiPropertyAfterDuplicateReview(propertyId);
      setMessage("پس از تعیین تکلیف مشابهت‌ها، ملک با موفقیت منتشر شد.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "انتشار ملک ناموفق بود.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold"><FileSearch className="h-5 w-5 text-[#043873]" /> صف بررسی بیشتر مشابهت املاک</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">املاکی که بیشترین تشابه آن‌ها در شعاع ۱۰۰۰ متری به آستانه ۸۰٪ رسیده، در این صف نمایش داده می‌شوند. انتشار فقط پس از تعیین تکلیف تمام کاندیداها از همین بخش انجام می‌شود.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} تازه‌سازی
        </button>
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}

      {loading && items.length === 0 ? (
        <p className="flex items-center gap-2 py-5 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" /> در حال دریافت صف مشابهت...</p>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">در حال حاضر ملکی در صف بررسی بیشتر مشابهت وجود ندارد.</p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const allReviewed = item.reviews.length > 0 && item.reviews.every((review) => review.decision !== null);
            const allDifferent = allReviewed && item.reviews.every((review) => review.decision === "DIFFERENT_PROPERTY");
            const hasSameProperty = item.reviews.some((review) => review.decision === "SAME_PROPERTY");
            return (
              <article key={item.property.id} className="overflow-hidden rounded-xl border border-slate-200">
                <div className="flex flex-wrap items-start justify-between gap-3 bg-slate-50 p-4">
                  <div>
                    <h3 className="font-bold">{propertyLabels[item.property.propertyType] ?? item.property.propertyType} · {item.property.city}، {item.property.district || "بدون محله"}</h3>
                    <p className="mt-1 text-xs text-slate-600">{item.property.area ?? "—"} متر · {item.property.rooms ?? "—"} اتاق · شناسه: <span dir="ltr" className="font-mono">{item.property.id}</span></p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-900">بیشترین تشابه: {scoreLabel(item.maximumSimilarityScore)}</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-right text-sm">
                    <thead className="bg-white text-slate-500"><tr><th className="p-3">ملک کاندید</th><th className="p-3">مشخصات</th><th className="p-3">درصد تشابه</th><th className="p-3">تصمیم</th><th className="p-3">عملیات</th></tr></thead>
                    <tbody>
                      {item.reviews.map((review) => (
                        <tr key={review.id} className="border-t border-slate-100">
                          <td className="p-3"><p className="font-semibold">{propertyLabels[review.candidateProperty.propertyType] ?? review.candidateProperty.propertyType} · {review.candidateProperty.city}، {review.candidateProperty.district || "بدون محله"}</p><p className="mt-1 break-all font-mono text-[11px] text-slate-400" dir="ltr">{review.candidateProperty.id}</p></td>
                          <td className="p-3">{review.candidateProperty.area ?? "—"} متر · {review.candidateProperty.rooms ?? "—"} اتاق</td>
                          <td className="p-3 font-bold">{scoreLabel(review.similarityScore)}</td>
                          <td className="p-3">{review.decision === "SAME_PROPERTY" ? <span className="font-bold text-red-700">همان ملک</span> : review.decision === "DIFFERENT_PROPERTY" ? <span className="font-bold text-emerald-700">ملک متفاوت</span> : <span className="font-bold text-amber-700">در انتظار تصمیم</span>}</td>
                          <td className="p-3">
                            {review.decision === null ? (
                              <div className="flex flex-wrap gap-2">
                                <button type="button" disabled={busyId === review.id} onClick={() => void decide(review.id, "SAME_PROPERTY")} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50"><XCircle className="h-4 w-4" /> همان ملک</button>
                                <button type="button" disabled={busyId === review.id} onClick={() => void decide(review.id, "DIFFERENT_PROPERTY")} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-800 disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> ملک متفاوت</button>
                              </div>
                            ) : <span className="text-xs text-slate-500">تصمیم ثبت شده</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4">
                  {hasSameProperty ? (
                    <p className="text-sm font-semibold text-red-700">حداقل یک کاندیدا همان ملک تشخیص داده شده است؛ انتشار مجاز نیست.</p>
                  ) : allDifferent ? (
                    <p className="text-sm text-emerald-800">تمام کاندیداها به‌عنوان املاک متفاوت بررسی شده‌اند.</p>
                  ) : (
                    <p className="text-sm text-amber-800">برای انتشار، ابتدا تصمیم تمام کاندیداها را ثبت کنید.</p>
                  )}
                  {allReviewed && hasSameProperty && (
                    <button type="button" disabled={busyId === item.property.id} onClick={() => void reject(item.property.id)} className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2.5 text-sm font-bold text-red-700 disabled:opacity-50">
                      {busyId === item.property.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                      رد انتشار به علت تکراری بودن
                    </button>
                  )}
                  {allDifferent && (
                    <button type="button" disabled={busyId === item.property.id} onClick={() => void publish(item.property.id)} className="inline-flex items-center gap-2 rounded-lg bg-[#043873] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                      {busyId === item.property.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      تأیید انتشار · بیشترین تشابه {scoreLabel(item.maximumSimilarityScore)}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
