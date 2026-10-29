"use client";

import { useCallback, useEffect, useState } from "react";
import { getHashtiAgents, reviewHashtiAgent } from "@/features/hashti/api/hashtiApi";
import type { ManagedAgent } from "@/features/hashti/types/hashti";

export function useHashtiAgentManagement() {
  const [verificationFilter, setVerificationFilter] = useState<"pending" | "verified" | "rejected" | "all">("pending");
  const [agentVerificationNotes, setAgentVerificationNotes] = useState("");
  const [managedAgents, setManagedAgents] = useState<ManagedAgent[]>([]);
  const [agentsBusy, setAgentsBusy] = useState(false);
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [agentsMessage, setAgentsMessage] = useState<string | null>(null);
  const [busyAgentId, setBusyAgentId] = useState<string | null>(null);

  const loadManagedAgents = useCallback(async () => {
    setAgentsBusy(true);
    setAgentsError(null);
    try {
      const result = await getHashtiAgents(verificationFilter);
      setManagedAgents(result.agents);
    } catch (error: unknown) {
      setAgentsError(error instanceof Error ? error.message : "دریافت فهرست مشاوران انجام نشد.");
      setManagedAgents([]);
    } finally {
      setAgentsBusy(false);
    }
  }, [verificationFilter]);

  useEffect(() => { void Promise.resolve().then(() => loadManagedAgents()); }, [loadManagedAgents]);

  const reviewAgent = async (agentId: string, verificationStatus: "PENDING" | "VERIFIED" | "REJECTED") => {
    if (verificationStatus === "REJECTED" && !agentVerificationNotes.trim()) {
      setAgentsError("برای رد مشاور، یادداشت دلیل رد را وارد کنید.");
      return;
    }
    setBusyAgentId(agentId);
    setAgentsError(null);
    setAgentsMessage(null);
    try {
      await reviewHashtiAgent(agentId, { verificationStatus, notes: agentVerificationNotes.trim() || null });
      const labels = { PENDING: "وضعیت مشاور به در انتظار بررسی تغییر کرد.", VERIFIED: "تأیید مشاور ثبت شد.", REJECTED: "رد مشاور همراه با یادداشت تصمیم ثبت شد." } as const;
      setAgentsMessage(labels[verificationStatus]);
      setAgentVerificationNotes("");
      await loadManagedAgents();
    } catch (error: unknown) {
      setAgentsError(error instanceof Error ? error.message : "تغییر وضعیت تأیید انجام نشد.");
    } finally {
      setBusyAgentId(null);
    }
  };

  return {
    verificationFilter, setVerificationFilter, agentVerificationNotes, setAgentVerificationNotes,
    managedAgents, agentsBusy, agentsError, agentsMessage, busyAgentId, loadManagedAgents, reviewAgent,
  };
}
