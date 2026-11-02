"use client";

import { useState, type FormEvent } from "react";
import { getHashtiAdminAuditLogs } from "@/features/hashti/api/hashtiApi";
import type { AdminAuditLog } from "@/features/hashti/types/hashti";

export function useHashtiAuditLogs() {
  const [adminAuditAction, setAdminAuditAction] = useState("");
  const [adminAuditTargetId, setAdminAuditTargetId] = useState("");
  const [adminAuditLogs, setAdminAuditLogs] = useState<AdminAuditLog[]>([]);
  const [adminAuditBusy, setAdminAuditBusy] = useState(false);
  const [adminAuditError, setAdminAuditError] = useState<string | null>(null);

  const loadAdminAuditLogs = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAdminAuditBusy(true);
    setAdminAuditError(null);
    try {
      const params = new URLSearchParams();
      if (adminAuditAction.trim()) params.set("action", adminAuditAction.trim());
      if (adminAuditTargetId.trim()) params.set("targetId", adminAuditTargetId.trim());
      params.set("limit", "100");
      params.set("offset", "0");
      const result = await getHashtiAdminAuditLogs(params);
      setAdminAuditLogs(result.logs);
    } catch (error: unknown) {
      setAdminAuditError(error instanceof Error ? error.message : "دریافت سوابق مدیریتی انجام نشد.");
      setAdminAuditLogs([]);
    } finally { setAdminAuditBusy(false); }
  };

  return {
    adminAuditAction, setAdminAuditAction, adminAuditTargetId, setAdminAuditTargetId,
    adminAuditLogs, adminAuditBusy, adminAuditError, loadAdminAuditLogs,
  };
}
