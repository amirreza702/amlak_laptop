"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { getAdminUsers, getCurrentUser, type AdminUser, type UserRole } from "@/features/auth/api/authApi";
import { getAdminUserDetails, setAdminUserStatus } from "@/features/admin/api/adminApi";

export function useAdminUsers() {
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentIsSuperAdmin, setCurrentIsSuperAdmin] = useState(false);
  const [currentPermissions, setCurrentPermissions] = useState<string[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("");
  const [role, setRole] = useState<Exclude<UserRole, "HASHTI"> | "">("");
  const [active, setActive] = useState<"true" | "false" | "">("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser().then(user => {
      if (!cancelled) { setCurrentRole(user.role); setCurrentUserId(user.id); setCurrentIsSuperAdmin(user.isSuperAdmin === true); setCurrentPermissions(user.adminPermissions ?? []); }
    }).catch((cause: unknown) => {
      if (!cancelled) {
        setError(cause instanceof Error ? cause.message : "ابتدا وارد حساب شوید.");
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const loadUsers = useCallback(async () => {
    if (currentRole !== "HASHTI") {
      if (currentRole !== null) {
        setError("دسترسی به پنل مدیریت فقط برای کارکنان هشتی مجاز است.");
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await getAdminUsers({ search, role, isActive: active, page, limit: 20 });
      setUsers(result.items);
      setTotal(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "خطا در دریافت فهرست کاربران.");
    } finally {
      setLoading(false);
    }
  }, [currentRole, search, role, active, page]);

  useEffect(() => { void Promise.resolve().then(() => loadUsers()); }, [loadUsers]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  async function showUserDetails(user: AdminUser) {
    try {
      const result = await getAdminUserDetails(user.id);
      setSelectedUser(result.item);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "دریافت جزئیات ناموفق بود.");
    }
  }

  const canManageUser = useCallback((user: AdminUser) => {
    const requiredPermission = user.role === "OWNER" ? "OWNERS_MANAGE" : user.role === "AGENT" ? "AGENTS_MANAGE" : "USERS_MANAGE";
    return currentIsSuperAdmin || currentPermissions.includes(requiredPermission);
  }, [currentIsSuperAdmin, currentPermissions]);

  async function changeUserStatus(user: AdminUser) {
    if (user.id === currentUserId) {
      setError("نمی‌توانید وضعیت حساب خودتان را از این بخش تغییر دهید.");
      return;
    }
    if (reason.trim().length < 3) {
      setError("برای تغییر وضعیت حساب، دلیل حداقل ۳ حرفی وارد کنید.");
      return;
    }
    try {
      await setAdminUserStatus(user.id, !user.isActive, reason.trim());
      setReason("");
      await loadUsers();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "تغییر وضعیت حساب ناموفق بود.");
    }
  }
  return {
    currentRole, currentUserId, canManageUser, users, searchInput, setSearchInput, search, setSearch, reason, setReason,
    role, setRole, active, setActive, page, setPage, total, totalPages, loading, error,
    selectedUser, setSelectedUser, submitSearch, changeUserStatus, showUserDetails,
  };
}
