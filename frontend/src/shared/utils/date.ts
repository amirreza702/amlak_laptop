/**
 * قالب‌بندی یکپارچه تاریخ در فرانت‌اند هشتی.
 * تقویم هجری شمسی و منطقه زمانی تهران در تمام نمایش‌ها ثابت است؛
 * بنابراین نتیجه به منطقه زمانی دستگاه کاربر وابسته نیست.
 */
const PERSIAN_DATE_LOCALE = "fa-IR-u-ca-persian";
const TEHRAN_TIME_ZONE = "Asia/Tehran";

function asValidDate(value: string | Date | null | undefined): Date | null {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatPersianDate(value: string | Date | null | undefined): string {
  const date = asValidDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat(PERSIAN_DATE_LOCALE, {
    timeZone: TEHRAN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatPersianDateTime(value: string | Date | null | undefined): string {
  const date = asValidDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat(PERSIAN_DATE_LOCALE, {
    timeZone: TEHRAN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

/** تاریخ/زمان محلی تهران را به ISO با offset صریح تهران تبدیل می‌کند. */
export function tehranDateTimeToIso(localDateTime: string): string {
  if (!localDateTime) return "";
  const normalized = localDateTime.length === 16 ? `${localDateTime}:00` : localDateTime;
  const date = new Date(`${normalized}+03:30`);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}
