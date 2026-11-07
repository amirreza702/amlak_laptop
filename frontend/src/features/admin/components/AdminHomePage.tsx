"use client";

import { HashtiPanelWorkspace } from "@/shared/components/HashtiPanelWorkspace";


import { useState } from "react";
import { useAdminHomeAccess } from "@/features/admin/hooks/useAdminHomeAccess";
import AdminAgentsPage from "@/features/admin/components/AdminAgentsPage";
import AdminAuditPage from "@/features/admin/components/AdminAuditPage";
import AdminOwnersPage from "@/features/admin/components/AdminOwnersPage";
import AdminStaffPage from "@/features/admin/components/AdminStaffPage";
import AdminUsersPage from "@/features/admin/components/AdminUsersPage";
import AdminAgentPrivateNotesPage from "@/features/admin/components/AdminAgentPrivateNotesPage";
import AdminPropertyMonitoringPage from "@/features/admin/components/AdminPropertyMonitoringPage";

type AdminTool = "overview" | "users" | "owners" | "agents" | "staff" | "audit" | "agent-notes" | "property-monitoring";

const tools: { id: AdminTool; title: string; description: string }[] = [
  { id: "overview", title: "نمای کلی", description: "نمایش ابزارهای پنل مدیریت" },
  { id: "users", title: "مدیریت کاربران", description: "جست‌وجو، نقش، وضعیت و جزئیات حساب‌ها" },
  { id: "owners", title: "مدیریت مالکان", description: "پروفایل مالک، وضعیت حساب و سوابق" },
  { id: "agents", title: "مدیریت مشاوران", description: "تأیید مشاور، وضعیت حساب و سوابق" },
  { id: "staff", title: "کارکنان و دسترسی‌ها", description: "ساخت حساب کارکنان و تنظیم مجوزها" },
  { id: "audit", title: "سوابق مدیریتی", description: "مشاهده تغییرات و جزئیات عملیات مدیریتی" },
  { id: "agent-notes", title: "یادداشت‌های مشاوران", description: "مشاهده یادداشت‌های شخصی همه مشاوران" },
  { id: "property-monitoring", title: "ارزیابی و علاقه‌مندی املاک", description: "شاخص‌های محرمانه نظارتی و فهرست علاقه‌مندی‌ها؛ فقط مدیر ارشد" },
];

export default function AdminHomePage() {
  const [selectedTool, setSelectedTool] = useState<AdminTool>("overview");
  const error = useAdminHomeAccess();

  return (
    <div dir="rtl" className="hashti-panel-shell min-h-screen text-slate-900">
      <header className="border-b border-[#b89650]/20 bg-white/75 px-4 py-5 shadow-sm backdrop-blur-xl sm:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold text-amber-700">هشتی / مرکز مدیریت</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">پنل مدیریت هشتی</h1>
          <p className="mt-2 text-sm text-slate-600">تمام ابزارهای مدیریت در همین پنل در دسترس هستند.</p>
        </div>
      </header>

      <HashtiPanelWorkspace
        className="mx-auto max-w-none px-4 py-6 sm:px-8"
        sidebarLabel="منوی ابزارهای مدیریت"
        contentClassName="min-w-0"
        sidebar={
          <>

          <h2 className="px-3 pb-2 pt-1 text-sm font-bold text-slate-500">منوی ابزارها</h2>
          <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {tools.map(tool => (
              <button
                key={tool.id}
                type="button"
                onClick={() => setSelectedTool(tool.id)}
                aria-current={selectedTool === tool.id ? "page" : undefined}
                className={`min-h-11 shrink-0 whitespace-nowrap rounded-lg border border-transparent px-3 py-2.5 text-right text-sm font-semibold leading-5 transition lg:w-full ${selectedTool === tool.id ? "bg-[#062a5b] text-white" : "text-slate-700 hover:border-slate-200 hover:bg-slate-100"}`}
              >
                {tool.title}
              </button>
            ))}
          </nav>
        
          </>
        }
      >

          {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
          {selectedTool === "overview" ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="text-xl font-bold">ابزارهای مدیریت</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">برای استفاده از هر بخش، ابزار مربوط را از منوی همین پنل انتخاب کن. آدرس صفحه تغییر نمی‌کند.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {tools.filter(tool => tool.id !== "overview").map(tool => (
                  <button key={tool.id} type="button" onClick={() => setSelectedTool(tool.id)} className="rounded-xl border border-slate-200 bg-white p-4 text-right transition hover:border-blue-300 hover:shadow-sm">
                    <h3 className="font-bold">{tool.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{tool.description}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : selectedTool === "users" ? <AdminUsersPage />
            : selectedTool === "owners" ? <AdminOwnersPage />
            : selectedTool === "agents" ? <AdminAgentsPage />
            : selectedTool === "staff" ? <AdminStaffPage />
            : selectedTool === "agent-notes" ? <AdminAgentPrivateNotesPage />
            : selectedTool === "property-monitoring" ? <AdminPropertyMonitoringPage />
            : <AdminAuditPage />}
        
      </HashtiPanelWorkspace>
    </div>
  );
}
