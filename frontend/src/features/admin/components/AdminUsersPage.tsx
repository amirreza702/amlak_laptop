"use client";

import { type AdminUser, type UserRole } from "@/features/auth/api/authApi";
import { useAdminUsers } from "@/features/admin/hooks/useAdminUsers";

const roles: Record<UserRole, string> = { CUSTOMER: "مشتری", OWNER: "مالک", AGENT: "مشاور", HASHTI: "کارمند هشتی" };
const profileName = (user: AdminUser) => {
  const profile = user.customer ?? user.owner ?? user.agent;
  return profile ? [profile.firstName, profile.lastName].filter(Boolean).join(" ") : "—";
};

export default function AdminUsersPage() {
  const {
    currentRole, currentUserId, users, searchInput, setSearchInput, reason, setReason,
    role, setRole, active, setActive, page, setPage, total, totalPages, loading, error,
    selectedUser, setSelectedUser, submitSearch, changeUserStatus, showUserDetails,
  } = useAdminUsers();

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-2 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-700">هشتی / مدیریت</p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">مدیریت کاربران</h1>
            <p className="mt-2 text-sm text-slate-600">جست‌وجو و مشاهده فهرست مشتریان، مالکان، مشاوران و کارکنان هشتی</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm">تعداد نتایج: <strong>{total.toLocaleString("fa-IR")}</strong></div>
        </header>

        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

        {currentRole === "HASHTI" && <>
          <form onSubmit={submitSearch} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(0,2fr)_1fr_1fr_auto]">
            <label className="space-y-1 text-sm font-medium">جست‌وجو
              <input value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder="نام، موبایل یا نام آژانس" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" />
            </label>
            <label className="space-y-1 text-sm font-medium">نقش
              <select value={role} onChange={event => { setRole(event.target.value as UserRole | ""); setPage(1); }} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal">
                <option value="">همه نقش‌ها</option><option value="CUSTOMER">مشتری</option><option value="OWNER">مالک</option><option value="AGENT">مشاور</option><option value="HASHTI">کارمند هشتی</option>
              </select>
            </label>
            <label className="space-y-1 text-sm font-medium">وضعیت حساب
              <select value={active} onChange={event => { setActive(event.target.value as "true" | "false" | ""); setPage(1); }} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal">
                <option value="">همه وضعیت‌ها</option><option value="true">فعال</option><option value="false">غیرفعال</option>
              </select>
            </label>
            <div className="flex items-end"><button type="submit" className="w-full rounded-lg bg-[#062a5b] px-5 py-2.5 font-semibold text-white hover:bg-[#0b3b79] md:w-auto">جست‌وجو</button></div>
          </form>
          <label className="block space-y-1 text-sm font-medium">دلیل تغییر وضعیت حساب<input value={reason} onChange={event => setReason(event.target.value)} maxLength={1000} placeholder="دلیل تغییر باید حداقل ۳ حرف داشته باشد" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal" /></label>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {loading ? <p className="p-8 text-center text-sm text-slate-600">در حال دریافت اطلاعات…</p> : users.length === 0 ? <p className="p-8 text-center text-sm text-slate-600">کاربری با این مشخصات پیدا نشد.</p> : (
              <div className="overflow-x-auto"><table className="w-full min-w-[900px] border-collapse text-right text-sm">
                <thead className="bg-slate-100 text-slate-700"><tr><th className="px-4 py-3">نام و نام خانوادگی</th><th className="px-4 py-3">شماره موبایل</th><th className="px-4 py-3">نقش</th><th className="px-4 py-3">وضعیت حساب</th><th className="px-4 py-3">تأیید مشاور</th><th className="px-4 py-3">تاریخ ثبت</th><th className="px-4 py-3">جزئیات</th><th className="px-4 py-3">مدیریت حساب</th></tr></thead>
                <tbody>{users.map(user => <tr key={user.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{profileName(user)}</td><td dir="ltr" className="px-4 py-3 text-right">{user.mobile}</td><td className="px-4 py-3">{roles[user.role]}</td>
                  <td className="px-4 py-3"><span className={user.isActive ? "rounded-md bg-emerald-50 px-2 py-1 text-emerald-800" : "rounded-md bg-red-50 px-2 py-1 text-red-800"}>{user.isActive ? "فعال" : "غیرفعال"}</span></td>
                  <td className="px-4 py-3">{user.agent ? (user.agent.isVerified ? "تأییدشده" : "تأییدنشده") : "—"}</td><td className="px-4 py-3 text-slate-600">{new Date(user.createdAt).toLocaleDateString("fa-IR")}</td><td className="px-4 py-3"><button onClick={() => void showUserDetails(user)} className="rounded-md border px-3 py-1.5">مشاهده</button></td><td className="px-4 py-3"><button disabled={loading || user.id === currentUserId || Boolean(user.isSuperAdmin)} onClick={() => void changeUserStatus(user)} className="rounded-md border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40">{user.isActive ? "غیرفعال‌کردن" : "فعال‌کردن"}</button></td>
                </tr>)}</tbody>
              </table></div>
            )}
            <footer className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="text-slate-600">صفحه {page.toLocaleString("fa-IR")} از {totalPages.toLocaleString("fa-IR")}</span>
              <div className="flex gap-2">
                <button type="button" disabled={page <= 1 || loading} onClick={() => setPage(value => Math.max(1, value - 1))} className="rounded-lg border border-slate-300 px-4 py-2 disabled:opacity-40">قبلی</button>
                <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage(value => value + 1)} className="rounded-lg border border-slate-300 px-4 py-2 disabled:opacity-40">بعدی</button>
              </div>
            </footer>
          </section>
          {selectedUser && <section className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><h2 className="font-bold">جزئیات حساب {profileName(selectedUser)}</h2><button onClick={() => setSelectedUser(null)} className="rounded border px-3 py-1">بستن</button></div><p className="mt-3 text-sm">شناسه: <span dir="ltr">{selectedUser.id}</span></p><p className="mt-1 text-sm">موبایل: <span dir="ltr">{selectedUser.mobile}</span> | نقش: {roles[selectedUser.role]} | وضعیت: {selectedUser.isActive ? "فعال" : "غیرفعال"}</p><p className="mt-1 text-sm">تاریخ ایجاد: {new Date(selectedUser.createdAt).toLocaleString("fa-IR")} | آخرین بروزرسانی: {new Date(selectedUser.updatedAt).toLocaleString("fa-IR")}</p>{selectedUser.agent && <p className="mt-1 text-sm">آژانس: {selectedUser.agent.agencyName || "—"} | تأیید مشاور: {selectedUser.agent.isVerified ? "تأییدشده" : "تأییدنشده"}</p>}{selectedUser.role === "HASHTI" && <p className="mt-1 text-sm">سطح دسترسی: {selectedUser.isSuperAdmin ? "مدیر ارشد هشتی" : (selectedUser.adminPermissions || []).join("، ") || "بدون مجوز"}</p>}</section>}
        </>}
      </div>
    </main>
  );
}
