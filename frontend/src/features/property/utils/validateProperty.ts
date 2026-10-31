import type {
  PropertyFormData,
  PropertyFormErrors,
} from "../types/property";

export function validateProperty(
  data: PropertyFormData
): PropertyFormErrors {
  const errors: PropertyFormErrors = {};

  if (data.postalCode && !/^\d{10}$/.test(data.postalCode)) {
    errors.postalCode =
      "کد پستی باید ۱۰ رقم باشد.";
  }

  if (!data.area || Number(data.area) <= 0) {
    errors.area =
      "متراژ باید بیشتر از صفر باشد.";
  }

  if (data.rooms && (!Number.isInteger(Number(data.rooms)) || Number(data.rooms) < 0)) {
    errors.rooms =
      "تعداد اتاق نامعتبر است.";
  }

  if (data.floor && !Number.isInteger(Number(data.floor))) {
    errors.floor =
      "طبقه نامعتبر است.";
  }

  return errors;
}