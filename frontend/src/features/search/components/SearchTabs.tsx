"use client";

import {
  ChevronDown,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

import type {
  PropertySearchState,
  PropertyType,
  TransactionType,
} from "../hooks/usePropertySearch";

interface SearchTabsProps {
  filters: PropertySearchState;

  setFilter: <K extends keyof PropertySearchState>(
    key: K,
    value: PropertySearchState[K]
  ) => void;

  setQuickFilter: <K extends keyof PropertySearchState>(
    key: K,
    value: PropertySearchState[K]
  ) => void;

  activePanel: "filters" | "smart" | null;

  setActivePanel: (
    panel: "filters" | "smart" | null
  ) => void;
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

export function SearchTabs({
  filters,
  setFilter,
  setQuickFilter,
  activePanel,
  setActivePanel,
}: SearchTabsProps) {
  const handleFiltersClick = () => {
    setActivePanel(
      activePanel === "filters"
        ? null
        : "filters"
    );
  };

  const handleSmartClick = () => {
    setActivePanel(
      activePanel === "smart"
        ? null
        : "smart"
    );
  };

  return (
    <div
      className="
        mt-2 flex flex-wrap gap-2 pb-1
      "
    >
      {/* =====================================================
          نوع معامله
         ===================================================== */}
      <div className="relative shrink-0">
        <select
          value={filters.transactionType}
          onChange={(event) => {
            setQuickFilter(
              "transactionType",
              event.target.value as TransactionType | ""
            );
          }}
          aria-label="نوع معامله"
          className="
            h-10
            min-w-[120px]
            appearance-none
            rounded-lg
            border
            border-white/80
            bg-white/95
            px-4
            pl-9
            text-sm
            font-semibold
            text-slate-700
            shadow-lg
            outline-none
            backdrop-blur-xl
          "
        >
          <option value="">
            نوع معامله
          </option>

          {transactionTypes.map((type) => (
            <option
              key={type}
              value={type}
            >
              {type}
            </option>
          ))}
        </select>

        <ChevronDown
          size={16}
          className="
            pointer-events-none
            absolute
            left-3
            top-1/2
            -translate-y-1/2
            text-slate-500
          "
        />
      </div>

      {/* =====================================================
          نوع ملک
         ===================================================== */}
      <div className="relative shrink-0">
        <select
          value={filters.propertyType}
          onChange={(event) => {
            setQuickFilter(
              "propertyType",
              event.target.value as PropertyType | ""
            );
          }}
          aria-label="نوع ملک"
          className="
            h-10
            min-w-[120px]
            appearance-none
            rounded-lg
            border
            border-white/80
            bg-white/95
            px-4
            pl-9
            text-sm
            font-semibold
            text-slate-700
            shadow-lg
            outline-none
            backdrop-blur-xl
          "
        >
          <option value="">
            نوع ملک
          </option>

          {propertyTypes.map((type) => (
            <option
              key={type}
              value={type}
            >
              {type}
            </option>
          ))}
        </select>

        <ChevronDown
          size={16}
          className="
            pointer-events-none
            absolute
            left-3
            top-1/2
            -translate-y-1/2
            text-slate-500
          "
        />
      </div>

      {/* =====================================================
          فیلترهای پیشرفته
         ===================================================== */}
      <button
        type="button"
        onClick={handleFiltersClick}
        aria-expanded={activePanel === "filters"}
        className="
          flex
          h-10
          
          items-center
          gap-2
          rounded-lg
          border
          border-white/80
          bg-white/95
          px-4
          text-sm
          font-semibold
          text-slate-700
          shadow-lg
          backdrop-blur-xl
        "
      >
        <SlidersHorizontal size={16} />

        <span>
          فیلترها
        </span>
      </button>

      {/* =====================================================
          جستجوی هوشمند
         ===================================================== */}
      <button
        type="button"
        onClick={handleSmartClick}
        aria-expanded={activePanel === "smart"}
        className="
          flex
          h-10
          
          items-center
          gap-2
          rounded-lg
          border
          border-white/80
          bg-white/95
          px-4
          text-sm
          font-semibold
          text-slate-700
          shadow-lg
          backdrop-blur-xl
        "
      >
        <Sparkles size={16} />

        <span>
          جستجوی هوشمند
        </span>
      </button>
    </div>
  );
}