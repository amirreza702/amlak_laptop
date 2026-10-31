"use client";

import dynamic from "next/dynamic";
import { usePropertyRegistration } from "../hooks/usePropertyRegistration";
import { PropertyMediaEditor } from "./PropertyMediaEditor";
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
  onSavePrivateNote?: (propertyId: string, note: string) => Promise<void>;
}

export function PropertyRegistrationPanel({ mode, onSavePrivateNote }: PropertyRegistrationPanelProps) {
  const {
    propertyType, setPropertyType,
    transactionType, setTransactionType,
    city, setCity, district, setDistrict, address, setAddress,
    postalCode, setPostalCode, coordinates, setCoordinates,
    area, setArea, rooms, setRooms, floor, setFloor, details, setDetails,
    salePrice, setSalePrice, depositAmount, setDepositAmount,
    rentAmount, setRentAmount,
    busy, error, message, createdPropertyId, listingCreated,
    submit,
    internalNote, setInternalNote,
  } = usePropertyRegistration(mode === "agent" ? onSavePrivateNote : undefined);
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
            <label className="space-y-1.5 text-sm font-semibold">متراژ (مترمربع)
              <input className={inputClass} type="number" min="0.1" step="0.1" required value={area} onChange={(e) => setArea(e.target.value)} />
            </label>
            <label className="space-y-1.5 text-sm font-semibold">تعداد اتاق
              <input className={inputClass} type="number" min="0" max="100" step="1" required value={rooms} onChange={(e) => setRooms(e.target.value)} />
            </label>
            <label className="space-y-1.5 text-sm font-semibold">طبقه
              <input className={inputClass} type="number" min="-10" max="200" step="1" required value={floor} onChange={(e) => setFloor(e.target.value)} />
            </label>
          </div>

          <fieldset className="rounded-xl border border-slate-200 p-4">
            <legend className="px-2 text-sm font-bold"><span aria-hidden="true" className="ml-1 text-red-600">*</span>موقعیت جغرافیایی (اجباری)</legend>
            <PropertyLocationPicker value={coordinates} onChange={setCoordinates} city={city} />
          </fieldset>

          {mode === "agent" && (
            <label className="block space-y-1.5 text-sm font-semibold">
              توضیحات خصوصی مشاور (اختیاری)
              <textarea
                rows={3}
                maxLength={10000}
                value={internalNote}
                onChange={(event) => setInternalNote(event.target.value)}
                className={inputClass}
                placeholder="یادداشت داخلی درباره این ملک؛ فقط برای شما و مدیر ارشد هشتی"
              />
              <span className="block text-xs font-normal leading-6 text-slate-500">
                این متن در توضیحات عمومی آگهی قرار نمی‌گیرد و پس از ثبت ملک به‌صورت خصوصی ذخیره می‌شود.
              </span>
            </label>
          )}
        </fieldset>

          <div className="space-y-4 rounded-xl border border-slate-200 p-4">
            <h3 className="font-bold">۳. جزئیات تکمیلی ملک</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">سال ساخت<input type="number" min="1300" max="1500" value={details.yearBuilt} onChange={e=>setDetails(v=>({...v,yearBuilt:e.target.value}))} className={inputClass} /></label>
              <label className="space-y-1 text-sm">شماره واحد<input value={details.unitNumber} onChange={e=>setDetails(v=>({...v,unitNumber:e.target.value}))} className={inputClass} /></label>
              <label className="space-y-1 text-sm"><span className="text-red-600">*</span> تعداد کل واحدها<input required type="number" min="1" step="1" value={details.totalUnits} onChange={e=>setDetails(v=>({...v,totalUnits:e.target.value}))} className={inputClass} /></label>
              <label className="space-y-1 text-sm">تعداد پارکینگ<input type="number" min="0" step="1" value={details.parkingCount} onChange={e=>setDetails(v=>({...v,parkingCount:e.target.value}))} className={inputClass} /></label>
              <label className="space-y-1 text-sm">نوع پارکینگ<input value={details.parkingType} onChange={e=>setDetails(v=>({...v,parkingType:e.target.value}))} className={inputClass} /></label>
              <label className="space-y-1 text-sm">شماره پارکینگ<input value={details.parkingNumber} onChange={e=>setDetails(v=>({...v,parkingNumber:e.target.value}))} className={inputClass} /></label>
              {([["hasElevator","آسانسور"],["hasStorage","انباری"],["hasBalcony","بالکن"],["hasYard","حیاط"]] as const).map(([key,label])=><label key={key} className="space-y-1 text-sm">{label}<select value={details[key]} onChange={e=>setDetails(v=>({...v,[key]:e.target.value}))} className={inputClass}><option value="">نامشخص</option><option value="true">دارد</option><option value="false">ندارد</option></select></label>)}
              <label className="space-y-1 text-sm">سیستم گرمایش<input value={details.heatingSystem} onChange={e=>setDetails(v=>({...v,heatingSystem:e.target.value}))} className={inputClass} /></label>
              <label className="space-y-1 text-sm">سیستم سرمایش<input value={details.coolingSystem} onChange={e=>setDetails(v=>({...v,coolingSystem:e.target.value}))} className={inputClass} /></label>
              <label className="space-y-1 text-sm"><span className="text-red-600">*</span> نوع سند<select required value={details.documentType} onChange={e=>setDetails(v=>({...v,documentType:e.target.value}))} className={inputClass}><option value="">انتخاب کنید</option><option value="SINGLE_SHEET">تک‌برگ</option><option value="OLD_DEED">سند دفترچه‌ای</option><option value="OFFICIAL_CONTRACT">قرارداد رسمی</option><option value="ORDINARY_CONTRACT">قولنامه عادی</option></select></label>
              <label className="space-y-1 text-sm"><span className="text-red-600">*</span> نوع مالکیت<select required value={details.ownershipType} onChange={e=>setDetails(v=>({...v,ownershipType:e.target.value}))} className={inputClass}><option value="">انتخاب کنید</option><option value="SIX_DANG">شش‌دانگ</option><option value="SHARED">مشاع</option></select></label>
              <label className="space-y-1 text-sm"><span className="text-red-600">*</span> وضعیت عرصه<select required value={details.landTenure} onChange={e=>setDetails(v=>({...v,landTenure:e.target.value}))} className={inputClass}><option value="">انتخاب کنید</option><option value="FREEHOLD">ملکی</option><option value="ENDOWMENT">اوقافی</option></select></label>
              <label className="space-y-1 text-sm">وضعیت بازسازی<select value={details.renovationStatus} onChange={e=>setDetails(v=>({...v,renovationStatus:e.target.value}))} className={inputClass}><option value="">نامشخص</option><option value="NO_RENOVATION">بدون بازسازی</option><option value="PARTIAL">بازسازی جزئی</option><option value="FULL">بازسازی کامل</option></select></label>
              <label className="space-y-1 text-sm">سال بازسازی<input type="number" min="1300" max="1500" value={details.renovationYear} onChange={e=>setDetails(v=>({...v,renovationYear:e.target.value}))} className={inputClass} /></label>
              <label className="space-y-1 text-sm">وضعیت سکونت<select value={details.occupancyStatus} onChange={e=>setDetails(v=>({...v,occupancyStatus:e.target.value}))} className={inputClass}><option value="VACANT">خالی</option><option value="OWNER_OCCUPIED">مالک ساکن است</option><option value="TENANT_OCCUPIED">مستأجر دارد</option></select></label>
            </div>
            <label className="block space-y-1 text-sm">توضیحات<textarea rows={4} maxLength={10000} value={details.description} onChange={e=>setDetails(v=>({...v,description:e.target.value}))} className={inputClass} /></label>
          </div>

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

        {createdPropertyId && <PropertyMediaEditor propertyId={createdPropertyId} />}
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
