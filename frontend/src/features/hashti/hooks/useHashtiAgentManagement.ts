"use client";

import { useCallback, useEffect, useState } from "react";
import { changeHashtiAgentSubscription, getHashtiAgents, reviewHashtiAgent } from "@/features/hashti/api/hashtiApi";
import type { ManagedAgent } from "@/features/hashti/types/hashti";
import { useHashtiSubscriptionPlans } from "@/features/hashti/hooks/useHashtiSubscriptionPlans";

export function useHashtiAgentManagement() {
  const [verificationFilter, setVerificationFilter] = useState<"pending" | "verified" | "rejected" | "all">("pending");
  const [agentVerificationNotes, setAgentVerificationNotes] = useState("");
  const [managedAgents, setManagedAgents] = useState<ManagedAgent[]>([]);
  const { adminSubscriptionPlans, subscriptionPlansError } = useHashtiSubscriptionPlans();
  const [selectedPlanByAgent, setSelectedPlanByAgent] = useState<Record<string, string>>({});
  const [subscriptionStartsAt, setSubscriptionStartsAt] = useState("");
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState("");
  const [busySubscriptionAgentId, setBusySubscriptionAgentId] = useState<string | null>(null);
  const [subscriptionActionError, setSubscriptionActionError] = useState<string | null>(null);
  const [subscriptionActionMessage, setSubscriptionActionMessage] = useState<string | null>(null);
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

  useEffect(() => { void loadManagedAgents(); }, [loadManagedAgents]);

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

  const assignOrUpgradeSubscription = async (agent: ManagedAgent) => {
    const planId = selectedPlanByAgent[agent.id];
    const selectedPlan = adminSubscriptionPlans.find((plan) => plan.id === planId);
    setSubscriptionActionError(null);
    setSubscriptionActionMessage(null);
    if (!selectedPlan) { setSubscriptionActionError("یک پلن فعال انتخاب کنید."); return; }
    if (agent.subscription && selectedPlan.level <= agent.subscription.subscriptionPlan.level) {
      setSubscriptionActionError("برای ارتقا، پلنی با سطح بالاتر از پلن فعلی انتخاب کنید."); return;
    }
    const isUpgrade = Boolean(agent.subscription);
    let startsAt: string | undefined;
    let expiresAt: string | undefined;
    if (!isUpgrade) {
      if (!subscriptionStartsAt) { setSubscriptionActionError("برای ایجاد اشتراک جدید، تاریخ شروع را مشخص کنید."); return; }
      const startDate = new Date(subscriptionStartsAt);
      if (Number.isNaN(startDate.getTime())) { setSubscriptionActionError("تاریخ شروع معتبر نیست."); return; }
      startsAt = startDate.toISOString();
      if (subscriptionExpiresAt) {
        const expiryDate = new Date(subscriptionExpiresAt);
        if (Number.isNaN(expiryDate.getTime()) || expiryDate < startDate) {
          setSubscriptionActionError("تاریخ انقضا باید معتبر و بعد از تاریخ شروع باشد."); return;
        }
        expiresAt = expiryDate.toISOString();
      }
    }
    setBusySubscriptionAgentId(agent.id);
    try {
      await changeHashtiAgentSubscription(agent.id, isUpgrade ? { planId } : { planId, startsAt: startsAt as string, ...(expiresAt ? { expiresAt } : {}) });
      setSubscriptionActionMessage(isUpgrade ? "ارتقای اشتراک مشاور ثبت شد." : "اشتراک جدید مشاور ثبت شد.");
      setSelectedPlanByAgent((current) => { const next = { ...current }; delete next[agent.id]; return next; });
      await loadManagedAgents();
    } catch (error: unknown) {
      setSubscriptionActionError(error instanceof Error ? error.message : "تغییر اشتراک مشاور انجام نشد.");
    } finally {
      setBusySubscriptionAgentId(null);
    }
  };

  return {
    verificationFilter, setVerificationFilter, agentVerificationNotes, setAgentVerificationNotes,
    managedAgents, adminSubscriptionPlans, subscriptionPlansError, selectedPlanByAgent, setSelectedPlanByAgent,
    subscriptionStartsAt, setSubscriptionStartsAt, subscriptionExpiresAt, setSubscriptionExpiresAt,
    busySubscriptionAgentId, subscriptionActionError, subscriptionActionMessage,
    agentsBusy, agentsError, agentsMessage, busyAgentId, loadManagedAgents, reviewAgent, assignOrUpgradeSubscription,
  };
}
