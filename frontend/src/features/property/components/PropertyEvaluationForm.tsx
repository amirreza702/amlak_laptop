"use client";

import { useEffect, useState, type FormEvent } from "react";
import { getCurrentUser, type UserPublic } from "@/features/auth/api/authApi";

type EvaluatorRole = "CUSTOMER" | "OWNER" | "AGENT";

export function PropertyEvaluationForm({ propertyId, listingStatus }: { propertyId: string; listingStatus?: string | null }) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [checking, setChecking] = useState(true);
  const [score, setScore] = useState("5");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getCurrentUser().then((current) => {
      if (active) setUser(current);
    }).catch(() => {
      if (active) setUser(null);
    }).finally(() => {
      if (active) setChecking(false);
    });
    return () => { active = false; };
  }, []);

  if (checking || listingStatus !== "PUBLISHED" || !user || !["CUSTOMER", "OWNER", "AGENT"].includes(user.role)) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const numericScore = Number(score);
    if (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > 5 || Math.round(numericScore * 100) !== numericScore * 100) {
      setError("امتیاز باید عددی بین صفر تا پنج با حداکثر دو رقم اعشار باشد.");
      setSaving(false);
      return;
    }
    const role = user!.role as EvaluatorRole;
    try {
      const response = await fetch((process.env.NEXT_PUBLIC_API_URL || "/api") + "/evaluations", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: role + "_TO_PROPERTY",
          propertyId,
          score: numericScore,
          comment: comment.trim() || undefined,
        }),
      });
      const body = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) throw new Error(body.message || "ثبت ارزیابی ناموفق بود.");
      setMessage("ارزیابی شما ثبت شد.");
      setComment("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ثبت ارزیابی ناموفق بود.");
    } finally {
      setSaving(false);
    }
  }

  return <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4" aria-label="ارزیابی ملک">
    <h2 className="font-bold text-slate-900">ارزیابی این ملک</h2>
    <p className="mt-1 text-sm text-slate-600">امتیاز شما در مقیاس صفر تا پنج ثبت می‌شود و فقط در بخش نظارتی مدیر ارشد هشتی نمایش داده خواهد شد.</p>
    <form onSubmit={submit} className="mt-3 grid gap-3 sm:grid-cols-[150px_minmax(0,1fr)_auto]">
      <label className="text-sm">امتیاز از ۵<input required type="number" min="0" max="5" step="0.01" value={score} onChange={(event) => setScore(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
      <label className="text-sm">توضیح (اختیاری)<input maxLength={1000} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="نظر کوتاه درباره ملک" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
      <button disabled={saving} className="self-end rounded-lg bg-[#043873] px-4 py-2 font-bold text-white disabled:opacity-50">{saving ? "در حال ثبت…" : "ثبت ارزیابی"}</button>
    </form>
    {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700">{message}</p>}
  </section>;
}
