"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "@/shared/components/Modal";

type EvaluationType = "CUSTOMER_TO_AGENT" | "OWNER_TO_AGENT" | "CUSTOMER_TO_PROPERTY" | "AGENT_TO_PROPERTY";

export function EvaluationControl({ type, agentId, propertyId }: { type: EvaluationType; agentId?: string; propertyId?: string }) {
  const [evaluated, setEvaluated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState("5");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ type });
    if (agentId) query.set("agentId", agentId);
    if (propertyId) query.set("propertyId", propertyId);
    fetch((process.env.NEXT_PUBLIC_API_URL || "/api") + "/evaluations/me?" + query.toString(), { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => ({})) as { evaluated?: boolean };
        if (!response.ok) throw new Error("وضعیت ارزش‌گذاری دریافت نشد.");
        if (active) setEvaluated(Boolean(body.evaluated));
      }).catch(() => undefined).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [type, agentId, propertyId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const numericScore = Number(score);
    if (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > 5 || Math.round(numericScore * 100) !== numericScore * 100) {
      setError("امتیاز باید بین صفر تا پنج و حداکثر با دو رقم اعشار باشد."); setSaving(false); return;
    }
    try {
      const response = await fetch((process.env.NEXT_PUBLIC_API_URL || "/api") + "/evaluations", {
        method: "POST", credentials: "include", cache: "no-store", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, agentId, propertyId, score: numericScore, comment: comment.trim() || undefined }),
      });
      const body = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) throw new Error(body.message || "ثبت ارزش‌گذاری ناموفق بود.");
      setEvaluated(true); setOpen(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "ثبت ارزش‌گذاری ناموفق بود."); }
    finally { setSaving(false); }
  }

  if (checking) return <span className="text-xs text-slate-400">بررسی…</span>;
  if (evaluated) return <span className="inline-flex rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">ثبت شده</span>;
  return <>
    <button type="button" onClick={(event) => { event.stopPropagation(); setError(""); setOpen(true); }} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">ارزش‌گذاری</button>
    <Modal open={open} title="ارزش‌گذاری" description="هر هدف فقط یک‌بار توسط شما ارزش‌گذاری می‌شود." onClose={() => { if (!saving) setOpen(false); }}>
      <form onSubmit={submit} className="space-y-3" dir="rtl">
        <label className="block space-y-1 text-sm font-medium">امتیاز از ۵<input required type="number" min="0" max="5" step="0.01" value={score} onChange={(event) => setScore(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        <label className="block space-y-1 text-sm font-medium">توضیح (اختیاری)<textarea maxLength={1000} rows={3} value={comment} onChange={(event) => setComment(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" disabled={saving} onClick={() => setOpen(false)} className="rounded-lg border px-4 py-2 text-sm">انصراف</button><button type="submit" disabled={saving} className="rounded-lg bg-[#043873] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? "در حال ثبت…" : "ثبت ارزش‌گذاری"}</button></div>
      </form>
    </Modal>
  </>;
}
