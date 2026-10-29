"use client";

import { useCallback, useEffect, useState } from "react";
import { agentApiRequest } from "../api/agentApi";

export type AgentPrivateNote = {
  id: string;
  entityType: "property" | "owner" | "customer";
  entityId: string;
  note: string;
  updatedAt: string;
};

/** یادداشت‌های خصوصی را از API موجود می‌خواند؛ کنترل دسترسی همچنان سمت سرور است. */
export function useAgentPrivateNotes(enabled = true) {
  const [notes, setNotes] = useState<AgentPrivateNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [savingNoteKey, setSavingNoteKey] = useState<string | null>(null);
  const [noteMessage, setNoteMessage] = useState<string | null>(null);

  const refreshNotes = useCallback(async () => {
    setLoadingNotes(true);
    setNoteError(null);
    try {
      const body = await agentApiRequest<{ notes?: AgentPrivateNote[] }>("/agents/me/private-notes");
      setNotes(Array.isArray(body.notes) ? body.notes : []);
    } catch (cause) {
      setNoteError(cause instanceof Error ? cause.message : "دریافت یادداشت‌های خصوصی ناموفق بود.");
    } finally {
      setLoadingNotes(false);
    }
  }, []);

  useEffect(() => { if (enabled) void refreshNotes(); }, [enabled, refreshNotes]);

  const saveNote = useCallback(async (entityType: AgentPrivateNote["entityType"], entityId: string, note: string) => {
    const key = `${entityType}:${entityId}`;
    setSavingNoteKey(key);
    setNoteError(null);
    setNoteMessage(null);
    try {
      await agentApiRequest("/agents/me/private-notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId, note }),
      });
      setNoteMessage(note.trim() ? "یادداشت خصوصی ذخیره شد." : "یادداشت خصوصی حذف شد.");
      await refreshNotes();
      return true;
    } catch (cause) {
      setNoteError(cause instanceof Error ? cause.message : "ذخیره یادداشت خصوصی ناموفق بود.");
      return false;
    } finally {
      setSavingNoteKey(null);
    }
  }, [refreshNotes]);

  return { notes, loadingNotes, noteError, noteMessage, savingNoteKey, refreshNotes, saveNote };
}
