"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminAudit, type AdminAuditEntry } from "@/features/admin/api/adminApi";
import { getCurrentUser } from "@/features/auth/api/authApi";

export function useAdminAuditLog() {
  const [items, setItems] = useState<AdminAuditEntry[]>([]);
  const [targetType, setTargetType] = useState("");
  const [targetId, setTargetId] = useState("");
  const [actorUserId, setActorUserId] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const user = await getCurrentUser();
      if (user.role !== "HASHTI") throw new Error("دسترسی کارکنان هشتی لازم است.");
      const result = await getAdminAudit({ targetType, targetId: targetId.trim() || undefined, actorUserId: actorUserId.trim() || undefined, page, limit: 20 });
      setItems(result.items);
      setTotal(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "دریافت سوابق ناموفق بود.");
    } finally { setLoading(false); }
  }, [targetType, targetId, actorUserId, page]);

  useEffect(() => { void load(); }, [load]);
  return { items, targetType, setTargetType, targetId, setTargetId, actorUserId, setActorUserId, page, setPage, total, totalPages, loading, error, load };
}
