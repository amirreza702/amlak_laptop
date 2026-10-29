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
    void load()
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
          : <div className="space-y-3">
            {notes.map((note) => (
              <article key={note.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <strong>{note.agent.firstName} {note.agent.lastName}</strong>
                  <span dir="ltr" className="text-sm text-slate-500">{note.agent.user.mobile}</span>
                </div>
                <p className="mt-2 text-sm font-semibold">
                  {note.entityType === "property" ? "ملک" : note.entityType === "owner" ? "مالک" : "مشتری"}
                  {" · "}
                  <span dir="ltr" className="font-mono">{note.entityId}</span>
                </p>
                <label className="mt-3 block text-sm font-semibold">
                  توضیحات خصوصی
                  <textarea
                    rows={4}
                    maxLength={10000}
                    value={drafts[note.id] ?? ""}
                    onChange={(event) => setDrafts((current) => ({ ...current, [note.id]: event.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3 font-normal leading-6"
                  />
                </label>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">آخرین تغییر: {new Date(note.updatedAt).toLocaleString("fa-IR")}</span>
                  <button
                    type="button"
                    disabled={savingId !== null}
                    onClick={() => void save(note)}
                    className="rounded-lg bg-[#062a5b] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {savingId === note.id ? "در حال ذخیره..." : "ذخیره توضیحات"}
                  </button>
                </div>
              </article>
            ))}
          </div>}
    </section>
  );
}
