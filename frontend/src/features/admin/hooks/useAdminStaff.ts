"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { type AdminStaff, getAdminStaff, createAdminStaff, updateAdminStaffPermissions } from "@/features/admin/api/adminApi";
import { getCurrentUser } from "@/features/auth/api/authApi";

export function useAdminStaff() {
  const [staff, setStaff] = useState<AdminStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [permissions, setPermissions] = useState<string[]>(["USERS_READ"]);
  const [editing, setEditing] = useState<AdminStaff | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const user = await getCurrentUser();
      if (user.role !== "HASHTI") throw new Error("دسترسی کارکنان هشتی لازم است.");
      const result = await getAdminStaff();
      setStaff(result.items);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "دریافت فهرست کارکنان ناموفق بود."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  function toggle(value: string, selected: string[], setter: (values: string[]) => void) {
    setter(selected.includes(value) ? selected.filter(item => item !== value) : [...selected, value]);
  }
  async function createStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reason.trim().length < 3) { setError("برای ایجاد حساب، دلیل ثبت کنید."); return; }
    try {
      await createAdminStaff({ mobile, password, permissions, reason: reason.trim() });
      setMobile(""); setPassword(""); setReason(""); setPermissions(["USERS_READ"]); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "ایجاد حساب کارکنان ناموفق بود."); }
  }
  async function savePermissions() {
    if (!editing || reason.trim().length < 3) { setError("برای تغییر دسترسی، دلیل ثبت کنید."); return; }
    try {
      await updateAdminStaffPermissions(editing.id, editPermissions, reason.trim());
      setEditing(null); setReason(""); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تغییر دسترسی ناموفق بود."); }
  }
  return { staff, loading, error, mobile, setMobile, password, setPassword, reason, setReason, permissions, setPermissions, editing, setEditing, editPermissions, setEditPermissions, toggle, createStaff, savePermissions, load };
}
