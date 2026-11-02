"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/features/auth/api/authApi";
import { getAdminPropertyMonitoring, type AdminPropertyMonitoringRecord } from "@/features/admin/api/adminApi";
import { formatPersianDateTime } from "@/shared/utils/date";

const PAGE_SIZE = 50;

export default function AdminPropertyMonitoringPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [records, setRecords] = useState<AdminPropertyMonitoringRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const user = await getCurrentUser();
        if (!active) return;
        const canView = user.role === "HASHTI" && user.isSuperAdmin === true;
        setAllowed(canView);
        if (!canView) return;
        const result = await getAdminPropertyMonitoring({ limit: PAGE_SIZE, offset });
        if (!active) return;
        setRecords(result.properties);
        setTotal(result.pagination.total);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "دریافت اطلاعات نظارتی ناموفق بود.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [offset]);

  return <main dir="rtl" className="space-y-5">
    <header>
      <p className="text-sm font-semibold text-amber-700">هشتی / نظارت مدیریتی</p>
      <h2 className="mt-1 text-2xl font-black">ارزیابی و علاقه‌مندی املاک</h2>
      <p className="mt-2 text-sm text-slate-600">این داده‌ها فقط برای مدیر ارشد هشتی قابل مشاهده‌اند. میانگین و تعدادها بر اساس کل سوابق محاسبه می‌شوند؛ در هر ملک، حداکثر ۱۰۰ ارزیابی و ۱۰۰ علاقه‌مندی آخر نمایش داده می‌شود.</p>
    </header>
    {loading && <p className="rounded-lg border bg-white p-4 text-sm">در حال دریافت اطلاعات…</p>}
    {allowed === false && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">این بخش فقط در اختیار مدیر ارشد هشتی است.</p>}
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {allowed && !loading && <p className="text-sm text-slate-600">تعداد کل املاک دارای سابقه انتشار: {total.toLocaleString("fa-IR")}</p>}
    {allowed && records.map((record) => <section key={record.id} className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 className="font-bold">{record.city}، {record.district} · {record.propertyType}</h3><p className="mt-1 text-sm text-slate-600">{record.address}</p><p className="mt-1 font-mono text-xs text-slate-400" dir="ltr">{record.id}</p></div>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-lg bg-slate-50 p-2"><strong>{record.averageScore === null ? "—" : record.averageScore.toFixed(2)}</strong><p className="text-xs text-slate-500">میانگین از ۵</p></div>
          <div className="rounded-lg bg-slate-50 p-2"><strong>{record.evaluationCount.toLocaleString("fa-IR")}</strong><p className="text-xs text-slate-500">ارزیابی</p></div>
          <div className="rounded-lg bg-slate-50 p-2"><strong>{record.favoriteCount.toLocaleString("fa-IR")}</strong><p className="text-xs text-slate-500">علاقه‌مندی</p></div>
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div><h4 className="mb-2 text-sm font-bold">ارزیابی‌ها</h4>{record.evaluations.length ? <ul className="space-y-2">{record.evaluations.map((evaluation) => <li key={evaluation.id} className="rounded-lg bg-slate-50 p-3 text-sm"><div className="flex justify-between gap-2"><span>{evaluation.type}</span><strong>{evaluation.score === null ? "بدون امتیاز" : evaluation.score + " از ۵"}</strong></div>{evaluation.comment && <p className="mt-1 text-slate-600">{evaluation.comment}</p>}<p className="mt-1 text-xs text-slate-400">{formatPersianDateTime(evaluation.createdAt)}</p></li>)}</ul> : <p className="text-sm text-slate-500">هنوز ارزیابی ثبت نشده است.</p>}</div>
        <div><h4 className="mb-2 text-sm font-bold">علاقه‌مندی مشتریان</h4>{record.favorites.length ? <ul className="space-y-2">{record.favorites.map((favorite, index) => <li key={favorite.createdAt + "-" + index} className="rounded-lg bg-slate-50 p-3 text-sm"><p>{favorite.customer.firstName} {favorite.customer.lastName}</p><p dir="ltr" className="mt-1 text-left text-xs text-slate-500">{favorite.customer.user.mobile}</p><p className="mt-1 text-xs text-slate-400">{formatPersianDateTime(favorite.createdAt)}</p></li>)}</ul> : <p className="text-sm text-slate-500">این ملک علاقه‌مندی ثبت‌شده ندارد.</p>}</div>
      </div>
    </section>)}
    {allowed && <div className="flex items-center justify-between gap-3 text-sm"><span className="text-slate-500">نمایش {Math.min(offset + 1, total).toLocaleString("fa-IR")} تا {Math.min(offset + PAGE_SIZE, total).toLocaleString("fa-IR")} از {total.toLocaleString("fa-IR")}</span><div className="flex gap-2"><button type="button" disabled={loading || offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} className="rounded-lg border px-3 py-2 disabled:opacity-40">قبلی</button><button type="button" disabled={loading || offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)} className="rounded-lg border px-3 py-2 disabled:opacity-40">بعدی</button></div></div>}
  </main>;
}
