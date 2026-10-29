"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { getAdminAgents, getAdminAgentDetails, getAdminAgentHistory, setAdminAgentVerification, setAdminAgentStatus, updateAdminManagedProfile, type AdminAgent, type AdminAgentDetails, type AdminAuditEntry } from "@/features/admin/api/adminApi";
import { getCurrentUser } from "@/features/auth/api/authApi";

export function useAdminAgents() {
  const [items, setItems] = useState<AdminAgent[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState("");
  const [verified, setVerified] = useState("");
  const [reason, setReason] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<AdminAuditEntry[]>([]);
  const [historyAgent, setHistoryAgent] = useState("");
  const [profile, setProfile] = useState<AdminAgentDetails | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editAgencyName, setEditAgencyName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editReason, setEditReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const user = await getCurrentUser();
      if (user.role !== "HASHTI") throw new Error("دسترسی کارکنان هشتی لازم است.");
      const result = await getAdminAgents({ search, isActive: active, isVerified: verified, page, limit: 20 });
      setItems(result.items); setTotal(result.pagination.total); setTotalPages(result.pagination.totalPages);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "خطا در دریافت مشاوران."); }
    finally { setLoading(false); }
  }, [search, active, verified, page]);
  useEffect(() => { void Promise.resolve().then(() => load()); }, [load]);

  async function verify(agent: AdminAgent) {
    if (reason.trim().length < 3) { setError("برای تغییر وضعیت تأیید، دلیل وارد کنید."); return; }
    try { await setAdminAgentVerification(agent.id, !agent.isVerified, reason.trim()); setReason(""); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "تغییر تأیید مشاور ناموفق بود."); }
  }
  async function accountStatus(agent: AdminAgent) {
    if (reason.trim().length < 3) { setError("برای تغییر وضعیت حساب، دلیل وارد کنید."); return; }
    try { await setAdminAgentStatus(agent.id, !agent.user.isActive, reason.trim()); setReason(""); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "تغییر وضعیت حساب ناموفق بود."); }
  }
  async function showProfile(agent: AdminAgent) {
    try { const result = await getAdminAgentDetails(agent.id); setProfile(result.item); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "دریافت پروفایل ناموفق بود."); }
  }
  async function showHistory(agent: AdminAgent) {
    try { const result = await getAdminAgentHistory(agent.id); setHistory(result.items); setHistoryAgent(`${agent.firstName} ${agent.lastName}`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "دریافت سوابق ناموفق بود."); }
  }

  function beginProfileEdit() {
    if (!profile) return;
    setEditFirstName(profile.firstName);
    setEditLastName(profile.lastName);
    setEditAgencyName(profile.agencyName || "");
    setEditAddress(profile.address || "");
    setEditReason("");
    setEditingProfile(true);
  }

  async function saveProfileEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || editReason.trim().length < 3) {
      setError("برای ویرایش پروفایل، دلیل حداقل ۳ حرفی وارد کنید.");
      return;
    }
    try {
      await updateAdminManagedProfile("agent", profile.id, {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        agencyName: editAgencyName.trim() || null,
        address: editAddress.trim() || null,
        reason: editReason.trim(),
      });
      const result = await getAdminAgentDetails(profile.id);
      setProfile(result.item);
      setEditingProfile(false);
      setEditReason("");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ویرایش پروفایل مشاور ناموفق بود.");
    }
  }
  return {
    items, searchInput, setSearchInput, search, setSearch, active, setActive, verified, setVerified,
    reason, setReason, page, setPage, total, totalPages,
    loading, error, history, setHistory, historyAgent, setHistoryAgent, profile, setProfile, editingProfile, setEditingProfile,
    editFirstName, setEditFirstName, editLastName, setEditLastName, editAgencyName, setEditAgencyName,
    editAddress, setEditAddress, editReason, setEditReason, load, verify, accountStatus,
    showProfile, showHistory, beginProfileEdit, saveProfileEdit,
  };
}
