"use client";

import { useState, type ReactNode } from "react";
import { Building2, ShieldCheck, UserRoundCheck, Users } from "lucide-react";
import type { UserPublic } from "@/features/auth/api/authApi";
import { UserNotificationsPanel } from "@/shared/components/UserNotificationsPanel";
import { OwnerPropertiesPanel } from "./OwnerPropertiesPanel";
import { OwnerAgentRequestsPanel } from "./OwnerAgentRequestsPanel";
import { useOwnerProfile } from "../hooks/useOwnerProfile";
import { OwnerProfilePanel } from "./OwnerProfilePanel";
import { useOwnerAgentAccess } from "../hooks/useOwnerAgentAccess";
import { PropertyRegistrationPanel } from "@/features/property/components/PropertyRegistrationPanel";

export function OwnerDashboard({ user, onToolSelected }: { user: UserPublic; onToolSelected?: () => void }) {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const {
    profile, firstName, setFirstName, lastName, setLastName,
    loadingProfile, savingProfile, profileError, message, saveProfile,
  } = useOwnerProfile(user.mobile);
  const {
    propertyId, setPropertyId, agentId, setAgentId, relationshipBusy,
    relationshipMessage, relationshipError, setAgentRelationship,
  } = useOwnerAgentAccess();

  return (
    <div dir="rtl" className="min-h-screen w-full mr-16 space-y-5 overflow-x-hidden bg-slate-50 px-3 py-4 sm:px-5 lg:mr-64 lg:px-6">
      <aside aria-label="ابزارهای پنل مالک" className="fixed inset-y-0 right-0 z-30 w-16 overflow-x-hidden overflow-y-auto border-l border-slate-200 bg-white p-1.5 shadow-sm sm:p-2 lg:w-64 lg:p-3">
        <h2 className="hidden px-3 py-2 text-base font-black text-slate-900 lg:block">پنل مالک</h2>
        <nav className="grid grid-cols-1 gap-1.5 lg:gap-2" aria-label="ابزارهای مالک">
          {[["profile", "پروفایل"], ["property-management", "مدیریت املاک"], ["agents", "مدیریت مشاوران"], ["notifications", "اعلان‌ها"]].map(([target, label]) => (
            <button key={target} type="button" title={label} aria-current={selectedTool === target ? "page" : undefined} onClick={() => { setSelectedTool(target); onToolSelected?.(); }} className={`flex min-h-11 min-w-0 items-center justify-center rounded-lg border px-1 py-2 text-center text-[11px] font-semibold leading-4 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#043873] lg:justify-start lg:px-3 lg:text-right lg:text-sm ${selectedTool === target ? "border-[#043873] bg-blue-50 text-[#043873]" : "border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-[#043873]"}`}><span className="hidden lg:inline">{label}</span><span className="lg:hidden">{label.slice(0,2)}</span></button>
          ))}
        </nav>
      </aside>
      <div hidden={selectedTool !== "profile"} className="grid gap-3 sm:grid-cols-3">
        <SummaryCard icon={<Building2 className="h-5 w-5" />} label="املاک ثبت‌شده" value="از طریق API فعلی قابل فهرست‌کردن نیست" />
        <SummaryCard icon={<UserRoundCheck className="h-5 w-5" />} label="مشاوران مجاز" value="فهرست کامل در دسترس نیست" />
        <SummaryCard icon={<ShieldCheck className="h-5 w-5" />} label="دسترسی‌ها" value="کنترل سرورمحور" />
      </div>

      <div hidden={selectedTool !== "profile"}>
        <OwnerProfilePanel
          profile={profile}
          mobile={user.mobile}
          firstName={firstName}
          setFirstName={setFirstName}
          lastName={lastName}
          setLastName={setLastName}
          loading={loadingProfile}
          saving={savingProfile}
          error={profileError}
          message={message}
          onSubmit={saveProfile}
        />
      </div>

      <section hidden={selectedTool !== "agents"} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2"><Users className="h-5 w-5 text-[#043873]" /><h2 className="text-lg font-bold">تأیید یا لغو دسترسی مشاور برای یک ملک</h2></div>
        <p className="mt-2 text-sm leading-7 text-slate-600">API فعلی عملیات تأیید/لغو را دارد، اما فهرست املاک مالک و مشاوران مرتبط را برنمی‌گرداند. تا تکمیل آن API، شناسه‌های موجود را وارد کنید. سرور همچنان مالکیت و دسترسی را کنترل می‌کند.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-medium">شناسه ملک<input className="w-full rounded-xl border border-slate-300 px-3 py-2.5" value={propertyId} onChange={(e) => setPropertyId(e.target.value)} dir="ltr" /></label>
          <label className="space-y-1 text-sm font-medium">شناسه پروفایل مشاور<input className="w-full rounded-xl border border-slate-300 px-3 py-2.5" value={agentId} onChange={(e) => setAgentId(e.target.value)} dir="ltr" /></label>
        </div>
        {relationshipError && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{relationshipError}</p>}
        {relationshipMessage && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{relationshipMessage}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => void setAgentRelationship("approval")} disabled={relationshipBusy} className="rounded-lg bg-[#043873] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{relationshipBusy ? "در حال ارسال..." : "تأیید مشاور"}</button>
          <button type="button" onClick={() => void setAgentRelationship("revoke")} disabled={relationshipBusy} className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 disabled:opacity-60">لغو دسترسی</button>
        </div>
      </section>

      <div hidden={selectedTool !== "property-management"}><PropertyRegistrationPanel mode="owner" /></div>
      <div hidden={selectedTool !== "property-management"}><OwnerPropertiesPanel user={user} mode="properties" /></div>
      <div hidden={selectedTool !== "agents"}><OwnerPropertiesPanel user={user} mode="agents" /></div>
      <div hidden={selectedTool !== "agents"}><OwnerAgentRequestsPanel ownerId={profile?.id} /></div>
      <div hidden={selectedTool !== "notifications"}><UserNotificationsPanel userId={user.id} /></div>
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-[#043873]">{icon}<p className="text-sm font-semibold text-slate-500">{label}</p></div><p className="mt-3 text-sm font-black leading-6 text-slate-900">{value}</p></div>;
}
