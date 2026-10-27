"use client";

import { useAdminHomeAccess } from "@/features/admin/hooks/useAdminHomeAccess";

const panels = [
  { href: "/admin/users", title: "کاربران", description: "فهرست حساب‌ها، جست‌وجو، نقش، وضعیت و جزئیات" },
  { href: "/admin/owners", title: "مالکان", description: "پروفایل مالک، وضعیت حساب و سوابق تغییرات" },
  { href: "/admin/agents", title: "مشاوران", description: "تأیید، وضعیت حساب، اشتراک و سوابق" },
  { href: "/admin/staff", title: "کارکنان و دسترسی‌ها", description: "ایجاد حساب کارمند و تنظیم مجوزهای جداگانه" },
  { href: "/admin/audit", title: "دفتر سوابق مدیریتی", description: "عامل تغییر، زمان، دلیل و مقادیر قبل و بعد" },
];

export default function AdminHomePage() {
  const error = useAdminHomeAccess();
  return <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-8"><div className="mx-auto max-w-6xl space-y-6">
    <header className="border-b border-slate-200 pb-5"><p className="text-sm font-semibold text-amber-700">هشتی / مرکز مدیریت</p><h1 className="mt-1 text-3xl font-black">مدیر ارشد هشتی</h1><p className="mt-2 text-sm text-slate-600">مدیریت حساب‌ها، پروفایل‌ها، اشتراک‌ها و سوابق با مجوزهای کنترل‌شده در بک‌اند</p></header>
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{panels.map(panel => <a key={panel.href} href={panel.href} className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-sm"><h2 className="text-lg font-bold">{panel.title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{panel.description}</p><p className="mt-4 text-sm font-semibold text-blue-800">ورود به بخش ←</p></a>)}</section>
  </div></main>;
}
