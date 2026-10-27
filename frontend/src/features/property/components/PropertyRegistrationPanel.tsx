"use client";

import dynamic from "next/dynamic";
import { usePropertyRegistration } from "../hooks/usePropertyRegistration";
import type { PropertyType, TransactionType } from "../types/propertyRegistration";

// نقشه به صورت client-only بارگذاری می‌شود تا Leaflet در Static Export به window وابسته نشود.
const PropertyLocationPicker = dynamic(
  () => import("./PropertyLocationPicker"),
  {
    ssr: false,
    loading: () => <div className="flex h-72 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500 sm:h-96">در حال بارگذاری نقشه...</div>,
  }
);

const propertyTypes: { value: PropertyType; label: string }[] = [
  { value: "APARTMENT", label: "آپارتمان" },
  { value: "HOUSE", label: "خانه" },
  { value: "VILLA", label: "ویلا" },
  { value: "LAND", label: "زمین" },
  { value: "SHOP", label: "مغازه" },
  { value: "OFFICE", label: "اداری" },
  { value: "GARDEN", label: "باغ" },
];

const transactionTypes: { value: TransactionType; label: string }[] = [
  { value: "SALE", label: "فروش" },
  { value: "FULL_DEPOSIT", label: "رهن کامل" },
  { value: "RENT", label: "اجاره" },
];

const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#043873] focus:ring-2 focus:ring-blue-100";

interface PropertyRegistrationPanelProps {
  mode: "owner" | "agent";
}

export function PropertyRegistrationPanel({ mode }: PropertyRegistrationPanelProps) {
  const {
    propertyType, setPropertyType,
    transactionType, setTransactionType,
    city, setCity, district, setDistrict, address, setAddress,
    postalCode, setPostalCode, coordinates, setCoordinates,
    area, setArea, rooms, setRooms, floor, setFloor,
    salePrice, setSalePrice, depositAmount, setDepositAmount,
    rentAmount, setRentAmount,
    busy, error, message, createdPropertyId, listingCreated,
    submit,
  } = usePropertyRegistration();
  return (
    <section dir="rtl" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="text-xl font-black text-slate-900">ثبت ملک و اطلاعات معامله</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          {mode === "owner"
            ? "مشخصات ملک و نوع معامله را ثبت کنید. ادعای مالکیت باید توسط هشتی تأیید شود؛ ثبت اطلاعات به معنی انتشار آگهی نیست."
            : "مشخصات ملک و نوع معامله را ثبت کنید. هویت مشاور از نشست امن سرور تعیین می‌شود و دسترسی به ملک تابع تأییدهای لازم است."}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <fieldset disabled={Boolean(createdPropertyId) || busy} className="space-y-4 disabled:opacity-70">
          <legend className="mb-3 text-base font-bold">۱. مشخصات ملک</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-semibold"><span aria-hidden="true" className="ml-1 text-red-600">*</span>نوع ملک
              <select className={inputClass} value={propertyType} onChange={(e) => setPropertyType(e.target.value as PropertyType)} required>
                {propertyTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-semibold"><span aria-hidden="true" className="ml-1 text-red-600">*</span>شهر
              <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} required maxLength={100} />
            </label>
            <label className="space-y-1.5 text-sm font-semibold"><span aria-hidden="true" className="ml-1 text-red-600">*</span>محله / منطقه
              <input className={inputClass} value={district} onChange={(e) => setDistrict(e.target.value)} required maxLength={120} />
            </label>
            <label className="space-y-1.5 text-sm font-semibold"><span aria-hidden="true" className="ml-1 text-red-600">*</span>نشانی ملک
              <input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} required maxLength={500} />
            </label>
            <label className="space-y-1.5 text-sm font-semibold">کد پستی (اختیاری)
              <input className={inputClass} inputMode="numeric" pattern="[0-9]{10}" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="۱۰ رقم" />
            </label>
            <label className="space-y-1.5 text-sm font-semibold">متراژ (مترمربع، اختیاری)
              <input className={inputClass} type="number" min="0.1" step="0.1" value={area} onChange={(e) => setArea(e.target.value)} />
            </label>
            <label className="space-y-1.5 text-sm font-semibold">تعداد اتاق (اختیاری)
              <input className={inputClass} type="number" min="0" max="100" step="1" value={rooms} onChange={(e) => setRooms(e.target.value)} />
            </label>
            <label className="space-y-1.5 text-sm font-semibold">طبقه (اختیاری)
              <input className={inputClass} type="number" min="0" max="200" step="1" value={floor} onChange={(e) => setFloor(e.target.value)} />
            </label>
          </div>

          <fieldset className="rounded-xl border border-slate-200 p-4">
            <legend className="px-2 text-sm font-bold"><span aria-hidden="true" className="ml-1 text-red-600">*</span>موقعیت جغرافیایی (اجباری)</legend>
            <PropertyLocationPicker value={coordinates} onChange={setCoordinates} city={city} />
          </fieldset>
        </fieldset>

        <fieldset disabled={listingCreated || busy} className="space-y-4 rounded-xl border border-slate-200 p-4 disabled:opacity-70">
          <legend className="px-2 text-base font-bold">۲. نوع معامله و قیمت</legend>
          <label className="block space-y-1.5 text-sm font-semibold"><span aria-hidden="true" className="ml-1 text-red-600">*</span>نوع معامله
            <select className={inputClass} value={transactionType} onChange={(e) => setTransactionType(e.target.value as TransactionType)} required>
              {transactionTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          {transactionType === "SALE" && (
            <label className="block space-y-1.5 text-sm font-semibold"><span aria-hidden="true" className="ml-1 text-red-600">*</span>قیمت فروش (تومان)
              <input className={inputClass} type="number" min="1" step="1" inputMode="numeric" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} required />
            </label>
          )}
          {transactionType === "FULL_DEPOSIT" && (
            <label className="block space-y-1.5 text-sm font-semibold"><span aria-hidden="true" className="ml-1 text-red-600">*</span>مبلغ رهن کامل (تومان)
              <input className={inputClass} type="number" min="1" step="1" inputMode="numeric" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} required />
            </label>
          )}
          {transactionType === "RENT" && (
            <label className="block space-y-1.5 text-sm font-semibold"><span aria-hidden="true" className="ml-1 text-red-600">*</span>مبلغ اجاره ماهانه (تومان)
              <input className={inputClass} type="number" min="1" step="1" inputMode="numeric" value={rentAmount} onChange={(e) => setRentAmount(e.target.value)} required />
            </label>
          )}
          <p className="text-xs leading-6 text-slate-500">طبق منطق فعلی سرور، برای فروش قیمت فروش، برای رهن کامل مبلغ رهن و برای اجاره مبلغ اجاره الزامی است.</p>
        </fieldset>

        {createdPropertyId && !listingCreated && (
          <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-7 text-amber-900">
            ملک با شناسه زیر ثبت شده، اما اطلاعات معامله هنوز ثبت نشده است. با زدن دکمه تلاش مجدد فقط معامله ثبت می‌شود و ملک تکراری ساخته نخواهد شد.
            <span className="mt-2 block break-all font-mono text-xs" dir="ltr">{createdPropertyId}</span>
          </p>
        )}
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-7 text-red-800">{error}</p>}
        {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-7 text-emerald-800">{message}{createdPropertyId && <span className="mt-2 block break-all font-mono text-xs" dir="ltr">شناسه ملک: {createdPropertyId}</span>}</p>}

        <div className="flex justify-end border-t border-slate-100 pt-4">
          <button type="submit" disabled={busy || listingCreated} className="min-h-11 rounded-xl bg-[#043873] px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60">
            {busy ? "در حال ثبت..." : createdPropertyId && !listingCreated ? "تلاش دوباره برای ثبت معامله" : listingCreated ? "ثبت کامل شد" : "ثبت ملک و اطلاعات معامله"}
          </button>
        </div>
      </form>
    </section>
  );
}
