"use client";

import { useState, type FormEvent } from "react";
import { getHashtiAdminAuditLogs, getHashtiContactAccessLogs } from "@/features/hashti/api/hashtiApi";
import type { AdminAuditLog, ContactAccessAuditLog } from "@/features/hashti/types/hashti";

export function useHashtiAuditLogs() {
  const [auditLogs, setAuditLogs] = useState<ContactAccessAuditLog[]>([]);
  const [auditAgentId, setAuditAgentId] = useState("");
  const [auditFrom, setAuditFrom] = useState("");
  const [auditTo, setAuditTo] = useState("");
  const [auditBusy, setAuditBusy] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
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

  const loadContactAuditLogs = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuditBusy(true);
    setAuditError(null);
    try {
      const params = new URLSearchParams();
      if (auditAgentId.trim()) params.set("agentId", auditAgentId.trim());
      if (auditFrom) params.set("from", new Date(auditFrom).toISOString());
      if (auditTo) params.set("to", new Date(auditTo).toISOString());
      params.set("limit", "100");
      params.set("offset", "0");
      const result = await getHashtiContactAccessLogs(params);
      setAuditLogs(result.logs);
    } catch (error: unknown) {
      setAuditError(error instanceof Error ? error.message : "دریافت گزارش دسترسی تماس انجام نشد.");
      setAuditLogs([]);
    } finally { setAuditBusy(false); }
  };

  return {
    auditLogs, auditAgentId, setAuditAgentId, auditFrom, setAuditFrom, auditTo, setAuditTo,
    auditBusy, auditError, adminAuditAction, setAdminAuditAction, adminAuditTargetId, setAdminAuditTargetId,
    adminAuditLogs, adminAuditBusy, adminAuditError, loadAdminAuditLogs, loadContactAuditLogs,
  };
}
