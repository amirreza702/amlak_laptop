"use client";
import { useEffect, useState } from "react";

type Note = { id: string; entityType: "property" | "owner" | "customer"; entityId: string; note: string; updatedAt: string };
const API = process.env.NEXT_PUBLIC_API_URL || "/api";

export function AgentPrivateNotesPanel() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [entityType, setEntityType] = useState<Note["entityType"]>("property");
  const [entityId, setEntityId] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    const r = await fetch(`${API}/agents/me/private-notes`, { credentials: "include", cache: "no-store" });
    const b = await r.json();
    if (!r.ok) throw new Error(b.message || "دریافت یادداشت‌ها ناموفق بود.");
    setNotes(Array.isArray(b.notes) ? b.notes : []);
  }
  useEffect(() => { void load().catch(e => setMessage(String(e.message || e))); }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      const r = await fetch(`${API}/agents/me/private-notes`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entityType, entityId, note }) });
      const b = await r.json();
      if (!r.ok) throw new Error(b.message || "ذخیره یادداشت ناموفق بود.");
      setMessage(note.trim() ? "یادداشت ذخیره شد." : "یادداشت حذف شد.");
      await load();
    } catch (e) { setMessage(e instanceof Error ? e.message : "خطا در ذخیره یادداشت"); } finally { setBusy(false); }
  }
  return <section dir="rtl" className="space-y-4 text-slate-900">
    <header className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-xl font-bold">یادداشت‌های شخصی مشاور</h2><p className="mt-2 text-sm leading-6 text-slate-600">یادداشت‌ها در پایگاه داده ذخیره می‌شوند؛ فقط شما و مدیر ارشد هشتی به آن‌ها دسترسی دارید. برای حذف، متن را پاک و ذخیره کنید.</p></header>
    <form onSubmit={save} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1 text-sm font-semibold">نوع مورد<select className="w-full rounded-lg border p-2.5" value={entityType} onChange={e => setEntityType(e.target.value as Note["entityType"])}><option value="property">ملک</option><option value="owner">مالک</option><option value="customer">مشتری</option></select></label>
      <label className="space-y-1 text-sm font-semibold">شناسه مورد<input required value={entityId} onChange={e => setEntityId(e.target.value)} className="w-full rounded-lg border p-2.5" /></label></div>
      <label className="block space-y-1 text-sm font-semibold">توضیحات شخصی<textarea rows={5} maxLength={10000} value={note} onChange={e => setNote(e.target.value)} className="w-full rounded-lg border p-3 font-normal" /></label>
      {message && <p role="status" className="rounded-lg bg-slate-50 p-3 text-sm">{message}</p>}
      <button disabled={busy} className="rounded-lg bg-[#062a5b] px-4 py-2.5 font-bold text-white disabled:opacity-60">{busy ? "در حال ذخیره..." : "ذخیره یادداشت"}</button>
    </form>
    <section className="rounded-xl border border-slate-200 bg-white p-5"><h3 className="font-bold">یادداشت‌های ذخیره‌شده</h3>{notes.length ? <ul className="mt-3 space-y-2">{notes.map(n => <li key={n.id}><button type="button" onClick={() => { setEntityType(n.entityType); setEntityId(n.entityId); setNote(n.note); }} className="w-full rounded-lg border p-3 text-right"><strong>{n.entityType === "property" ? "ملک" : n.entityType === "owner" ? "مالک" : "مشتری"} · <span dir="ltr">{n.entityId}</span></strong><p className="mt-1 whitespace-pre-wrap text-sm">{n.note}</p></button></li>)}</ul> : <p className="mt-3 text-sm text-slate-500">یادداشتی ثبت نشده است.</p>}</section>
  </section>;
}