"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { getAdminOwners, getAdminOwnerDetails, getAdminOwnerHistory, setAdminOwnerStatus, updateAdminManagedProfile, type AdminOwner, type AdminOwnerDetails, type AdminAuditEntry } from "@/features/admin/api/adminApi";
import { getCurrentUser } from "@/features/auth/api/authApi";

export function useAdminOwners() {
  const [items, setItems] = useState<AdminOwner[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState("");
  const [reason, setReason] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<AdminAuditEntry[]>([]);
  const [historyOwner, setHistoryOwner] = useState("");
  const [profile, setProfile] = useState<AdminOwnerDetails | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editReason, setEditReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const user = await getCurrentUser();
      if (user.role !== "HASHTI") throw new Error("دسترسی کارکنان هشتی لازم است.");
      const result = await getAdminOwners({ search, isActive: active, page, limit: 20 });
      setItems(result.items); setTotal(result.pagination.total); setTotalPages(result.pagination.totalPages);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "خطا در دریافت مالکان."); }
    finally { setLoading(false); }
  }, [search, active, page]);
  useEffect(() => { void load(); }, [load]);

  async function changeStatus(owner: AdminOwner) {
    if (reason.trim().length < 3) { setError("برای تغییر وضعیت، دلیل حداقل ۳ حرفی وارد کنید."); return; }
    try {
      await setAdminOwnerStatus(owner.id, !owner.user.isActive, reason.trim());
      setReason("");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تغییر وضعیت ناموفق بود."); }
  }
  async function showProfile(owner: AdminOwner) {
    try { const result = await getAdminOwnerDetails(owner.id); setProfile(result.item); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "دریافت پروفایل ناموفق بود."); }
  }
  async function showHistory(owner: AdminOwner) {
    try {
      const result = await getAdminOwnerHistory(owner.id);
      setHistory(result.items); setHistoryOwner(`${owner.firstName} ${owner.lastName}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "دریافت سوابق ناموفق بود."); }
  }

  function beginProfileEdit() {
    if (!profile) return;
    setEditFirstName(profile.firstName);
    setEditLastName(profile.lastName);
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
      await updateAdminManagedProfile("owner", profile.id, {
        firstName: editFirstName.trim(), lastName: editLastName.trim(), reason: editReason.trim(),
      });
      const result = await getAdminOwnerDetails(profile.id);
      setProfile(result.item);
      setEditingProfile(false);
      setEditReason("");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ویرایش پروفایل مالک ناموفق بود.");
    }
  }
  return {
    items, searchInput, setSearchInput, search, setSearch, active, setActive, reason, setReason,
    page, setPage, total, totalPages, loading, error, history, setHistory, historyOwner, setHistoryOwner, profile, setProfile,
    editingProfile, setEditingProfile, editFirstName, setEditFirstName, editLastName, setEditLastName,
    editReason, setEditReason, load, changeStatus, showProfile, showHistory, beginProfileEdit, saveProfileEdit,
  };
}
