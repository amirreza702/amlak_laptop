"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Clock3, LoaderCircle, RefreshCw, Search, ShieldCheck, UserRoundCog } from "lucide-react";

import { hashtiManagementRequest as requestJson } from "../api/hashtiUserManagementApi";
import type {
  HashtiAuditLog as AuditLog,
  HashtiManagedProfileType as ProfileType,
  HashtiManagedRole as Role,
  HashtiManagedUser as ManagedUser,
} from "../types/hashtiUserManagement";

function displayName(user: ManagedUser) {
  const profile = user.agent ?? user.owner ?? user.customer ?? user.staffProfile;
  return profile ? `${profile.firstName} ${profile.lastName}` : "نام ثبت نشده";
}
function profileOf(user: ManagedUser): { type: ProfileType; id: string; firstName: string; lastName: string; agencyName?: string | null; address?: string | null } | null {
  if (user.agent) return { type: "agent", id: user.agent.id, firstName: user.agent.firstName, lastName: user.agent.lastName, agencyName: user.agent.agencyName, address: user.agent.address };
  if (user.owner) return { type: "owner", id: user.owner.id, firstName: user.owner.firstName, lastName: user.owner.lastName };
  if (user.customer) return { type: "customer", id: user.customer.id, firstName: user.customer.firstName, lastName: user.customer.lastName };
  if (user.staffProfile) return { type: "hashti", id: user.staffProfile.id, firstName: user.staffProfile.firstName, lastName: user.staffProfile.lastName };
  return null;
}

export function HashtiUserManagementPanel() {
  const [accessLoading, setAccessLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [role, setRole] = useState<"ALL" | Role>("ALL");
  const [active, setActive] = useState<"ALL" | "true" | "false">("ALL");
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [staffMobile, setStaffMobile] = useState("");
  const [staffFirstName, setStaffFirstName] = useState("");
  const [staffLastName, setStaffLastName] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editAgencyName, setEditAgencyName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editReason, setEditReason] = useState("");
  const [resetUser, setResetUser] = useState<ManagedUser | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetReason, setResetReason] = useState("");
  const [historyUser, setHistoryUser] = useState<string | null>(null);
  const [historyLogs, setHistoryLogs] = useState<AuditLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const loadUsers = useCallback(async (nextOffset: number) => {
    setLoading(true); setError(null);
    const params = new URLSearchParams({ limit: "25", offset: String(nextOffset) });
    if (appliedQuery.trim()) params.set("query", appliedQuery.trim());
    if (role !== "ALL") params.set("role", role);
    if (active !== "ALL") params.set("active", active);
    try {
      const result = await requestJson<{ users: ManagedUser[]; pagination: { total: number; limit: number; offset: number } }>(`/hashti/management/users?${params.toString()}`);
      setUsers(result.users); setTotal(result.pagination.total); setOffset(result.pagination.offset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "دریافت کاربران ناموفق بود."); setUsers([]);
    } finally { setLoading(false); }
  }, [active, appliedQuery, role]);

  useEffect(() => {
    let alive = true;
    requestJson<{ isSuperAdmin: boolean }>("/hashti/management/access")
      .then((result) => { if (alive) setIsSuperAdmin(result.isSuperAdmin); })
      .catch((err: unknown) => { if (alive) setAccessError(err instanceof Error ? err.message : "بررسی سطح دسترسی ناموفق بود."); })
      .finally(() => { if (alive) setAccessLoading(false); });
    return () => { alive = false; };
  }, []);
  useEffect(() => { if (!accessLoading && isSuperAdmin) void loadUsers(0); }, [accessLoading, isSuperAdmin, loadUsers]);

  const submitSearch = (event: FormEvent) => { event.preventDefault(); setOffset(0); setAppliedQuery(query); };
  const changeStatus = async (user: ManagedUser) => {
    const reason = window.prompt("دلیل تغییر وضعیت این حساب را وارد کنید:");
    if (reason === null) return;
    if (reason.trim().length < 3) { setError("برای تغییر وضعیت، دلیل حداقل ۳ کاراکتری لازم است."); return; }
    setSavingUserId(user.id); setError(null); setMessage(null);
    try {
      await requestJson(`/hashti/management/users/${encodeURIComponent(user.id)}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !user.isActive, reason }),
      });
      setMessage(`وضعیت حساب ${user.mobile} تغییر کرد و در تاریخچه ثبت شد.`);
      await loadUsers(offset);
    } catch (err) { setError(err instanceof Error ? err.message : "تغییر وضعیت ناموفق بود."); }
    finally { setSavingUserId(null); }
  };
  const beginEdit = (user: ManagedUser) => {
    const profile = profileOf(user);
    if (!profile) { setError("برای این حساب پروفایل نام‌دار قابل ویرایش وجود ندارد."); return; }
    setEditUser(user); setEditFirstName(profile.firstName); setEditLastName(profile.lastName);
    setEditAgencyName(profile.agencyName ?? ""); setEditAddress(profile.address ?? ""); setEditReason(""); setError(null);
  };
  const saveProfile = async (event: FormEvent) => {
    event.preventDefault(); if (!editUser) return;
    const profile = profileOf(editUser); if (!profile) return;
    setSavingUserId(editUser.id); setError(null); setMessage(null);
    const body: Record<string, string | null> = { firstName: editFirstName.trim(), lastName: editLastName.trim(), reason: editReason.trim() };
    if (profile.type === "agent") { body.agencyName = editAgencyName.trim() || null; body.address = editAddress.trim() || null; }
    try {
      await requestJson(`/hashti/management/profiles/${profile.type}/${encodeURIComponent(profile.id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      setMessage("پروفایل تغییر کرد و مقادیر قبل و بعد در تاریخچه ثبت شد."); setEditUser(null); await loadUsers(offset);
    } catch (err) { setError(err instanceof Error ? err.message : "ویرایش پروفایل ناموفق بود."); }
    finally { setSavingUserId(null); }
  };
  const beginPasswordReset = (user: ManagedUser) => {
    setResetUser(user);
    setResetPassword("");
    setResetReason("");
    setError(null);
    setMessage(null);
  };

  const resetManagedPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!resetUser) return;
    if (resetPassword.length < 12) {
      setError("رمز جدید باید حداقل ۱۲ کاراکتر داشته باشد.");
      return;
    }
    if (resetReason.trim().length < 3) {
      setError("برای بازنشانی رمز، دلیل حداقل ۳ کاراکتری لازم است.");
      return;
    }

    setSavingUserId(resetUser.id);
    setError(null);
    setMessage(null);
    try {
      await requestJson(`/auth/admin/users/${encodeURIComponent(resetUser.id)}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPassword: resetPassword,
          reason: resetReason.trim(),
        }),
      });
      setMessage(`رمز حساب ${resetUser.mobile} بازنشانی شد؛ نشست‌های قبلی باطل و رویداد ثبت شد.`);
      setResetUser(null);
      setResetPassword("");
      setResetReason("");
      if (historyUser === resetUser.id) {
        setHistoryUser(null);
        setHistoryLogs([]);
      }
      await loadUsers(offset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "بازنشانی رمز ناموفق بود.");
    } finally {
      setSavingUserId(null);
    }
  };

  const toggleHistory = async (user: ManagedUser) => {
    if (historyUser === user.id) { setHistoryUser(null); return; }
    setHistoryUser(user.id); setHistoryLogs([]); setHistoryError(null); setHistoryLoading(true);
    const profile = profileOf(user); const targetIds = [user.id, ...(profile ? [profile.id] : [])];
    try {
      const responses = await Promise.all(targetIds.map((id) => requestJson<{ logs: AuditLog[] }>(`/hashti/management/audit-logs?targetId=${encodeURIComponent(id)}&limit=50&offset=0`)));
      const unique = Array.from(new Map(responses.flatMap((response) => response.logs).map((log) => [log.id, log])).values())
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setHistoryLogs(unique);
    } catch (err) { setHistoryError(err instanceof Error ? err.message : "دریافت تاریخچه ناموفق بود."); }
    finally { setHistoryLoading(false); }
  };
  const createStaff = async (event: FormEvent) => {
    event.preventDefault(); setCreatingStaff(true); setError(null); setMessage(null);
    try {
      await requestJson("/hashti/management/staff", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: staffMobile.trim(), firstName: staffFirstName.trim(), lastName: staffLastName.trim(), password: staffPassword }),
      });
      setStaffMobile(""); setStaffFirstName(""); setStaffLastName(""); setStaffPassword("");
      setMessage("حساب همکار هشتی ایجاد شد؛ این حساب مدیر ارشد نیست."); setOffset(0); await loadUsers(0);
    } catch (err) { setError(err instanceof Error ? err.message : "ایجاد حساب همکار ناموفق بود."); }
    finally { setCreatingStaff(false); }
  };

  if (accessLoading) return <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><p className="flex items-center gap-2 text-sm text-slate-600"><LoaderCircle className="h-4 w-4 animate-spin" /> در حال بررسی دسترسی مدیریت کاربران...</p></section>;
  if (!isSuperAdmin && accessError) return <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><h2 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck className="h-5 w-5 text-[#043873]" /> مدیریت کاربران و سوابق</h2><p className="mt-2 text-sm leading-7 text-slate-600">{accessError}</p></section>;

  return (
    <section className="space-y-5 rounded-2xl border border-blue-200 bg-slate-50 p-4 sm:p-6" dir="rtl">
      <div><h2 className="flex items-center gap-2 text-xl font-bold text-slate-900"><UserRoundCog className="h-6 w-6 text-[#043873]" /> مدیریت کاربران، مالکان، مشاوران و کارکنان هشتی</h2><p className="mt-2 text-sm leading-7 text-slate-600">کارکنان هشتی می‌توانند حساب‌های کاربران، مالکان و مشاوران را جست‌وجو، ویرایش و بررسی تاریخچه کنند. ساخت و مدیریت حساب‌های کارکنان هشتی و بازنشانی رمز فقط برای مدیر ارشد فعال است.</p></div>
      <form onSubmit={createStaff} hidden={!isSuperAdmin} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <h3 className="font-bold sm:col-span-2 lg:col-span-5">ایجاد حساب جدید برای همکار هشتی</h3>
        <label className="space-y-1 text-sm">شماره موبایل<input required inputMode="numeric" pattern="09[0-9]{9}" maxLength={11} value={staffMobile} onChange={(event) => setStaffMobile(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" dir="ltr" /></label>
        <label className="space-y-1 text-sm">نام<input required maxLength={120} value={staffFirstName} onChange={(event) => setStaffFirstName(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        <label className="space-y-1 text-sm">نام خانوادگی<input required maxLength={120} value={staffLastName} onChange={(event) => setStaffLastName(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        <label className="space-y-1 text-sm">رمز اولیه (حداقل ۱۲ کاراکتر)<input required type="password" autoComplete="new-password" minLength={12} maxLength={200} value={staffPassword} onChange={(event) => setStaffPassword(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" dir="ltr" /></label>
        <div className="flex items-end"><button type="submit" disabled={creatingStaff} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#043873] px-3 py-2.5 text-sm font-bold text-white disabled:opacity-60">{creatingStaff ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} ایجاد همکار</button></div>
      </form>

      <form onSubmit={submitSearch} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1 text-sm">جست‌وجو با شماره، نام یا نام خانوادگی<input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="مثلاً شماره موبایل یا نام" /></label>
        <label className="space-y-1 text-sm">نوع حساب<select value={role} onChange={(event) => { setRole(event.target.value as typeof role); setOffset(0); }} className="w-full rounded-lg border border-slate-300 px-3 py-2"><option value="ALL">همه نقش‌ها</option><option value="CUSTOMER">مشتری</option><option value="OWNER">مالک</option><option value="AGENT">مشاور</option><option value="HASHTI">کارمند هشتی</option></select></label>
        <label className="space-y-1 text-sm">وضعیت حساب<select value={active} onChange={(event) => { setActive(event.target.value as typeof active); setOffset(0); }} className="w-full rounded-lg border border-slate-300 px-3 py-2"><option value="ALL">همه وضعیت‌ها</option><option value="true">فعال</option><option value="false">غیرفعال</option></select></label>
        <div className="flex items-end gap-2"><button type="submit" className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#043873] px-3 py-2.5 text-sm font-bold text-white"><Search className="h-4 w-4" /> جست‌وجو</button><button type="button" onClick={() => { setQuery(""); setAppliedQuery(""); setRole("ALL"); setActive("ALL"); setOffset(0); }} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold"><RefreshCw className="h-4 w-4" /> پاک‌سازی</button></div>
      </form>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600"><span>نتیجه: {total.toLocaleString("fa-IR")} حساب</span><span>صفحه فعلی: {Math.floor(offset / 25) + 1}</span></div>
      {loading ? <p className="flex items-center gap-2 rounded-xl bg-white p-4 text-sm text-slate-600"><LoaderCircle className="h-4 w-4 animate-spin" /> در حال دریافت اطلاعات...</p> : users.length === 0 ? <p className="rounded-xl bg-white p-4 text-sm text-slate-500">حسابی مطابق فیلترها پیدا نشد.</p> : (
        <div className="space-y-3">
          {users.map((item) => {
            const profile = profileOf(item);
            return (
              <article key={item.id} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0">
                  <p className="font-bold text-slate-900">{displayName(item)}{item.isSuperAdmin && <span className="ms-2 rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-900">مدیر ارشد</span>}</p>
                  <p className="mt-1 text-sm text-slate-600"><span dir="ltr" className="inline-block">{item.mobile}</span> · {({ CUSTOMER: "مشتری", OWNER: "مالک", AGENT: "مشاور", HASHTI: "کارمند هشتی" })[item.role]}</p>
                  <p className="mt-1 text-xs text-slate-500">شناسه: <span dir="ltr" className="break-all font-mono">{item.id}</span> · ایجاد: {new Date(item.createdAt).toLocaleString("fa-IR")}</p>
                  {item.agent && <p className="mt-1 text-sm text-slate-600">وضعیت بررسی مشاور: {({ PENDING: "در انتظار", VERIFIED: "تأییدشده", REJECTED: "ردشده" })[item.agent.verificationStatus]}{item.agent.agencyName ? ` · ${item.agent.agencyName}` : ""}</p>}
                </div><span className={`rounded-full px-3 py-1 text-xs font-bold ${item.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>{item.isActive ? "فعال" : "غیرفعال"}</span></div>
                <div className="flex flex-wrap gap-2"><button type="button" hidden={item.role === "HASHTI" && !isSuperAdmin} onClick={() => void changeStatus(item)} disabled={savingUserId === item.id} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">{savingUserId === item.id ? "در حال ثبت..." : item.isActive ? "غیرفعال‌کردن حساب" : "فعال‌کردن حساب"}</button>{profile && <button type="button" hidden={profile.type === "hashti" && !isSuperAdmin} onClick={() => beginEdit(item)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">ویرایش پروفایل</button>}<button type="button" onClick={() => void toggleHistory(item)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"><Clock3 className="h-4 w-4" /> {historyUser === item.id ? "بستن تاریخچه" : "تاریخچه تغییرات"}</button></div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" hidden={!isSuperAdmin} onClick={() => beginPasswordReset(item)} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
                    بازنشانی رمز عبور
                  </button>
                </div>
                {resetUser?.id === item.id && (
                  <form onSubmit={resetManagedPassword} className="grid gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 sm:grid-cols-2">
                    <h4 className="font-bold sm:col-span-2">بازنشانی امن رمز حساب</h4>
                    <label className="space-y-1 text-sm">رمز جدید (حداقل ۱۲ کاراکتر)
                      <input required type="password" autoComplete="new-password" minLength={12} maxLength={200} value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" dir="ltr" />
                    </label>
                    <label className="space-y-1 text-sm">دلیل بازنشانی (اجباری)
                      <textarea required minLength={3} maxLength={1000} rows={2} value={resetReason} onChange={(event) => setResetReason(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
                    </label>
                    <div className="flex flex-wrap gap-2 sm:col-span-2">
                      <button type="submit" disabled={savingUserId === item.id} className="rounded-lg bg-amber-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                        {savingUserId === item.id ? "در حال ثبت..." : "بازنشانی و ثبت تاریخچه"}
                      </button>
                      <button type="button" onClick={() => setResetUser(null)} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm">
                        انصراف
                      </button>
                    </div>
                  </form>
                )}
                {editUser?.id === item.id && profile && <form onSubmit={saveProfile} className="grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-2">
                  <h4 className="font-bold sm:col-span-2">ویرایش پروفایل {profile.type === "agent" ? "مشاور" : profile.type === "owner" ? "مالک" : profile.type === "hashti" ? "کارمند هشتی" : "مشتری"}</h4>
                  <label className="space-y-1 text-sm">نام<input required maxLength={120} value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
                  <label className="space-y-1 text-sm">نام خانوادگی<input required maxLength={120} value={editLastName} onChange={(e) => setEditLastName(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
                  {profile.type === "agent" && <><label className="space-y-1 text-sm">نام آژانس<input maxLength={200} value={editAgencyName} onChange={(e) => setEditAgencyName(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="space-y-1 text-sm">نشانی<input maxLength={500} value={editAddress} onChange={(e) => setEditAddress(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></label></>}
                  <label className="space-y-1 text-sm sm:col-span-2">دلیل تغییر (اجباری)<textarea required minLength={3} maxLength={1000} rows={2} value={editReason} onChange={(e) => setEditReason(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
                  <div className="flex flex-wrap gap-2 sm:col-span-2"><button type="submit" disabled={savingUserId === item.id} className="inline-flex items-center gap-2 rounded-lg bg-[#043873] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{savingUserId === item.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} ثبت تغییر با تاریخچه</button><button type="button" onClick={() => setEditUser(null)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm">انصراف</button></div>
                </form>}
                {historyUser === item.id && <div className="space-y-3 rounded-lg bg-slate-50 p-3"><h4 className="font-bold">سوابق مرتبط با این حساب و پروفایل</h4>{historyLoading && <p className="text-sm text-slate-600">در حال دریافت تاریخچه...</p>}{historyError && <p role="alert" className="text-sm text-red-700">{historyError}</p>}{!historyLoading && !historyError && historyLogs.length === 0 && <p className="text-sm text-slate-500">رویداد مدیریتی برای شناسه‌های این حساب ثبت نشده است.</p>}{historyLogs.map((log) => <article key={log.id} className="rounded-lg border border-slate-200 bg-white p-3"><div className="flex flex-wrap justify-between gap-2"><b>{log.action}</b><span className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString("fa-IR")}</span></div><p className="mt-1 text-sm text-slate-600">عامل: {log.actorMobile ?? "نامشخص"} · {log.actorRole ?? "نامشخص"} · هدف: {log.targetType}</p>{log.details !== null && log.details !== undefined && <pre dir="ltr" className="mt-2 overflow-x-auto whitespace-pre-wrap rounded bg-slate-50 p-2 text-xs leading-6">{JSON.stringify(log.details, null, 2)}</pre>}</article>)}</div>}
              </article>
            );
          })}
        </div>
      )}
      <div className="flex items-center justify-between gap-3"><button type="button" disabled={loading || offset <= 0} onClick={() => void loadUsers(Math.max(0, offset - 25))} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40">قبلی</button><span className="text-xs text-slate-500">{Math.min(total, offset + 25).toLocaleString("fa-IR")} از {total.toLocaleString("fa-IR")}</span><button type="button" disabled={loading || offset + 25 >= total} onClick={() => void loadUsers(offset + 25)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40">بعدی</button></div>
    </section>
  );
}
