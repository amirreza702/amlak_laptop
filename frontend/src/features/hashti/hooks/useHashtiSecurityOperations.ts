"use client";

import { useState, type FormEvent } from "react";
import { getHashtiExactLocationAccessLogs, resetHashtiUserPassword, reviewHashtiVerificationCase } from "@/features/hashti/api/hashtiApi";
import type { ExactLocationLog } from "@/features/hashti/types/hashti";

export function useHashtiSecurityOperations() {
  const [resetUserId, setResetUserId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [verificationCaseId, setVerificationCaseId] = useState("");
  const [verificationNotes, setVerificationNotes] = useState("");
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [logPropertyId, setLogPropertyId] = useState("");
  const [accessLogs, setAccessLogs] = useState<ExactLocationLog[]>([]);
  const [logsBusy, setLogsBusy] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);

  const resetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResetError(null);
    setResetMessage(null);
    if (!resetUserId.trim()) { setResetError("شناسهٔ User را وارد کنید."); return; }
    if (newPassword.length < 8) { setResetError("رمز جدید باید حداقل ۸ کاراکتر داشته باشد."); return; }
    setResetBusy(true);
    try {
      await resetHashtiUserPassword(resetUserId.trim(), newPassword);
      setNewPassword("");
      setResetMessage("رمز عبور تغییر کرد و نشست‌های قبلی آن حساب باطل شدند.");
    } catch (error: unknown) {
      setResetError(error instanceof Error ? error.message : "تغییر رمز عبور انجام نشد.");
    } finally { setResetBusy(false); }
  };

  const reviewVerificationCase = async (status: "VERIFIED" | "REJECTED") => {
    if (!verificationCaseId.trim()) { setVerificationError("شناسهٔ پروندهٔ تأیید را وارد کنید."); return; }
    setVerificationBusy(true);
    setVerificationError(null);
    setVerificationMessage(null);
    try {
      await reviewHashtiVerificationCase(verificationCaseId.trim(), { status, notes: verificationNotes.trim() || null });
      setVerificationMessage(status === "VERIFIED" ? "پرونده تأیید شد." : "پرونده رد شد.");
    } catch (error: unknown) {
      setVerificationError(error instanceof Error ? error.message : "رسیدگی به پرونده انجام نشد.");
    } finally { setVerificationBusy(false); }
  };

  const loadAccessLogs = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!logPropertyId.trim()) { setLogsError("شناسهٔ ملک را وارد کنید."); return; }
    setLogsBusy(true);
    setLogsError(null);
    try {
      const result = await getHashtiExactLocationAccessLogs(logPropertyId.trim());
      setAccessLogs(result.accessLogs);
    } catch (error: unknown) {
      setLogsError(error instanceof Error ? error.message : "دریافت سوابق دسترسی انجام نشد.");
      setAccessLogs([]);
    } finally { setLogsBusy(false); }
  };

  return {
    resetUserId, setResetUserId, newPassword, setNewPassword, resetBusy, resetError, resetMessage, resetPassword,
    verificationCaseId, setVerificationCaseId, verificationNotes, setVerificationNotes, verificationBusy,
    verificationError, verificationMessage, reviewVerificationCase,
    logPropertyId, setLogPropertyId, accessLogs, logsBusy, logsError, loadAccessLogs,
  };
}
