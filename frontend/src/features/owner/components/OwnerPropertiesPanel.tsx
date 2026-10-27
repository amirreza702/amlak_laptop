"use client";

import { Building2, LoaderCircle, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { useOwnerProperties } from "../hooks/useOwnerProperties";

export function OwnerPropertiesPanel({ user, mode = "properties" }: { user: { mobile: string }; mode?: "properties" | "agents" }) {
  const {
    properties, loading, error, reload, setReload, search, setSearch, statusFilter, setStatusFilter,
    cityFilter, setCityFilter, districtFilter, setDistrictFilter, transactionFilter, setTransactionFilter,
    propertyTypeFilter, setPropertyTypeFilter, minPrice, setMinPrice, maxPrice, setMaxPrice,
    minArea, setMinArea, maxArea, setMaxArea, minRooms, setMinRooms, occupancyFilter, setOccupancyFilter,
    listingFilter, setListingFilter, busyAgent, actionMessage, actionError, visibleProperties, updateAgentAccess,
  } = useOwnerProperties(user.mobile, mode);

  return (
    <section className="space-y-4 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm sm:p-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold"><Building2 className="h-5 w-5 text-[#043873]" /> {mode === "agents" ? "مدیریت مشاوران مرتبط با املاک" : "مدیریت املاک من"}</h2>
        <button type="button" onClick={() => setReload((value) => value + 1)} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} تازه‌سازی
        </button>
      </div>
      <p className="text-sm leading-7 text-slate-600">فهرست بر اساس ارتباط‌های واقعی مالکیت خوانده می‌شود؛ املاک عمومی دیگران نمایش داده نمی‌شوند. از جست‌وجو و فیلتر برای محدودکردن فهرست استفاده کنید.</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><label className="relative block sm:col-span-2"><Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" /><input aria-label="جست‌وجوی ملک یا مشاور" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جست‌وجوی نشانی، شناسه یا مشاور..." className="w-full rounded-xl border border-slate-300 py-2.5 pr-9 pl-3 text-sm" /></label><input aria-label="شهر" value={cityFilter} onChange={(event) => setCityFilter(event.target.value)} placeholder="شهر" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" /><input aria-label="محله" value={districtFilter} onChange={(event) => setDistrictFilter(event.target.value)} placeholder="محله / منطقه" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" /><select aria-label="نوع ملک" value={propertyTypeFilter} onChange={(event) => setPropertyTypeFilter(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="all">همه انواع ملک</option><option value="APARTMENT">آپارتمان</option><option value="HOUSE">خانه</option><option value="VILLA">ویلا</option><option value="LAND">زمین</option><option value="SHOP">مغازه</option><option value="OFFICE">اداری</option><option value="GARDEN">باغ</option></select><select aria-label="نوع معامله" value={transactionFilter} onChange={(event) => setTransactionFilter(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="all">همه معاملات</option><option value="SALE">فروش</option><option value="FULL_DEPOSIT">رهن کامل</option><option value="RENT">اجاره</option></select><input aria-label="حداقل قیمت" type="number" min="0" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} placeholder="حداقل قیمت (تومان)" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" /><input aria-label="حداکثر قیمت" type="number" min="0" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder="حداکثر قیمت (تومان)" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" /><input aria-label="حداقل متراژ" type="number" min="0" value={minArea} onChange={(event) => setMinArea(event.target.value)} placeholder="حداقل متراژ (متر)" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" /><input aria-label="حداکثر متراژ" type="number" min="0" value={maxArea} onChange={(event) => setMaxArea(event.target.value)} placeholder="حداکثر متراژ (متر)" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" /><input aria-label="حداقل اتاق" type="number" min="0" value={minRooms} onChange={(event) => setMinRooms(event.target.value)} placeholder="حداقل تعداد اتاق" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" /><select aria-label="وضعیت سکونت" value={occupancyFilter} onChange={(event) => setOccupancyFilter(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="all">همه وضعیت‌های سکونت</option><option value="VACANT">خالی</option><option value="OCCUPIED">ساکن دارد</option></select><select aria-label="وضعیت آگهی" value={listingFilter} onChange={(event) => setListingFilter(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="all">همه وضعیت‌های آگهی</option><option value="DRAFT">پیش‌نویس</option><option value="PUBLISHED">منتشرشده</option><option value="REJECTED">ردشده</option><option value="EXPIRED">منقضی</option></select><select aria-label="وضعیت ملک یا مالکیت" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="all">همه وضعیت‌ها</option><option value="active">ملک فعال</option><option value="inactive">ملک غیرفعال</option><option value="PENDING">مالکیت در انتظار</option><option value="VERIFIED">مالکیت تأییدشده</option><option value="REJECTED">مالکیت ردشده</option></select></div>
      {actionError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{actionError}</p>}
      {actionMessage && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{actionMessage}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading ? <p className="flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" /> در حال دریافت املاک...</p>
        : !error && visibleProperties.length === 0 ? <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{properties.length === 0 ? "هنوز ملکی به این پروفایل مالک متصل نشده است." : "موردی با این جست‌وجو و فیلتر پیدا نشد."}</p>
        : <div className="space-y-3">{visibleProperties.map((item) => (
          <article key={item.propertyId} className="space-y-3 rounded-xl border border-slate-200 p-4">
            <div>
              <h3 className="font-bold">{item.property.city}، {item.property.district} · {item.property.propertyType}</h3>
              <p className="mt-1 text-sm text-slate-600">{item.property.address}</p>
              <p className="mt-1 text-xs text-slate-500">شناسه ملک: <span dir="ltr" className="font-mono">{item.propertyId}</span></p>
              <p className="mt-1 text-xs text-slate-500">سهم: {item.share.toLocaleString("fa-IR")} دانگ · وضعیت مالکیت: {({ PENDING: "در انتظار", VERIFIED: "تأییدشده", REJECTED: "ردشده" })[item.verificationStatus]}</p>
              {item.property.listing && <p className="mt-1 text-sm text-slate-700">آگهی: {item.property.listing.status} · {item.property.listing.transactionType}</p>}
              {item.property.listing?.salePrice != null && <p className="mt-1 text-sm text-slate-700">قیمت فروش: {Number(item.property.listing.salePrice).toLocaleString("fa-IR")} ریال</p>}
              {item.property.listing?.depositAmount != null && <p className="mt-1 text-sm text-slate-700">ودیعه: {Number(item.property.listing.depositAmount).toLocaleString("fa-IR")} ریال</p>}
              {item.property.listing?.rentAmount != null && <p className="mt-1 text-sm text-slate-700">اجاره: {Number(item.property.listing.rentAmount).toLocaleString("fa-IR")} ریال</p>}
              <p className="mt-1 text-xs text-slate-500">{item.property.isActive ? "ملک فعال است" : "ملک غیرفعال است"} · {item.isPrimary ? "مالک اصلی" : "مالک مشترک"}</p>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-[#043873]" /> مدیریت مشاوران مرتبط</p>
              {item.property.agents.length ? item.property.agents.map((relation) => (
                <div key={relation.agentId} className="mb-2 rounded-lg bg-slate-50 p-3 text-sm">
                  <p className="font-semibold">{relation.agent.firstName} {relation.agent.lastName}</p>
                  <p className="mt-1 text-xs text-slate-500">{relation.agent.agencyName || "بدون نام آژانس"} · {relation.status} · {relation.approvedByOwner ? "اجازه فعالیت داده شده" : "در انتظار اجازه مالک"}</p>
                  <p dir="ltr" className="mt-1 text-xs text-slate-500">{relation.agentId}</p>
                  <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={busyAgent !== null} onClick={() => void updateAgentAccess(item.propertyId, relation.agentId, "approval")} className="rounded-lg bg-[#043873] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{busyAgent === `${item.propertyId}:${relation.agentId}` ? "در حال ثبت..." : "تأیید دسترسی"}</button><button type="button" disabled={busyAgent !== null} onClick={() => void updateAgentAccess(item.propertyId, relation.agentId, "revoke")} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50">لغو دسترسی</button></div>
                </div>
              )) : <p className="text-sm text-slate-500">مشاوری به این ملک متصل نشده است.</p>}
            </div>
          </article>
        ))}</div>}
    </section>
  );
}
