"use client";

import { useState } from "react";
import { Bell, Check, LoaderCircle } from "lucide-react";
import { useUserNotifications } from "@/features/notification/hooks/useUserNotifications";
import { formatPersianDateTime } from "@/shared/utils/date";

export function UserNotificationsPanel({ userId }: { userId: string }) {
  const { items, loading, busyId, error, load, markRead } = useUserNotifications(userId);
  const [search, setSearch] = useState("");
  const visibleItems = items.filter((item) => JSON.stringify(item).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-[#043873]" />
          <h2 className="text-lg font-bold">اعلان‌ها</h2>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="text-sm font-semibold text-[#043873] disabled:opacity-50">
          {loading ? "در حال دریافت..." : "به‌روزرسانی"}
        </button>
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!loading && items.length > 0 && <input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="جست‌وجو در اعلان‌ها" placeholder="جست‌وجو در عنوان، پیام، زمان و وضعیت..." className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />}
      {loading ? (
        <div className="mt-5 flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />در حال دریافت اعلان‌ها...</div>
      ) : items.length === 0 ? (
        <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">در حال حاضر اعلانی برای نمایش وجود ندارد.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[680px] text-right text-sm"><thead className="bg-slate-100"><tr><th className="p-3">عنوان</th><th className="p-3">پیام</th><th className="p-3">زمان</th><th className="p-3">وضعیت</th><th className="p-3">عملیات</th></tr></thead><tbody>{visibleItems.map((item) => <tr key={item.id} className={`border-t border-slate-200 align-top ${item.isRead ? "" : "bg-blue-50/30"}`}><td className="p-3 font-semibold">{item.title}</td><td className="max-w-lg whitespace-pre-wrap p-3 leading-6 text-slate-600">{item.message}</td><td className="whitespace-nowrap p-3">{formatPersianDateTime(item.createdAt)}</td><td className="p-3">{item.isRead ? "خوانده‌شده" : "خوانده‌نشده"}</td><td className="p-3">{!item.isRead && <button type="button" onClick={() => void markRead(item.id)} disabled={busyId === item.id} aria-label="علامت‌گذاری به‌عنوان خوانده‌شده" className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50">{busyId === item.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} خواندم</button>}</td></tr>)}</tbody></table></div>
      )}
    </section>
  );
}
