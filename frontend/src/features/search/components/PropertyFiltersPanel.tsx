"use client";

import { X } from "lucide-react";
import type { PropertySearchState } from "../types/search";

interface PropertyFiltersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: PropertySearchState;
  setFilter: <K extends keyof PropertySearchState>(key: K, value: PropertySearchState[K]) => void;
  resetFilters: () => void;
  getActiveFilterCount: () => number;
  search: () => Promise<void>;
  isSearching: boolean;
}

const inputClass = "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

function RangeField({ label, minValue, maxValue, onMinChange, onMaxChange, minPlaceholder = "حداقل", maxPlaceholder = "حداکثر", min = 0 }: {
  label: string; minValue: string; maxValue: string;
  onMinChange: (value: string) => void; onMaxChange: (value: string) => void;
  minPlaceholder?: string; maxPlaceholder?: string; min?: number;
}) {
  return <section className="space-y-2">
    <h3 className="text-sm font-bold text-slate-800">{label}</h3>
    <div className="grid grid-cols-2 gap-3">
      <input className={inputClass} type="number" min={min} value={minValue} onChange={(event) => onMinChange(event.target.value)} placeholder={minPlaceholder} />
      <input className={inputClass} type="number" min={min} value={maxValue} onChange={(event) => onMaxChange(event.target.value)} placeholder={maxPlaceholder} />
    </div>
  </section>;
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return <label className="block space-y-1.5 text-sm">
    <span className="font-semibold text-slate-700">{label}</span>
    <select className={inputClass} value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">مهم نیست</option>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </label>;
}

export function PropertyFiltersPanel({ isOpen, onClose, filters, setFilter, resetFilters, getActiveFilterCount, search, isSearching }: PropertyFiltersPanelProps) {
  if (!isOpen) return null;
  const handleSearch = async () => { await search(); onClose(); };

  return <div className="mt-3 max-h-[calc(100dvh-150px)] overflow-y-auto rounded-xl border border-white/70 bg-white/95 p-4 shadow-2xl backdrop-blur-xl sm:p-5">
    <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
      <div>
        <h2 className="text-base font-bold text-slate-900">فیلترهای جستجو</h2>
        <p className="mt-1 text-xs text-slate-500">{getActiveFilterCount() === 0 ? "هنوز فیلتری انتخاب نشده" : getActiveFilterCount() + " فیلتر فعال"}</p>
      </div>
      <button type="button" onClick={onClose} aria-label="بستن فیلترها" className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"><X size={18} /></button>
    </div>

    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800">نوع معامله و ملک</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField label="نوع معامله" value={filters.transactionType} onChange={(value) => setFilter("transactionType", value as PropertySearchState["transactionType"])} options={[
            { value: "فروش", label: "فروش" }, { value: "رهن کامل", label: "رهن کامل" }, { value: "اجاره", label: "اجاره" }, { value: "رهن و اجاره", label: "رهن و اجاره" },
          ]} />
          <SelectField label="نوع ملک" value={filters.propertyType} onChange={(value) => setFilter("propertyType", value as PropertySearchState["propertyType"])} options={[
            { value: "آپارتمان", label: "آپارتمان" }, { value: "خانه", label: "خانه" }, { value: "ویلا", label: "ویلا" }, { value: "زمین", label: "زمین" }, { value: "مغازه", label: "مغازه" }, { value: "اداری", label: "اداری" }, { value: "باغ", label: "باغ" },
          ]} />
        </div>
        {filters.transactionType === "فروش" && <RangeField label="قیمت فروش (تومان)" minValue={filters.minSalePrice} maxValue={filters.maxSalePrice} onMinChange={(value) => setFilter("minSalePrice", value)} onMaxChange={(value) => setFilter("maxSalePrice", value)} />}
        {filters.transactionType === "رهن کامل" && <RangeField label="مبلغ رهن کامل (تومان)" minValue={filters.minDepositAmount} maxValue={filters.maxDepositAmount} onMinChange={(value) => setFilter("minDepositAmount", value)} onMaxChange={(value) => setFilter("maxDepositAmount", value)} />}
        {filters.transactionType === "اجاره" && <RangeField label="اجاره ماهانه (تومان)" minValue={filters.minRentAmount} maxValue={filters.maxRentAmount} onMinChange={(value) => setFilter("minRentAmount", value)} onMaxChange={(value) => setFilter("maxRentAmount", value)} />}
        {filters.transactionType === "رهن و اجاره" && <>
          <RangeField label="مبلغ رهن (تومان)" minValue={filters.minDepositAmount} maxValue={filters.maxDepositAmount} onMinChange={(value) => setFilter("minDepositAmount", value)} onMaxChange={(value) => setFilter("maxDepositAmount", value)} />
          <RangeField label="اجاره ماهانه (تومان)" minValue={filters.minRentAmount} maxValue={filters.maxRentAmount} onMinChange={(value) => setFilter("minRentAmount", value)} onMaxChange={(value) => setFilter("maxRentAmount", value)} />
        </>}
        {!filters.transactionType && <p className="text-xs text-slate-500">برای فیلتر قیمت ابتدا نوع معامله را انتخاب کنید.</p>}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800">موقعیت عمومی</h3>
        <label className="block space-y-1.5 text-sm"><span className="font-semibold text-slate-700">شهر / روستا</span><input className={inputClass} value={filters.city} onChange={(event) => setFilter("city", event.target.value)} placeholder="شهر یا روستا" /></label>
        <label className="block space-y-1.5 text-sm"><span className="font-semibold text-slate-700">محله / منطقه</span><input className={inputClass} value={filters.district} onChange={(event) => setFilter("district", event.target.value)} placeholder="محله یا منطقه" /></label>
        <p className="text-xs leading-6 text-slate-500">نشانی دقیق، کد پستی و مختصات دقیق خصوصی هستند و در جستجوی عمومی فیلتر نمی‌شوند.</p>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800">مشخصات فیزیکی</h3>
        <RangeField label="متراژ (مترمربع)" minValue={filters.minArea} maxValue={filters.maxArea} onMinChange={(value) => setFilter("minArea", value)} onMaxChange={(value) => setFilter("maxArea", value)} />
        {filters.propertyType !== "زمین" && filters.propertyType !== "باغ" && <RangeField label="تعداد اتاق" minValue={filters.minRooms} maxValue={filters.maxRooms} onMinChange={(value) => setFilter("minRooms", value)} onMaxChange={(value) => setFilter("maxRooms", value)} />}
        <RangeField label="سال ساخت" minValue={filters.minYearBuilt} maxValue={filters.maxYearBuilt} onMinChange={(value) => setFilter("minYearBuilt", value)} onMaxChange={(value) => setFilter("maxYearBuilt", value)} />
        {filters.propertyType !== "زمین" && filters.propertyType !== "باغ" && <>
          <RangeField label="طبقه" min={-10} minValue={filters.minFloor} maxValue={filters.maxFloor} onMinChange={(value) => setFilter("minFloor", value)} onMaxChange={(value) => setFilter("maxFloor", value)} />
          <RangeField label="تعداد کل واحدها" minValue={filters.minTotalUnits} maxValue={filters.maxTotalUnits} onMinChange={(value) => setFilter("minTotalUnits", value)} onMaxChange={(value) => setFilter("maxTotalUnits", value)} />
        </>}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800">اطلاعات حقوقی</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField label="نوع سند" value={filters.documentType} onChange={(value) => setFilter("documentType", value)} options={[
            { value: "SINGLE_SHEET", label: "تک‌برگ" }, { value: "OLD_DEED", label: "سند دفترچه‌ای" }, { value: "OFFICIAL_CONTRACT", label: "قرارداد رسمی" }, { value: "ORDINARY_CONTRACT", label: "قولنامه عادی" },
          ]} />
          <SelectField label="نوع مالکیت" value={filters.ownershipType} onChange={(value) => setFilter("ownershipType", value)} options={[
            { value: "SIX_DANG", label: "شش‌دانگ" }, { value: "SHARED", label: "مشاع" },
          ]} />
          <SelectField label="وضعیت عرصه" value={filters.landTenure} onChange={(value) => setFilter("landTenure", value)} options={[
            { value: "FREEHOLD", label: "ملکی" }, { value: "ENDOWMENT", label: "اوقافی" },
          ]} />
          <SelectField label="وضعیت سکونت" value={filters.occupancyStatus} onChange={(value) => setFilter("occupancyStatus", value)} options={[
            { value: "VACANT", label: "خالی" }, { value: "OWNER_OCCUPIED", label: "مالک ساکن است" }, { value: "TENANT_OCCUPIED", label: "مستأجر دارد" },
          ]} />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800">پارکینگ و امکانات</h3>
        <RangeField label="تعداد پارکینگ" minValue={filters.minParkingCount} maxValue={filters.maxParkingCount} onMinChange={(value) => setFilter("minParkingCount", value)} onMaxChange={(value) => setFilter("maxParkingCount", value)} />
        <label className="block space-y-1.5 text-sm"><span className="font-semibold text-slate-700">نوع پارکینگ</span><input className={inputClass} value={filters.parkingType} onChange={(event) => setFilter("parkingType", event.target.value)} /></label>
        {filters.propertyType !== "زمین" && filters.propertyType !== "باغ" && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField label="آسانسور" value={filters.hasElevator} onChange={(value) => setFilter("hasElevator", value)} options={[{ value: "true", label: "دارد" }, { value: "false", label: "ندارد" }]} />
          <SelectField label="انباری" value={filters.hasStorage} onChange={(value) => setFilter("hasStorage", value)} options={[{ value: "true", label: "دارد" }, { value: "false", label: "ندارد" }]} />
          <SelectField label="بالکن" value={filters.hasBalcony} onChange={(value) => setFilter("hasBalcony", value)} options={[{ value: "true", label: "دارد" }, { value: "false", label: "ندارد" }]} />
          <SelectField label="حیاط" value={filters.hasYard} onChange={(value) => setFilter("hasYard", value)} options={[{ value: "true", label: "دارد" }, { value: "false", label: "ندارد" }]} />
        </div>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm"><span className="font-semibold text-slate-700">سیستم گرمایش</span><input className={inputClass} value={filters.heatingSystem} onChange={(event) => setFilter("heatingSystem", event.target.value)} /></label>
          <label className="block space-y-1.5 text-sm"><span className="font-semibold text-slate-700">سیستم سرمایش</span><input className={inputClass} value={filters.coolingSystem} onChange={(event) => setFilter("coolingSystem", event.target.value)} /></label>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800">وضعیت بازسازی</h3>
        <SelectField label="وضعیت بازسازی" value={filters.renovationStatus} onChange={(value) => setFilter("renovationStatus", value)} options={[
          { value: "NO_RENOVATION", label: "بدون بازسازی" }, { value: "PARTIAL", label: "بازسازی جزئی" }, { value: "FULL", label: "بازسازی کامل" },
        ]} />
        <RangeField label="سال بازسازی" minValue={filters.minRenovationYear} maxValue={filters.maxRenovationYear} onMinChange={(value) => setFilter("minRenovationYear", value)} onMaxChange={(value) => setFilter("maxRenovationYear", value)} />
      </section>
    </div>

    <div className="sticky bottom-0 mt-6 flex gap-2 border-t border-slate-100 bg-white/95 pt-4 backdrop-blur">
      <button type="button" onClick={resetFilters} className="h-12 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">پاک کردن</button>
      <button type="button" onClick={handleSearch} disabled={isSearching} className="flex h-12 flex-1 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
        {isSearching ? "در حال جستجو..." : "نمایش نتایج (" + getActiveFilterCount() + ")"}
      </button>
    </div>
  </div>;
}