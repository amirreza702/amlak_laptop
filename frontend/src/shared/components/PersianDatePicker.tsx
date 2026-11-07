"use client";

import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { formatPersianDate, formatPersianDateTime } from "@/shared/utils/date";
import {
  getPersianDateParts,
  persianMonthNames,
  toTehranIsoDay,
  usePersianDatePicker,
} from "@/shared/hooks/usePersianDatePicker";

type PersianDatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  mode?: "date" | "datetime";
  endOfDay?: boolean;
};

export function PersianDatePicker({
  value,
  onChange,
  label,
  mode = "date",
  endOfDay = false,
}: PersianDatePickerProps) {
  const {
    open,
    setOpen,
    monthYear,
    time,
    days,
    selectedParts,
    moveMonth,
    chooseDay,
    changeTime,
  } = usePersianDatePicker({ value, onChange, mode, endOfDay });

  const displayedValue = !value
    ? ""
    : mode === "datetime"
      ? formatPersianDateTime(value)
      : formatPersianDate(value);

  return (
    <div className="relative min-w-0">
      <span className="mb-1 block text-sm">{label}</span>
      <div className="flex gap-1">
        <button
          type="button"
          aria-label={label}
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-right text-sm"
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-slate-500" />
          <span className="truncate">{displayedValue || "انتخاب تاریخ شمسی"}</span>
        </button>
        {value && (
          <button type="button" aria-label={`پاک‌کردن ${label}`} onClick={() => onChange("")} className="rounded-lg border border-slate-300 px-2 text-slate-500">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-xl" dir="rtl">
          <div className="mb-3 flex items-center justify-between gap-2">
            <button type="button" aria-label="ماه بعد" onClick={() => moveMonth(1)} className="rounded-lg p-2 hover:bg-slate-100"><ChevronRight className="h-4 w-4" /></button>
            <strong className="text-sm">{persianMonthNames[monthYear.month - 1]} {new Intl.NumberFormat("fa-IR").format(monthYear.year)}</strong>
            <button type="button" aria-label="ماه قبل" onClick={() => moveMonth(-1)} className="rounded-lg p-2 hover:bg-slate-100"><ChevronLeft className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500">
            {["ش", "ی", "د", "س", "چ", "پ", "ج"].map((day) => <span key={day} className="py-1">{day}</span>)}
            {days.map((date) => {
              const parts = getPersianDateParts(date);
              const inMonth = parts.year === monthYear.year && parts.month === monthYear.month;
              const selected = selectedParts?.year === parts.year && selectedParts.month === parts.month && selectedParts.day === parts.day;
              return (
                <button
                  key={toTehranIsoDay(date)}
                  type="button"
                  disabled={!inMonth}
                  onClick={() => chooseDay(date)}
                  className={`rounded-lg py-2 text-sm ${selected ? "bg-[#043873] text-white" : inMonth ? "text-slate-800 hover:bg-blue-50" : "text-slate-300"}`}
                >
                  {new Intl.NumberFormat("fa-IR").format(parts.day)}
                </button>
              );
            })}
          </div>
          {mode === "datetime" && (
            <label className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-sm">
              ساعت تهران
              <input type="time" value={time} onChange={(event) => changeTime(event.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5" />
            </label>
          )}
          <button type="button" onClick={() => setOpen(false)} className="mt-3 w-full rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold">بستن</button>
        </div>
      )}
    </div>
  );
}
