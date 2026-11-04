import type { Coordinates, TransactionType } from "../types/propertyRegistration";

interface PropertyRegistrationValidationInput {
  city: string;
  district: string;
  address: string;
  coordinates: Coordinates | null;
  area: string;
  rooms: string;
  floor: string;
  details: {
    totalUnits: string;
    parkingCount: string;
    yearBuilt: string;
    renovationYear: string;
    documentType: string;
    ownershipType: string;
    landTenure: string;
  };
  transactionType: TransactionType;
  salePrice: string;
  depositAmount: string;
  rentAmount: string;
}

/** اعتبارسنجی مستقل فیلدهای الزامی و داده‌های عددی ثبت ملک و معامله. */
export function validatePropertyRegistration(input: PropertyRegistrationValidationInput): string | null {
  if (!input.city.trim()) return "وارد کردن شهر الزامی است.";
  if (!input.address.trim()) return "وارد کردن نشانی ملک الزامی است.";

  if (!input.coordinates ||
      !Number.isFinite(input.coordinates.latitude) || input.coordinates.latitude < -90 || input.coordinates.latitude > 90 ||
      !Number.isFinite(input.coordinates.longitude) || input.coordinates.longitude < -180 || input.coordinates.longitude > 180) {
    return "برای ثبت ملک، محل دقیق آن را روی نقشه انتخاب کنید.";
  }

  const area = Number(input.area);
  if (!input.area.trim() || !Number.isFinite(area) || area <= 0) return "متراژ باید بیشتر از صفر باشد.";
  if (input.rooms.trim() && (!Number.isInteger(Number(input.rooms)) || Number(input.rooms) < 0)) return "تعداد اتاق باید عدد صحیح نامنفی باشد.";
  if (input.floor.trim() && !Number.isInteger(Number(input.floor))) return "طبقه باید عدد صحیح باشد.";
  if (input.details.totalUnits.trim() && (!Number.isInteger(Number(input.details.totalUnits)) || Number(input.details.totalUnits) < 1)) return "تعداد کل واحدها باید حداقل یک باشد.";
  if (!input.details.documentType) return "انتخاب نوع سند الزامی است.";
  if (!input.details.ownershipType) return "انتخاب نوع مالکیت الزامی است.";
  if (!input.details.landTenure) return "انتخاب وضعیت عرصه الزامی است.";

  for (const [label, value] of [["سال ساخت", input.details.yearBuilt], ["سال بازسازی", input.details.renovationYear]] as const) {
    if (value.trim() && (!Number.isInteger(Number(value)) || Number(value) < 1300 || Number(value) > 1500)) {
      return `${label} باید بین ۱۳۰۰ تا ۱۵۰۰ باشد.`;
    }
  }
  if (input.details.parkingCount.trim() && (!Number.isInteger(Number(input.details.parkingCount)) || Number(input.details.parkingCount) < 0)) {
    return "تعداد پارکینگ باید عدد صحیح نامنفی باشد.";
  }

  if (input.transactionType === "SALE" && !(Number(input.salePrice) > 0)) return "قیمت فروش باید بیشتر از صفر باشد.";
  if (input.transactionType === "FULL_DEPOSIT" && !(Number(input.depositAmount) > 0)) return "مبلغ رهن کامل باید بیشتر از صفر باشد.";
  if (input.transactionType === "RENT" && !(Number(input.rentAmount) > 0)) return "مبلغ اجاره باید بیشتر از صفر باشد.";
  if (input.transactionType === "DEPOSIT_AND_RENT" && (!(Number(input.depositAmount) > 0) || !(Number(input.rentAmount) > 0))) return "برای رهن و اجاره، هر دو مبلغ رهن و اجاره ماهانه باید بیشتر از صفر باشند.";
  return null;
}
