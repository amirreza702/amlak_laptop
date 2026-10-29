"use client";

import { useState, type ReactNode } from "react";
import { Building2, ShieldCheck, UserRoundCheck } from "lucide-react";
import type { UserPublic } from "@/features/auth/api/authApi";
import { UserNotificationsPanel } from "@/shared/components/UserNotificationsPanel";
import { OwnerPropertiesPanel } from "./OwnerPropertiesPanel";
import { OwnerAgentRequestsPanel } from "./OwnerAgentRequestsPanel";
import { useOwnerProfile } from "../hooks/useOwnerProfile";
import { OwnerProfilePanel } from "./OwnerProfilePanel";
import { PropertyRegistrationPanel } from "@/features/property/components/PropertyRegistrationPanel";
import { Modal } from "@/shared/components/Modal";


export function OwnerDashboard({ user, onToolSelected }: { user: UserPublic; onToolSelected?: () => void }) {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [propertyModalOpen, setPropertyModalOpen] = useState(false);
  const {
    profile, firstName, setFirstName, lastName, setLastName,
    loadingProfile, savingProfile, profileError, message, saveProfile,
  } = useOwnerProfile(user.mobile);
  return (
    <div dir="rtl" className="mx-auto grid min-h-[calc(100vh-7rem)] w-full max-w-none grid-cols-1 gap-4 bg-slate-50 px-3 pt-20 pb-4 text-slate-900 sm:px-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-6">
      <aside aria-label="ابزارهای پنل مالک" className="h-fit min-w-0 rounded-xl border border-slate-200 bg-white p-3 lg:sticky lg:top-24">
        <h2 className="px-3 pb-2 pt-1 text-sm font-bold text-slate-500">پنل مالک</h2>
        <nav className="flex gap-2 overflow-x-auto lg:flex-col" aria-label="ابزارهای مالک">
          {[["profile", "پروفایل"], ["property-management", "مدیریت املاک"], ["agents", "مدیریت مشاوران"], ["notifications", "اعلان‌ها"]].map(([target, label]) => (
            <button key={target} type="button" title={label} aria-current={selectedTool === target ? "page" : undefined} onClick={() => { setSelectedTool(target); onToolSelected?.(); }} className={`flex min-h-11 shrink-0 items-center justify-center rounded-lg border px-3 py-2 text-right text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#043873] lg:w-full ${selectedTool === target ? "border-[#043873] bg-blue-50 text-[#043873]" : "border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-[#043873]"}`}>{label}</button>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 w-full space-y-5">
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

            <section hidden={selectedTool !== "property-management"} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div><h2 className="text-lg font-bold">مدیریت املاک</h2><p className="mt-1 text-sm text-slate-600">املاک متصل به حساب مالک را مشاهده و مدیریت کنید.</p></div>
        <button type="button" onClick={() => setPropertyModalOpen(true)} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#043873] px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-900">ایجاد ملک جدید</button>
      </section>
      <div hidden={selectedTool !== "property-management"}><OwnerPropertiesPanel user={user} mode="properties" /></div>
      <Modal open={propertyModalOpen} title="ایجاد ملک جدید" description="مشخصات ملک و اطلاعات معامله را وارد کنید." onClose={() => setPropertyModalOpen(false)} size="full">
        <PropertyRegistrationPanel mode="owner" />
      </Modal>
            <div hidden={selectedTool !== "agents"}><OwnerAgentRequestsPanel ownerId={profile?.id} /></div>
      <div hidden={selectedTool !== "notifications"}><UserNotificationsPanel userId={user.id} /></div>
      </main>
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-[#043873]">{icon}<p className="text-sm font-semibold text-slate-500">{label}</p></div><p className="mt-3 text-sm font-black leading-6 text-slate-900">{value}</p></div>;
}
