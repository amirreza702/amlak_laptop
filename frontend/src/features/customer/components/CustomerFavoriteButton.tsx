"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, LoaderCircle } from "lucide-react";
import { AUTH_STATE_CHANGE_EVENT, getCurrentUser } from "@/features/auth/api/authApi";
import { getCurrentCustomerProfile } from "../api/customerSearchRequestApi";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

type FavoriteState = "checking" | "anonymous" | "wrong-role" | "ready";

export function CustomerFavoriteButton({ propertyId }: { propertyId: string }) {
  const [state, setState] = useState<FavoriteState>("checking");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadFavoriteState = async () => {
      setState("checking");
      setCustomerId(null);
      try {
        const user = await getCurrentUser();
        if (!active) return;
        if (user.role !== "CUSTOMER") {
          setState("wrong-role");
          setIsFavorite(false);
          return;
        }
        const profile = await getCurrentCustomerProfile();
        if (!active) return;
        setCustomerId(profile.id);
        const response = await fetch(
          `${API_URL}/customers/${encodeURIComponent(profile.id)}/favorites/${encodeURIComponent(propertyId)}`,
          { credentials: "include", cache: "no-store" }
        );
        const data = await response.json().catch(() => ({})) as { isFavorite?: boolean; message?: string };
        if (!response.ok) throw new Error(data.message || "وضعیت علاقه‌مندی دریافت نشد.");
        if (!active) return;
        setIsFavorite(Boolean(data.isFavorite));
        setState("ready");
      } catch {
        if (active) {
          setIsFavorite(false);
          setState("anonymous");
        }
      }
    };

    const handleAuthStateChange = () => {
      void loadFavoriteState();
    };

    void loadFavoriteState();
    window.addEventListener(AUTH_STATE_CHANGE_EVENT, handleAuthStateChange);
    return () => {
      active = false;
      window.removeEventListener(AUTH_STATE_CHANGE_EVENT, handleAuthStateChange);
    };
  }, [propertyId]);

  const toggleFavorite = async () => {
    if (!customerId || state !== "ready") return;
    setIsBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(
        `${API_URL}/customers/${encodeURIComponent(customerId)}/favorites/${encodeURIComponent(propertyId)}`,
        {
          method: isFavorite ? "DELETE" : "POST",
          credentials: "include",
        }
      );
      const body = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) throw new Error(body.message || "تغییر علاقه‌مندی انجام نشد.");
      setIsFavorite((current) => !current);
      setMessage(isFavorite ? "ملک از علاقه‌مندی‌ها حذف شد." : "ملک به علاقه‌مندی‌ها اضافه شد.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "تغییر علاقه‌مندی انجام نشد.");
    } finally {
      setIsBusy(false);
    }
  };

  if (state === "checking") {
    return <button type="button" disabled className="inline-flex h-12 items-center justify-center gap-2 border border-slate-300 bg-white text-sm font-bold text-slate-700 disabled:opacity-60"><LoaderCircle className="h-4 w-4 animate-spin" /> بررسی حساب...</button>;
  }

  if (state === "anonymous" || state === "wrong-role") {
    return (
      <div className="space-y-2">
        <Link href="/request" className="flex h-12 items-center justify-center gap-2 border border-slate-300 bg-white text-sm font-bold text-slate-800 hover:bg-slate-50">
          <Heart className="h-4 w-4" /> ورود به حساب مشتری برای علاقه‌مندی
        </Link>
        {state === "wrong-role" && <p className="text-xs leading-5 text-slate-500">برای ذخیرهٔ علاقه‌مندی باید از حساب مشتری استفاده کنید.</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void toggleFavorite()}
        disabled={isBusy}
        aria-pressed={isFavorite}
        className={`flex h-12 w-full items-center justify-center gap-2 border text-sm font-bold transition disabled:opacity-60 ${isFavorite ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"}`}
      >
        {isBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />}
        {isBusy ? "در حال ذخیره..." : isFavorite ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
      </button>
      {message && <p role="status" className="text-xs text-emerald-700">{message}</p>}
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      <Link href="/customer" className="inline-block text-xs font-semibold text-[#043873] underline">مشاهده علاقه‌مندی‌های من</Link>
    </div>
  );
}
