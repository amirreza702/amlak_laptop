"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/shared/components/Modal";
import type { AgentPrivateNote } from "../hooks/useAgentPrivateNotes";

type Props = {
  entityType: AgentPrivateNote["entityType"];
  entityId: string;
  notes: AgentPrivateNote[];
  saving: boolean;
  onSave: (entityType: AgentPrivateNote["entityType"], entityId: string, note: string) => Promise<boolean>;
};

export function AgentPrivateNoteEditor({ entityType, entityId, notes, saving, onSave }: Props) {
  const saved = notes.find((item) => item.entityType === entityType && item.entityId === entityId);
  const [draft, setDraft] = useState(saved?.note ?? "");
  const [open, setOpen] = useState(false);

  useEffect(() => { setDraft(saved?.note ?? ""); }, [saved?.note, entityId, entityType]);

  const saveDraft = async () => {
    const success = await onSave(entityType, entityId, draft);
    if (success) setOpen(false);
  };

  return (
    <div className="min-w-[220px] space-y-2">
      <button type="button" onClick={() => setOpen(true)} className="whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
        {saved ? "ویرایش یادداشت خصوصی" : "ثبت یادداشت خصوصی"}
      </button>
      {saved && <p className="text-xs text-slate-500">آخرین تغییر: {new Date(saved.updatedAt).toLocaleDateString("fa-IR")}</p>}
      <Modal open={open} title={saved ? "ویرایش یادداشت خصوصی" : "ثبت یادداشت خصوصی"} description="این یادداشت خصوصی است و دسترسی آن تابع مجوزهای فعلی است." onClose={() => setOpen(false)}>
        <div className="space-y-4">
          <textarea
            aria-label={`یادداشت خصوصی ${entityType} ${entityId}`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={6}
            maxLength={10000}
            placeholder="یادداشت خصوصی درباره این مورد..."
            className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm leading-6"
          />
          <div className="flex justify-end"><button type="button" disabled={saving} onClick={() => void saveDraft()} className="whitespace-nowrap rounded-lg bg-[#062a5b] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "در حال ذخیره..." : "ذخیره یادداشت"}</button></div>
        </div>
      </Modal>
    </div>
  );
}
