"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { formatPersianDate, formatPersianDateTime } from "@/shared/utils/date";

type PersianDatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  mode?: "date" | "datetime";
  endOfDay?: boolean;
};

type PersianParts = { year: number; month: number; day: number };

const persianPartsFormatter = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", {
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});
const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Tehran",
  weekday: "short",
});
const monthNames = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];
const weekdayIndex: Record<string, number> = {
  Sat: 0, Sun: 1, Mon: 2, Tue: 3, Wed: 4, Thu: 5, Fri: 6,
};
const DAY_MS = 86_400_000;

function partsOf(date: Date): PersianParts {
  const parts = persianPartsFormatter.formatToParts(date);
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

// تبدیل تاریخ شمسی به روز میلادی با جست‌وجو؛ بدون وابستگی جدید به کتابخانه.
function findGregorianDate(year: number, month: number, day: number): Date {
  const start = Date.UTC(year + 621, 0, 1, 12);
  for (let offset = -100; offset <= 400; offset += 1) {
    const candidate = new Date(start + offset * DAY_MS);
    const parts = partsOf(candidate);
    if (parts.year === year && parts.month === month && parts.day === day) return candidate;
  }
  return new Date(start);
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function tehranTime(value: string): string {
  if (!value) return "09:00";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "09:00";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tehran",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function PersianDatePicker({
  value,
  onChange,
  label,
  mode = "date",
  endOfDay = false,
}: PersianDatePickerProps) {
  const initialParts = partsOf(value ? new Date(value) : new Date());
  const [open, setOpen] = useState(false);
  const [monthYear, setMonthYear] = useState({ year: initialParts.year, month: initialParts.month });
  const [time, setTime] = useState(() => tehranTime(value));

  useEffect(() => {
    if (!value) return;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return;
    const parts = partsOf(date);
    setMonthYear({ year: parts.year, month: parts.month });
    setTime(tehranTime(value));
  }, [value]);

  const days = useMemo(() => {
    const first = findGregorianDate(monthYear.year, monthYear.month, 1);
    const offset = weekdayIndex[weekdayFormatter.format(first)] ?? 0;
    const start = new Date(first.getTime() - offset * DAY_MS);
    return Array.from({ length: 42 }, (_, index) => new Date(start.getTime() + index * DAY_MS));
  }, [monthYear]);

  const selectedDate = value ? new Date(value) : null;
  const selectedParts = selectedDate && !Number.isNaN(selectedDate.getTime()) ? partsOf(selectedDate) : null;

  const moveMonth = (direction: -1 | 1) => {
    const first = findGregorianDate(monthYear.year, monthYear.month, 1);
    const pivot = new Date(first.getTime() + (direction === 1 ? 35 : -1) * DAY_MS);
    const parts = partsOf(pivot);
    setMonthYear({ year: parts.year, month: parts.month });
  };

  const chooseDay = (date: Date) => {
    const day = isoDay(date);
    if (mode === "datetime") {
      onChange(`${day}T${time}:00+03:30`);
    } else {
      onChange(`${day}T${endOfDay ? "23:59:59.999" : "00:00:00"}+03:30`);
      setOpen(false);
    }
  };

  const changeTime = (nextTime: string) => {
    setTime(nextTime);
    if (!selectedDate || Number.isNaN(selectedDate.getTime())) return;
    onChange(`${isoDay(selectedDate)}T${nextTime}:00+03:30`);
  };

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
            <strong className="text-sm">{monthNames[monthYear.month - 1]} {new Intl.NumberFormat("fa-IR").format(monthYear.year)}</strong>
            <button type="button" aria-label="ماه قبل" onClick={() => moveMonth(-1)} className="rounded-lg p-2 hover:bg-slate-100"><ChevronLeft className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500">
            {["ش", "ی", "د", "س", "چ", "پ", "ج"].map((day) => <span key={day} className="py-1">{day}</span>)}
            {days.map((date) => {
              const parts = partsOf(date);
              const inMonth = parts.year === monthYear.year && parts.month === monthYear.month;
              const selected = selectedParts?.year === parts.year && selectedParts.month === parts.month && selectedParts.day === parts.day;
              return (
                <button
                  key={isoDay(date)}
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
