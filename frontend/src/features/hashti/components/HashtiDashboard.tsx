"use client";

import { useState, type ReactNode } from "react";
import {
  CheckCircle2,
  FileSearch,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import type { UserPublic } from "@/features/auth/api/authApi";
import type { DuplicateReview } from "@/features/hashti/types/hashti";
import { useHashtiDuplicateReview } from "@/features/hashti/hooks/useHashtiDuplicateReview";

import { useHashtiSecurityOperations } from "@/features/hashti/hooks/useHashtiSecurityOperations";
import { useHashtiAgentManagement } from "@/features/hashti/hooks/useHashtiAgentManagement";
import { useHashtiAuditLogs } from "@/features/hashti/hooks/useHashtiAuditLogs";
import { UserNotificationsPanel } from "@/features/notification/components/UserNotificationsPanel";
import { HashtiUserManagementPanel } from "./HashtiUserManagementPanel";
import { HashtiVerificationQueuePanel } from "./HashtiVerificationQueuePanel";
import { HashtiPropertyAdminToolsPanel } from "./HashtiPropertyAdminToolsPanel";



function scoreLabel(value: number) {
  return `${Math.round(value * 100)}٪`;
}
function idText(value: string) {
  return <span dir="ltr" className="break-all font-mono text-xs">{value}</span>;
}

export function HashtiDashboard({ user, onToolSelected }: { user: UserPublic; onToolSelected?: () => void }) {
  // تا پیش از انتخاب ابزار، فضای اصلی پنل خالی می‌ماند.
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const {
    propertyId, setPropertyId, candidateMatches, reviews, matchingBusy, matchingError, matchingMessage,
    reviewNotes, setReviewNotes, busyReviewId, loadDuplicateWork, createReview, decideReview,
  } = useHashtiDuplicateReview();
  const {
    resetUserId, setResetUserId, newPassword, setNewPassword, resetBusy, resetError, resetMessage, resetPassword,
    verificationCaseId, setVerificationCaseId, verificationNotes, setVerificationNotes, verificationBusy,
    verificationError, verificationMessage, reviewVerificationCase,
    logPropertyId, setLogPropertyId, accessLogs, logsBusy, logsError, loadAccessLogs,
  } = useHashtiSecurityOperations();
  const {
    verificationFilter, setVerificationFilter, agentVerificationNotes, setAgentVerificationNotes,
    managedAgents, adminSubscriptionPlans, subscriptionPlansError, selectedPlanByAgent, setSelectedPlanByAgent,
    subscriptionStartsAt, setSubscriptionStartsAt, subscriptionExpiresAt, setSubscriptionExpiresAt,
    busySubscriptionAgentId, subscriptionActionError, subscriptionActionMessage,
    agentsBusy, agentsError, agentsMessage, busyAgentId, loadManagedAgents, reviewAgent,
    assignOrUpgradeSubscription,
  } = useHashtiAgentManagement();
  const {
    auditLogs, auditAgentId, setAuditAgentId, auditFrom, setAuditFrom, auditTo, setAuditTo,
    auditBusy, auditError, adminAuditAction, setAdminAuditAction, adminAuditTargetId, setAdminAuditTargetId,
    adminAuditLogs, adminAuditBusy, adminAuditError, loadAdminAuditLogs, loadContactAuditLogs,
  } = useHashtiAuditLogs();



  return (
    <div className="min-h-screen w-full" dir="rtl">
      <aside aria-label="منوی ابزارهای هشتی" className="fixed inset-y-0 right-0 z-30 w-16 min-w-0 overflow-x-hidden overflow-y-auto border-l border-slate-200 bg-white p-1.5 shadow-sm sm:p-2 lg:w-64 lg:p-3">
        <h2 className="hidden px-3 py-2 text-base font-black text-slate-900 lg:block">ابزارهای هشتی</h2>
        <nav className="grid grid-cols-1 gap-1.5 lg:gap-2" aria-label="بخش‌های پنل هشتی">
          {[
            ["dashboard-home", "نمای کلی"],
            ["user-management", "مدیریت کاربران"],
            ["property-management", "مدیریت املاک"],
            ["reports", "گزارش‌ها و سوابق"],
            ["profile", "پروفایل"],
            ["notifications", "اعلان‌ها"],
          ].map(([target, label]) => (
            <button key={target} type="button" aria-current={selectedTool === target ? "page" : undefined} onClick={() => { setSelectedTool(target); onToolSelected?.(); }} title={label} className={`flex min-h-11 min-w-0 items-center justify-center rounded-lg border px-1 py-2 text-center text-[11px] font-semibold leading-4 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#043873] lg:justify-start lg:px-3 lg:text-right lg:text-sm ${selectedTool === target ? "border-[#043873] bg-blue-50 text-[#043873]" : "border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-[#043873]"}`}><span className="hidden lg:inline">{label}</span><span className="lg:hidden">{label.slice(0,2)}</span></button>
          ))}
        </nav>
      </aside>
      <main className="relative z-0 mr-16 min-h-screen min-w-0 space-y-5 overflow-x-hidden bg-slate-50 px-3 py-4 sm:px-5 lg:mr-64 lg:px-6">
      <section id="dashboard-home" hidden={selectedTool !== "dashboard-home"} className="scroll-mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-[#043873]"><ShieldCheck className="h-6 w-6" /></div>
          <div>
            <h2 className="text-xl font-black">مرکز مدیریت هشتی</h2>
            <p className="mt-1 text-sm text-slate-600">حساب واردشده: <span dir="ltr">{user.mobile}</span></p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MiniFeature icon={<Users className="h-5 w-5" />} title="مشاوران و اشتراک" detail="صف تأیید، اشتراک فعال و سهمیه ماهانه از API سرور خوانده می‌شود." />
          <MiniFeature icon={<FileSearch className="h-5 w-5" />} title="مغایرت املاک" detail="بررسی مشابهت، ایجاد پرونده و ثبت تصمیم فعال است." />
          <MiniFeature icon={<LockKeyhole className="h-5 w-5" />} title="بازنشانی رمز" detail="رمز کاربر با شناسهٔ User قابل تغییر است." />
          <MiniFeature icon={<ShieldCheck className="h-5 w-5" />} title="سوابق دسترسی" detail="سوابق دسترسی به موقعیت دقیق ملک قابل مشاهده است." />
        </div>
      </section>

      <section id="agent-management" hidden={selectedTool !== "user-management"} className="scroll-mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">مدیریت و تأیید مشاوران</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">فهرست از پایگاه داده خوانده می‌شود و اطلاعات اشتراک/مصرف نیز از رکوردهای موجود محاسبه می‌شود.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={verificationFilter} onChange={(event) => setVerificationFilter(event.target.value as "pending" | "verified" | "rejected" | "all")} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
              <option value="pending">در انتظار بررسی</option>
              <option value="verified">تأییدشده‌ها</option>
              <option value="rejected">ردشده‌ها</option>
              <option value="all">همهٔ مشاوران</option>
            </select>
            <button type="button" onClick={() => void loadManagedAgents()} disabled={agentsBusy} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold disabled:opacity-60">
              {agentsBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} تازه‌سازی
            </button>
          </div>
        </div>
        <label className="mt-3 block space-y-1 text-sm font-medium">
          یادداشت تصمیم هشتی (برای رد مشاور الزامی)
          <textarea rows={2} value={agentVerificationNotes} onChange={(event) => setAgentVerificationNotes(event.target.value)} maxLength={2000} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" placeholder="دلیل رد یا توضیح تصمیم را وارد کنید" />
        </label>
        <div className="mt-4 grid gap-3 rounded-xl border border-dashed border-slate-300 p-4 sm:grid-cols-2">
          <p className="text-sm leading-6 text-slate-600 sm:col-span-2">
            تخصیص اشتراک از طرف هشتی انجام می‌شود. پرداخت آنلاین یا ثبت مبلغ در این جریان وجود ندارد. تاریخ شروع فقط هنگام ایجاد اشتراک جدید لازم است؛ برای ارتقا فقط پلن بالاتر انتخاب کنید.
          </p>
          <label className="space-y-1 text-sm font-medium">تاریخ شروع اشتراک جدید
            <input type="datetime-local" value={subscriptionStartsAt} onChange={(event) => setSubscriptionStartsAt(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" />
          </label>
          <label className="space-y-1 text-sm font-medium">تاریخ انقضا (اختیاری)
            <input type="datetime-local" value={subscriptionExpiresAt} onChange={(event) => setSubscriptionExpiresAt(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" />
          </label>
          {subscriptionPlansError && <p role="alert" className="sm:col-span-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">{subscriptionPlansError}</p>}
        </div>
        {subscriptionActionError && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{subscriptionActionError}</p>}
        {subscriptionActionMessage && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{subscriptionActionMessage}</p>}
        {agentsError && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{agentsError}</p>}
        {agentsMessage && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{agentsMessage}</p>}
        {agentsBusy && managedAgents.length === 0 ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" /> در حال دریافت مشاوران...</p>
        ) : managedAgents.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">موردی برای این فیلتر وجود ندارد.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {managedAgents.map((agent) => (
              <article key={agent.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-bold">{agent.firstName} {agent.lastName}{agent.agencyName ? " · " + agent.agencyName : ""}</p>
                    <p className="mt-1 text-sm" dir="ltr">{agent.user.mobile}</p>
                    <p className="mt-1 text-xs text-slate-500">شناسه مشاور: {idText(agent.id)}</p>
                    <p className="mt-2 text-sm text-slate-600">وضعیت حساب: {agent.user.isActive ? "فعال" : "غیرفعال"}</p>
                  </div>
                  <div className="space-y-1 text-sm sm:text-left">
                    <p>اشتراک: <b>{agent.subscription?.subscriptionPlan.name ?? "بدون اشتراک فعال"}</b></p>
                    <p>مصرف ماه جاری: {agent.usage.usedCount.toLocaleString("fa-IR")} از {agent.usage.monthlyLimit.toLocaleString("fa-IR")}</p>
                    <p>باقی‌مانده: {agent.usage.remainingCount.toLocaleString("fa-IR")}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${agent.verificationStatus === "VERIFIED" ? "bg-emerald-50 text-emerald-800" : agent.verificationStatus === "REJECTED" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900"}`}>
                    {agent.verificationStatus === "VERIFIED" ? "تأییدشده" : agent.verificationStatus === "REJECTED" ? "ردشده" : "در انتظار بررسی"}
                  </span>
                  {agent.verificationStatus !== "VERIFIED" && (
                    <button type="button" onClick={() => void reviewAgent(agent.id, "VERIFIED")} disabled={busyAgentId === agent.id} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-60">
                      {busyAgentId === agent.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} {agent.verificationStatus === "REJECTED" ? "تأیید مجدد" : "تأیید مشاور"}
                    </button>
                  )}
                  {agent.verificationStatus === "PENDING" && (
                    <button type="button" onClick={() => void reviewAgent(agent.id, "REJECTED")} disabled={busyAgentId === agent.id || !agentVerificationNotes.trim()} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700 disabled:opacity-50">
                      {busyAgentId === agent.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} رد مشاور
                    </button>
                  )}
                  {agent.verificationStatus !== "PENDING" && (
                    <button type="button" onClick={() => void reviewAgent(agent.id, "PENDING")} disabled={busyAgentId === agent.id} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold disabled:opacity-60">
                      بازگشت به انتظار بررسی
                    </button>
                  )}
                </div>
                {agent.verificationNotes && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">یادداشت آخرین تصمیم: {agent.verificationNotes}</p>}
                {agent.verificationReviewedAt && <p className="mt-2 text-xs text-slate-400">آخرین بررسی: {new Date(agent.verificationReviewedAt).toLocaleString("fa-IR")}</p>}
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                    <label className="space-y-1 text-sm font-medium">
                      پلن اشتراک
                      <select
                        value={selectedPlanByAgent[agent.id] ?? ""}
                        onChange={(event) => setSelectedPlanByAgent((current) => ({ ...current, [agent.id]: event.target.value }))}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                      >
                        <option value="">انتخاب پلن فعال</option>
                        {adminSubscriptionPlans.map((plan) => (
                          <option
                            key={plan.id}
                            value={plan.id}
                            disabled={Boolean(agent.subscription && plan.level <= agent.subscription.subscriptionPlan.level)}
                          >
                            {plan.name} · {plan.monthlyContactLimit.toLocaleString("fa-IR")} دسترسی ماهانه
                            {agent.subscription && plan.level <= agent.subscription.subscriptionPlan.level ? " (سطح برابر/پایین‌تر)" : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => void assignOrUpgradeSubscription(agent)}
                      disabled={
                        busySubscriptionAgentId === agent.id ||
                        !selectedPlanByAgent[agent.id] ||
                        (agent.subscription
                          ? (adminSubscriptionPlans.find((plan) => plan.id === selectedPlanByAgent[agent.id])?.level ?? 0) <= agent.subscription.subscriptionPlan.level
                          : !subscriptionStartsAt)
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#043873] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                    >
                      {busySubscriptionAgentId === agent.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      {agent.subscription ? "ارتقای اشتراک" : "ایجاد اشتراک"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section id="contact-audit" hidden={selectedTool !== "reports"} className="scroll-mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold">گزارش دسترسی مشاوران به اطلاعات تماس</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">این گزارش، دسترسی‌های ثبت‌شده برای مشاهده شمارهٔ مشتری را نشان می‌دهد؛ گزارش عمومی تمام رویدادهای مدیریتی در مدل فعلی دیتابیس وجود ندارد.</p>
        <form onSubmit={(event) => void loadContactAuditLogs(event)} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1 text-sm">شناسه مشاور (اختیاری)<input value={auditAgentId} onChange={(event) => setAuditAgentId(event.target.value)} dir="ltr" className="w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
          <label className="space-y-1 text-sm">از زمان<input type="datetime-local" value={auditFrom} onChange={(event) => setAuditFrom(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
          <label className="space-y-1 text-sm">تا زمان<input type="datetime-local" value={auditTo} onChange={(event) => setAuditTo(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
          <div className="flex items-end"><button type="submit" disabled={auditBusy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#043873] px-4 py-3 text-sm font-bold text-white disabled:opacity-60">{auditBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} دریافت گزارش</button></div>
        </form>
        {auditError && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{auditError}</p>}
        {auditLogs.length > 0 && (
          <div className="mt-4 space-y-3">
            {auditLogs.map((log) => (
              <article key={log.id} className="rounded-xl border border-slate-200 p-4">
                <p className="font-bold">{log.agent.firstName} {log.agent.lastName} · <span dir="ltr">{log.agent.user.mobile}</span></p>
                <p className="mt-1 text-sm text-slate-600">مشتری: {log.customer.firstName} {log.customer.lastName} · <span dir="ltr">{log.customer.user.mobile}</span></p>
                <p className="mt-1 text-sm text-slate-600">درخواست: {log.searchRequest.city} · {log.searchRequest.transactionType} · {log.searchRequest.propertyType}</p>
                <p className="mt-1 text-xs text-slate-500">زمان: {new Date(log.accessedAt).toLocaleString("fa-IR")}</p>
                <p className="mt-1 text-xs text-slate-500">کد رویداد: {idText(log.id)}</p>
              </article>
            ))}
          </div>
        )}
        {!auditBusy && auditLogs.length === 0 && !auditError && <p className="mt-3 text-sm text-slate-500">برای مشاهده، فیلترها را تنظیم و «دریافت گزارش» را انتخاب کنید.</p>}
      </section>

      <section id="duplicate-management" hidden={selectedTool !== "property-management"} className="scroll-mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold"><FileSearch className="h-5 w-5 text-[#043873]" /> رفع مغایرت و بررسی املاک تکراری</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">شناسهٔ ملک اصلی را وارد کنید. سامانه کاندیداهای مشابه در محدودهٔ جست‌وجو را برمی‌گرداند و می‌توانید برای هر کاندید پرونده بسازید یا نتیجهٔ پروندهٔ موجود را ثبت کنید.</p>
        <form onSubmit={(event) => void loadDuplicateWork(event)} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-3 text-sm" value={propertyId} onChange={(e) => setPropertyId(e.target.value)} placeholder="شناسهٔ ملک اصلی" dir="ltr" />
          <button type="submit" disabled={matchingBusy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#043873] px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{matchingBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} بررسی تشابه</button>
        </form>
        {matchingError && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{matchingError}</p>}
        {matchingMessage && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{matchingMessage}</p>}
        {candidateMatches.length > 0 && (
          <div className="mt-4 space-y-3">
            <h3 className="font-bold">کاندیداهای مشابه</h3>
            {candidateMatches.map((match) => (
              <article key={match.property.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{match.property.city} · {match.property.district || "بدون محله"}</p>
                    <p className="mt-1 text-sm text-slate-600">{match.property.propertyType} · {match.property.area ?? "—"} متر · {match.property.rooms ?? "—"} اتاق</p>
                    <p className="mt-2 text-xs text-slate-500">شناسه: {idText(match.property.id)} · فاصله: {Math.round(match.distanceMeters)} متر</p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-800">شباهت {scoreLabel(match.similarityScore)}</span>
                </div>
                <button type="button" disabled={busyReviewId === match.property.id} onClick={() => void createReview(match.property.id)} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold disabled:opacity-50">
                  {busyReviewId === match.property.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />} ایجاد پروندهٔ بررسی
                </button>
              </article>
            ))}
          </div>
        )}
        {propertyId.trim() && (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <label className="block text-sm font-medium">یادداشت تصمیم بررسی‌ها
              <textarea className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" rows={2} value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="اختیاری" />
            </label>
            <h3 className="mt-4 font-bold">پرونده‌های بررسی این ملک</h3>
            {reviews.length === 0 ? <p className="mt-2 text-sm text-slate-500">پرونده‌ای برای این ملک در پاسخ فعلی وجود ندارد.</p> : (
              <div className="mt-3 space-y-3">
                {reviews.map((review) => (
                  <article key={review.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1 text-sm">
                        <p>ملک اصلی: {idText(review.primaryPropertyId)}</p>
                        <p>کاندید: {idText(review.candidatePropertyId)}</p>
                        <p>امتیاز تشابه: <b>{scoreLabel(review.similarityScore)}</b></p>
                        <p>کد پرونده: {idText(review.id)}</p>
                      </div>
                      <DecisionChip decision={review.decision} />
                    </div>
                    {review.notes && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">{review.notes}</p>}
                    {review.decision === null && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" disabled={busyReviewId === review.id} onClick={() => void decideReview(review.id, "SAME_PROPERTY")} className="inline-flex items-center gap-2 rounded-lg bg-[#043873] px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
                          {busyReviewId === review.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} یک ملک
                        </button>
                        <button type="button" disabled={busyReviewId === review.id} onClick={() => void decideReview(review.id, "DIFFERENT_PROPERTY")} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold disabled:opacity-50"><XCircle className="h-4 w-4" /> دو ملک متفاوت</button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section id="password-reset" hidden={selectedTool !== "user-management"} className="scroll-mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold"><LockKeyhole className="h-5 w-5 text-[#043873]" /> بازنشانی رمز عبور کاربر</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">برای امنیت، رمز فقط با شناسهٔ User تغییر می‌کند و پس از آن نشست‌های قبلی آن حساب باطل می‌شوند. API جست‌وجو/فهرست کاربران در بک‌اند فعلی وجود ندارد.</p>
          <form onSubmit={(event) => void resetPassword(event)} className="mt-4 space-y-3">
            <label className="block space-y-1 text-sm font-medium">شناسه User<input value={resetUserId} onChange={(e) => setResetUserId(e.target.value)} dir="ltr" className="w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
            <label className="block space-y-1 text-sm font-medium">رمز جدید<input type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
            {resetError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{resetError}</p>}
            {resetMessage && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{resetMessage}</p>}
            <button type="submit" disabled={resetBusy} className="rounded-xl bg-[#043873] px-4 py-3 text-sm font-bold text-white disabled:opacity-60">{resetBusy ? "در حال تغییر..." : "بازنشانی رمز"}</button>
          </form>
        </section>

        <section id="verification-case" hidden={selectedTool !== "property-management"} className="scroll-mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold">بررسی پروندهٔ تأیید ملک</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">شناسهٔ پروندهٔ تأیید را وارد کنید تا وضعیت آن ثبت شود. API فهرست پرونده‌های در انتظار بررسی در بک‌اند فعلی وجود ندارد.</p>
          <div className="mt-4 space-y-3">
            <label className="block space-y-1 text-sm font-medium">شناسهٔ پرونده<input value={verificationCaseId} onChange={(e) => setVerificationCaseId(e.target.value)} dir="ltr" className="w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
            <label className="block space-y-1 text-sm font-medium">یادداشت<textarea rows={2} value={verificationNotes} onChange={(e) => setVerificationNotes(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
            {verificationError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{verificationError}</p>}
            {verificationMessage && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{verificationMessage}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void reviewVerificationCase("VERIFIED")} disabled={verificationBusy} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"><CheckCircle2 className="h-4 w-4" /> تأیید پرونده</button>
              <button type="button" onClick={() => void reviewVerificationCase("REJECTED")} disabled={verificationBusy} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 disabled:opacity-60"><XCircle className="h-4 w-4" /> رد پرونده</button>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section id="location-audit" hidden={selectedTool !== "reports"} className="scroll-mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold">سوابق دسترسی به موقعیت دقیق ملک</h2>
          <form onSubmit={(event) => void loadAccessLogs(event)} className="mt-4 flex gap-2">
            <input value={logPropertyId} onChange={(e) => setLogPropertyId(e.target.value)} placeholder="شناسه ملک" dir="ltr" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            <button type="submit" disabled={logsBusy} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold disabled:opacity-60">{logsBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "نمایش"}</button>
          </form>
          {logsError && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{logsError}</p>}
          {accessLogs.length > 0 && <div className="mt-3 space-y-2">{accessLogs.map((log) => <article key={log.id} className="rounded-lg bg-slate-50 p-3 text-sm"><p>کاربر: {log.user?.mobile ?? log.userId}</p><p>نقش: {log.user?.role ?? "نامشخص"}</p><p>زمان: {new Date(log.accessedAt).toLocaleString("fa-IR")}</p><p>دلیل: {log.reason || "ثبت نشده"}</p></article>)}</div>}
          {!logsBusy && accessLogs.length === 0 && !logsError && <p className="mt-3 text-sm text-slate-500">شناسهٔ ملک را وارد کنید تا سوابق آن نمایش داده شود.</p>}
        </section>

        <section id="admin-audit" hidden={selectedTool !== "reports"} className="scroll-mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h2 className="text-lg font-bold">سوابق عملیات مدیریتی هشتی</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">در این قسمت رویدادهایی مانند تغییر وضعیت تأیید مشاور، ایجاد/ارتقای اشتراک و بازنشانی رمز ثبت‌شده نمایش داده می‌شود. گذرواژه یا هش آن در گزارش ذخیره نمی‌شود.</p>
          </div>
          <form onSubmit={(event) => void loadAdminAuditLogs(event)} className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="space-y-1 text-sm font-medium">نوع رویداد (اختیاری)
              <input value={adminAuditAction} onChange={(event) => setAdminAuditAction(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" placeholder="AGENT_VERIFICATION" />
            </label>
            <label className="space-y-1 text-sm font-medium">شناسه هدف (اختیاری)
              <input value={adminAuditTargetId} onChange={(event) => setAdminAuditTargetId(event.target.value)} dir="ltr" className="w-full rounded-xl border border-slate-300 px-3 py-2.5" />
            </label>
            <div className="flex items-end">
              <button type="submit" disabled={adminAuditBusy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#043873] px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
                {adminAuditBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} دریافت سوابق
              </button>
            </div>
          </form>
          {adminAuditError && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{adminAuditError}</p>}
          {adminAuditLogs.length > 0 ? (
            <div className="mt-4 space-y-3">
              {adminAuditLogs.map((log) => (
                <article key={log.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{log.action}</p>
                      <p className="mt-1 text-sm text-slate-600">عامل: {log.actorMobile ?? "حساب حذف‌شده یا نامشخص"} · نقش: {log.actorRole ?? "نامشخص"}</p>
                      <p className="mt-1 text-sm text-slate-600">هدف: {log.targetType} · {log.targetId ? idText(log.targetId) : "بدون شناسه"}</p>
                    </div>
                    <p className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString("fa-IR")}</p>
                  </div>
                  {log.details !== null && log.details !== undefined && (
                    <pre dir="ltr" className="mt-3 overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs leading-6 text-slate-700 whitespace-pre-wrap">{JSON.stringify(log.details, null, 2)}</pre>
                  )}
                  {(log.ipAddress || log.userAgent) && (
                    <details className="mt-2 text-xs text-slate-500">
                      <summary className="cursor-pointer">اطلاعات فنی رویداد</summary>
                      {log.ipAddress && <p dir="ltr" className="mt-2">IP: {log.ipAddress}</p>}
                      {log.userAgent && <p dir="ltr" className="mt-1 break-all">User-Agent: {log.userAgent}</p>}
                    </details>
                  )}
                </article>
              ))}
            </div>
          ) : (
            !adminAuditBusy && !adminAuditError && <p className="mt-3 text-sm text-slate-500">برای نمایش سوابق، فیلترها را تنظیم و دریافت سوابق را انتخاب کنید.</p>
          )}
        </section>

        <section hidden={selectedTool !== "user-management"} className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
          <h2 className="font-bold text-amber-950">وضعیت ثبت و تاریخچه تأیید مشاور</h2>
          <p className="mt-3 text-sm leading-7 text-amber-900">برای سازگاری با کد قدیمی، isVerified حفظ شده و وضعیت دقیق بررسی با verificationStatus نگهداری می‌شود. تغییر وضعیت مشاور، دلیل تصمیم و رویدادهای مدیریتی در تاریخچه ثبت می‌شوند.</p>
        </section>
      </div>

      <div id="property-tools" hidden={selectedTool !== "property-management"} className="scroll-mt-5"><HashtiPropertyAdminToolsPanel /></div>
      <div id="user-management" hidden={selectedTool !== "user-management"} className="scroll-mt-5"><HashtiUserManagementPanel /></div>
      <div id="verification-queue" hidden={selectedTool !== "property-management"} className="scroll-mt-5"><HashtiVerificationQueuePanel /></div>
      <section hidden={selectedTool !== "profile"} className="scroll-mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold">پروفایل</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">اطلاعات حساب فعال کارکنان هشتی</p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4"><dt className="text-sm text-slate-500">شماره موبایل</dt><dd className="mt-1 font-semibold" dir="ltr">{user.mobile}</dd></div>
          <div className="rounded-xl bg-slate-50 p-4"><dt className="text-sm text-slate-500">شناسه حساب</dt><dd className="mt-1 break-all font-mono text-sm" dir="ltr">{user.id}</dd></div>
        </dl>
      </section>
      <div id="notifications" hidden={selectedTool !== "notifications"} className="scroll-mt-5"><UserNotificationsPanel userId={user.id} /></div>
      </main>
    </div>
  );
}

function MiniFeature({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return <div className="rounded-xl border border-slate-200 p-3"><div className="flex items-center gap-2 font-bold">{icon}{title}</div><p className="mt-2 text-xs leading-6 text-slate-600">{detail}</p></div>;
}
function DecisionChip({ decision }: { decision: DuplicateReview["decision"] }) {
  if (decision === "SAME_PROPERTY") return <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">یک ملک</span>;
  if (decision === "DIFFERENT_PROPERTY") return <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">دو ملک متفاوت</span>;
  return <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">در انتظار تصمیم</span>;
}
