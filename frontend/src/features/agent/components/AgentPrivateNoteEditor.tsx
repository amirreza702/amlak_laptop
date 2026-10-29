"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => { setDraft(saved?.note ?? ""); }, [saved?.note, entityId, entityType]);

  return (
    <div className="min-w-[220px] space-y-2">
      <textarea
        aria-label={`یادداشت خصوصی ${entityType} ${entityId}`}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        rows={3}
        maxLength={10000}
        placeholder="یادداشت خصوصی درباره این مورد..."
        className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm leading-6"
      />
      <button
        type="button"
        disabled={saving}
        onClick={() => void onSave(entityType, entityId, draft)}
        className="whitespace-nowrap rounded-lg bg-[#062a5b] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
      >
        {saving ? "در حال ذخیره..." : saved ? "ذخیره تغییرات یادداشت" : "ثبت یادداشت"}
      </button>
      {saved && <p className="text-xs text-slate-500">آخرین تغییر: {new Date(saved.updatedAt).toLocaleDateString("fa-IR")}</p>}
    </div>
  );
}
