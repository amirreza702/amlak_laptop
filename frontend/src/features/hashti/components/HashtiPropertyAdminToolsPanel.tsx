"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, LoaderCircle, UserPlus, TimerReset } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(API_URL + path, {
    credentials: "include",
    cache: "no-store",
    ...init,
  });
  const body = await response.json().catch(() => ({})) as { message?: string };
  if (!response.ok) {
    if (body.message === "Authentication required") {
      throw new Error("برای انجام عملیات دوباره وارد شوید.");
    }
    throw new Error(body.message || "درخواست ناموفق بود.");
  }
  return body as T;
}

/**
 * Hashti-only tools for property ownership management and listing expiry.
 * Destructive archive operations are intentionally not exposed by this panel.
 */
export function HashtiPropertyAdminToolsPanel() {
  const [propertyId, setPropertyId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [share, setShare] = useState("6");
  const [isPrimary, setIsPrimary] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);
  const [expirePropertyId, setExpirePropertyId] = useState("");
  const [expireBusy, setExpireBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const addOwner = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedPropertyId = propertyId.trim();
    const normalizedOwnerId = ownerId.trim();
    const parsedShare = Number(share);

    if (!normalizedPropertyId || !normalizedOwnerId) {
      setError("شناسه ملک و شناسه مالک الزامی هستند.");
      return;
    }
    if (!Number.isFinite(parsedShare) || parsedShare <= 0 || parsedShare > 6) {
      setError("سهم مالکیت باید بیشتر از صفر و حداکثر ۶ دانگ باشد.");
      return;
    }

    setLinkBusy(true);
    setError(null);
    setMessage(null);
    try {
      await requestJson("/properties/" + encodeURIComponent(normalizedPropertyId) + "/owners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: normalizedOwnerId,
          share: parsedShare,
          isPrimary,
        }),
      });
      setMessage("مالک به ملک متصل شد؛ رخداد در تاریخچه مالکیت و گزارش مدیریتی ثبت شد.");
      setOwnerId("");
      setShare("6");
      setIsPrimary(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "افزودن مالک ناموفق بود.");
    } finally {
      setLinkBusy(false);
    }
  };

  const expireListing = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedPropertyId = expirePropertyId.trim();
    if (!normalizedPropertyId) {
      setError("شناسه ملک الزامی است.");
      return;
    }

    setExpireBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await requestJson<{
        expired: boolean;
        statusChanged: boolean;
        listing: { status: string };
        confirmUntil: string | null;
      }>("/properties/" + encodeURIComponent(normalizedPropertyId) + "/expire", {
        method: "PUT",
      });

      if (result.statusChanged) {
        setMessage("آگهی به وضعیت منقضی تغییر کرد؛ عامل، زمان و وضعیت قبل و بعد در تاریخچه ثبت شد.");
      } else if (result.expired) {
        setMessage("مهلت تأیید گذشته است، اما وضعیت آگهی نیاز به تغییر نداشت.");
      } else {
        setMessage("مهلت تأیید ملک هنوز تمام نشده یا برای آن تعیین نشده است؛ تغییری اعمال نشد.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "بررسی انقضای آگهی ناموفق بود.");
    } finally {
      setExpireBusy(false);
    }
  };

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" dir="rtl">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <UserPlus className="h-6 w-6 text-[#043873]" />
          مدیریت ارتباط مالک و ملک
        </h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          این عملیات از APIهای موجود استفاده می‌کنند و ثبت رویدادهای مالکیت و انقضا در سمت بک‌اند انجام می‌شود.
        </p>
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={addOwner} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="font-bold text-slate-900">افزودن مالک به ملک</h3>
          <p className="text-sm leading-6 text-slate-600">شناسه مالک را از پنل مدیریت کاربران و شناسه ملک را از اطلاعات همان ملک بردار.</p>
          <label className="block space-y-1 text-sm">
            <span>شناسه ملک</span>
            <input required maxLength={200} value={propertyId} onChange={(event) => setPropertyId(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" dir="ltr" />
          </label>
          <label className="block space-y-1 text-sm">
            <span>شناسه پروفایل مالک</span>
            <input required maxLength={200} value={ownerId} onChange={(event) => setOwnerId(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" dir="ltr" />
          </label>
          <label className="block space-y-1 text-sm">
            <span>سهم مالکیت (دانگ)</span>
            <input required type="number" min="0.01" max="6" step="0.01" value={share} onChange={(event) => setShare(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" dir="ltr" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isPrimary} onChange={(event) => setIsPrimary(event.target.checked)} className="h-4 w-4" />
            تعیین به‌عنوان مالک اصلی
          </label>
          <button type="submit" disabled={linkBusy} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#043873] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
            {linkBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            ثبت ارتباط مالکیت
          </button>
        </form>

        <form onSubmit={expireListing} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="flex items-center gap-2 font-bold text-slate-900">
            <TimerReset className="h-5 w-5 text-[#043873]" />
            بررسی انقضای آگهی
          </h3>
          <p className="text-sm leading-6 text-slate-600">
            آگهی فقط وقتی به EXPIRED تغییر می‌کند که مهلت تأیید گذشته باشد و وضعیت فعلی آن PUBLISHED باشد.
          </p>
          <label className="block space-y-1 text-sm">
            <span>شناسه ملک</span>
            <input required maxLength={200} value={expirePropertyId} onChange={(event) => setExpirePropertyId(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" dir="ltr" />
          </label>
          <button type="submit" disabled={expireBusy} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#043873] px-4 py-2.5 text-sm font-bold text-[#043873] disabled:opacity-50">
            {expireBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <TimerReset className="h-4 w-4" />}
            بررسی و ثبت انقضا
          </button>
          <p className="text-xs leading-6 text-slate-500">این عملیات وضعیت آگهی را بررسی می‌کند و جدول‌ها یا سوابق موجود را حذف نمی‌کند.</p>
        </form>
      </div>
    </section>
  );
}
