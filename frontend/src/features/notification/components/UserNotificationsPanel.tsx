"use client";

import { Bell, Check, LoaderCircle } from "lucide-react";
import { useUserNotifications } from "@/features/notification/hooks/useUserNotifications";

export function UserNotificationsPanel({ userId }: { userId: string }) {
  const { items, loading, busyId, error, load, markRead } = useUserNotifications(userId);

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
      {loading ? (
        <div className="mt-5 flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />در حال دریافت اعلان‌ها...</div>
      ) : items.length === 0 ? (
        <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">در حال حاضر اعلانی برای نمایش وجود ندارد.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <article key={item.id} className={`rounded-xl border p-4 ${item.isRead ? "border-slate-200" : "border-blue-200 bg-blue-50/30"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold">{item.title}</h3>
                  <p className="mt-1 text-sm leading-7 text-slate-600">{item.message}</p>
                  <time className="mt-2 block text-xs text-slate-400">{new Date(item.createdAt).toLocaleString("fa-IR")}</time>
                </div>
                {!item.isRead && (
                  <button type="button" onClick={() => void markRead(item.id)} disabled={busyId === item.id} aria-label="علامت‌گذاری به‌عنوان خوانده‌شده" className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50">
                    {busyId === item.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} خواندم
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
