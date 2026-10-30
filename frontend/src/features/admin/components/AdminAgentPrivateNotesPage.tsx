"use client";

import { useEffect, useState } from "react";

type AdminNote = {
  id: string;
  agentId?: string;
  entityType: string;
  entityId: string;
  note: string;
  updatedAt: string;
  agent: { id: string; firstName: string; lastName: string; user: { mobile: string } };
};

const API = process.env.NEXT_PUBLIC_API_URL || "/api";

export default function AdminAgentPrivateNotesPage() {
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    const response = await fetch(`${API}/admin/agent-private-notes`, {
      credentials: "include",
      cache: "no-store",
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || "دریافت یادداشت‌ها ناموفق بود.");
    const result: AdminNote[] = Array.isArray(body.notes) ? body.notes : [];
    setNotes(result);
    setDrafts(Object.fromEntries(result.map((item) => [item.id, item.note])));
  }

  useEffect(() => {
    void Promise.resolve().then(() => load())
      .catch((cause) => setError(cause instanceof Error ? cause.message : "خطا در دریافت یادداشت‌ها."))
      .finally(() => setLoading(false));
  }, []);

  async function save(note: AdminNote) {
    setSavingId(note.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`${API}/admin/agent-private-notes`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: note.agent.id,
          entityType: note.entityType,
          entityId: note.entityId,
          note: drafts[note.id] ?? "",
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "ذخیره یادداشت ناموفق بود.");
      setMessage("یادداشت با موفقیت ذخیره شد.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ذخیره یادداشت ناموفق بود.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section dir="rtl" className="space-y-4 text-slate-900">
      <header className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-bold">یادداشت‌های مشاوران</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          این بخش فقط برای مدیر ارشد هشتی قابل دسترسی است. ویرایش هر یادداشت در محدوده همان مشاور ذخیره می‌شود؛ یادداشت خصوصی به اطلاعات عمومی ملک یا پروفایل تبدیل نمی‌شود.
        </p>
      </header>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      {loading ? <p className="rounded-xl border bg-white p-5">در حال دریافت...</p>
        : notes.length === 0 ? <p className="rounded-xl border bg-white p-5">یادداشتی ثبت نشده است.</p>
          : <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full min-w-[1050px] text-right text-sm"><thead className="bg-slate-100"><tr><th className="p-3">مشاور</th><th className="p-3">مورد مرتبط</th><th className="p-3">توضیحات خصوصی</th><th className="p-3">آخرین تغییر</th><th className="p-3">عملیات</th></tr></thead><tbody>{notes.map((note) => (
            <tr key={note.id} className="border-t border-slate-200 align-top">
              <td className="p-3"><p className="font-semibold">{note.agent.firstName} {note.agent.lastName}</p><p dir="ltr" className="mt-1 text-xs text-slate-500">{note.agent.user.mobile}</p><p dir="ltr" className="mt-1 break-all font-mono text-xs text-slate-400">{note.agent.id}</p></td>
              <td className="p-3"><p>{note.entityType === "property" ? "ملک" : note.entityType === "owner" ? "مالک" : note.entityType === "request" ? "درخواست" : "مشتری"}</p><p dir="ltr" className="mt-1 break-all font-mono text-xs text-slate-500">{note.entityId}</p></td>
              <td className="min-w-[360px] p-3"><textarea aria-label={`یادداشت ${note.entityId}`} rows={4} maxLength={10000} value={drafts[note.id] ?? ""} onChange={(event) => setDrafts((current) => ({ ...current, [note.id]: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white p-3 font-normal leading-6" /></td>
              <td className="whitespace-nowrap p-3">{new Date(note.updatedAt).toLocaleString("fa-IR")}</td>
              <td className="p-3"><button type="button" disabled={savingId !== null} onClick={() => void save(note)} className="whitespace-nowrap rounded-lg bg-[#062a5b] px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{savingId === note.id ? "در حال ذخیره..." : "ذخیره توضیحات"}</button></td>
            </tr>
          ))}</tbody></table></div>}
    </section>
  );
}
