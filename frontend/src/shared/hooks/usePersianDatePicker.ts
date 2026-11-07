"use client";

import { useEffect, useMemo, useState } from "react";

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
const weekdayIndex: Record<string, number> = {
  Sat: 0, Sun: 1, Mon: 2, Tue: 3, Wed: 4, Thu: 5, Fri: 6,
};
const DAY_MS = 86_400_000;

export const persianMonthNames = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

export function getPersianDateParts(date: Date): PersianParts {
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
  for (let offset = -100; offset <= 500; offset += 1) {
    const candidate = new Date(start + offset * DAY_MS);
    const parts = getPersianDateParts(candidate);
    if (parts.year === year && parts.month === month && parts.day === day) return candidate;
  }
  return new Date(start);
}

export function toTehranIsoDay(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function getTehranTime(value: string): string {
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

type UsePersianDatePickerOptions = {
  value: string;
  onChange: (value: string) => void;
  mode: "date" | "datetime";
  endOfDay: boolean;
};

/** مدیریت وضعیت و رفتار تقویم شمسی با حفظ منطقه زمانی تهران. */
export function usePersianDatePicker({
  value,
  onChange,
  mode,
  endOfDay,
}: UsePersianDatePickerOptions) {
  const initialParts = getPersianDateParts(value ? new Date(value) : new Date());
  const [open, setOpen] = useState(false);
  const [monthYear, setMonthYear] = useState({
    year: initialParts.year,
    month: initialParts.month,
  });
  const [time, setTime] = useState(() => getTehranTime(value));

  useEffect(() => {
    if (!value) return;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return;
    const parts = getPersianDateParts(date);
    void Promise.resolve().then(() => {
      setMonthYear({ year: parts.year, month: parts.month });
      setTime(getTehranTime(value));
    });
  }, [value]);

  const days = useMemo(() => {
    const first = findGregorianDate(monthYear.year, monthYear.month, 1);
    const offset = weekdayIndex[weekdayFormatter.format(first)] ?? 0;
    const start = new Date(first.getTime() - offset * DAY_MS);
    return Array.from({ length: 42 }, (_, index) => new Date(start.getTime() + index * DAY_MS));
  }, [monthYear]);

  const selectedDate = value ? new Date(value) : null;
  const selectedParts = selectedDate && !Number.isNaN(selectedDate.getTime())
    ? getPersianDateParts(selectedDate)
    : null;

  const moveMonth = (direction: -1 | 1) => {
    const first = findGregorianDate(monthYear.year, monthYear.month, 1);
    const pivot = new Date(first.getTime() + (direction === 1 ? 35 : -1) * DAY_MS);
    const parts = getPersianDateParts(pivot);
    setMonthYear({ year: parts.year, month: parts.month });
  };

  const chooseDay = (date: Date) => {
    const day = toTehranIsoDay(date);
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
    onChange(`${toTehranIsoDay(selectedDate)}T${nextTime}:00+03:30`);
  };

  return {
    open,
    setOpen,
    monthYear,
    time,
    days,
    selectedParts,
    moveMonth,
    chooseDay,
    changeTime,
  };
}
