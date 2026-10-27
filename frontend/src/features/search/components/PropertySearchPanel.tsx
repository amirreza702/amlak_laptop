"use client";

import {
  ChevronDown,
  Filter,
  MapPin,
  Search,
} from "lucide-react";

import {
  PropertySearchState,
  PropertyType,
  TransactionType,
} from "../hooks/usePropertySearch";

interface PropertySearchPanelProps {
  filters: PropertySearchState;

  setFilter: <K extends keyof PropertySearchState>(
    key: K,
    value: PropertySearchState[K]
  ) => void;

  isAdvancedOpen: boolean;

  setIsAdvancedOpen: (value: boolean) => void;

  search: () => Promise<void>;

  isSearching: boolean;
}

const transactionTypes: TransactionType[] = [
  "خرید",
  "رهن",
  "اجاره",
  "رهن و اجاره",
];

const propertyTypes: PropertyType[] = [
  "آپارتمان",
  "خانه",
  "ویلا",
  "زمین",
  "مغازه",
  "اداری",
  "باغ",
];

export function PropertySearchPanel({
  filters,
  setFilter,
  isAdvancedOpen,
  setIsAdvancedOpen,
  search,
  isSearching,
}: PropertySearchPanelProps) {
  return (
    <div
      dir="rtl"
      className="
        w-full
        max-w-xl
        rounded-[2rem]
        bg-white/85
        backdrop-blur-2xl
        shadow-2xl
        border
        border-white/70
        overflow-hidden
      "
    >
      {/* --------------------------------------------------
          عنوان کوچک پنل
      -------------------------------------------------- */}
      <div className="px-6 pt-6 pb-3">
        <div className="flex items-center gap-2 text-slate-800">
          <Search size={20} />

          <span className="font-bold">
            جستجوی ملک
          </span>
        </div>

        <p className="mt-1 text-xs text-slate-500">
          ملک موردنظرت را روی نقشه شاهرود پیدا کن
        </p>
      </div>

      {/* --------------------------------------------------
          نوع معامله
      -------------------------------------------------- */}
      <div className="px-6 py-3">
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          نوع معامله
        </label>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {transactionTypes.map((type) => {
            const selected =
              filters.transactionType === type;

            return (
              <button
                key={type}
                type="button"
                onClick={() =>
                  setFilter("transactionType", type)
                }
                className={`
                  rounded-xl
                  border
                  px-3
                  py-2.5
                  text-sm
                  transition
                  ${
                    selected
                      ? "border-slate-800 bg-slate-800 text-white"
                      : "border-slate-200 bg-white/70 text-slate-700 hover:bg-slate-50"
                  }
                `}
              >
                {type}
              </button>
            );
          })}
        </div>
      </div>

      {/* --------------------------------------------------
          نوع ملک
      -------------------------------------------------- */}
      <div className="px-6 py-3">
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          نوع ملک
        </label>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {propertyTypes.map((type) => {
            const selected =
              filters.propertyType === type;

            return (
              <button
                key={type}
                type="button"
                onClick={() =>
                  setFilter("propertyType", type)
                }
                className={`
                  rounded-xl
                  border
                  px-2
                  py-2.5
                  text-xs
                  transition
                  ${
                    selected
                      ? "border-slate-800 bg-slate-800 text-white"
                      : "border-slate-200 bg-white/70 text-slate-700 hover:bg-slate-50"
                  }
                `}
              >
                {type}
              </button>
            );
          })}
        </div>
      </div>

      {/* --------------------------------------------------
          محدوده مکانی
      -------------------------------------------------- */}
      <div className="px-6 py-3">
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          محدوده
        </label>

        <div
          className="
            flex
            items-center
            gap-3
            rounded-xl
            border
            border-slate-200
            bg-white/70
            px-4
            py-3
          "
        >
          <MapPin
            size={18}
            className="shrink-0 text-slate-500"
          />

          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-800">
              {filters.city}
            </div>

            <input
              value={filters.district}
              onChange={(event) =>
                setFilter(
                  "district",
                  event.target.value
                )
              }
              placeholder="محله یا محدوده موردنظر"
              className="
                mt-0.5
                w-full
                bg-transparent
                text-xs
                text-slate-600
                outline-none
                placeholder:text-slate-400
              "
            />
          </div>

          <ChevronDown
            size={17}
            className="text-slate-400"
          />
        </div>
      </div>

      {/* --------------------------------------------------
          فیلتر پیشرفته
      -------------------------------------------------- */}
      <div className="px-6 py-3">
        <button
          type="button"
          onClick={() =>
            setIsAdvancedOpen(!isAdvancedOpen)
          }
          className="
            flex
            w-full
            items-center
            justify-between
            rounded-xl
            border
            border-slate-200
            bg-white/60
            px-4
            py-3
            text-sm
            font-semibold
            text-slate-700
            transition
            hover:bg-white
          "
        >
          <span className="flex items-center gap-2">
            <Filter size={17} />

            فیلترهای پیشرفته
          </span>

          <ChevronDown
            size={17}
            className={`
              transition-transform
              ${isAdvancedOpen ? "rotate-180" : ""}
            `}
          />
        </button>
      </div>

      {/* --------------------------------------------------
          فیلترهای پیشرفته
          فعلاً کامپوننت جدا را در مرحله بعد قرار می‌دهیم.
      -------------------------------------------------- */}
      {isAdvancedOpen && (
        <div className="border-t border-slate-200/70">
          <div className="px-6 py-5 text-sm text-slate-600">
            فیلترهای پیشرفته در حال آماده‌سازی...
          </div>
        </div>
      )}

      {/* --------------------------------------------------
          دکمه جستجو
      -------------------------------------------------- */}
      <div className="p-6 pt-3">
        <button
          type="button"
          onClick={search}
          disabled={isSearching}
          className="
            flex
            w-full
            items-center
            justify-center
            gap-2
            rounded-2xl
            bg-slate-900
            px-5
            py-4
            font-bold
            text-white
            shadow-lg
            transition
            hover:bg-slate-800
            disabled:cursor-wait
            disabled:opacity-60
          "
        >
          <Search size={19} />

          {isSearching
            ? "در حال جستجو..."
            : "نمایش املاک"}
        </button>
      </div>
    </div>
  );
}