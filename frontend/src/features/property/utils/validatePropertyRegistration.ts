import type { Coordinates, TransactionType } from "../types/propertyRegistration";

interface PropertyRegistrationValidationInput {
  coordinates: Coordinates | null;
  transactionType: TransactionType;
  salePrice: string;
  depositAmount: string;
  rentAmount: string;
}

/** اعتبارسنجی مستقل فیلدهای اختصاصی مسیر ثبت ملک و معامله. */
export function validatePropertyRegistration(
  input: PropertyRegistrationValidationInput,
): string | null {
  const { coordinates, transactionType, salePrice, depositAmount, rentAmount } = input;

  if (
    !coordinates ||
    !Number.isFinite(coordinates.latitude) ||
    !Number.isFinite(coordinates.longitude)
  ) {
    return "برای ثبت ملک، محل دقیق آن را روی نقشه انتخاب کنید.";
  }

  if (transactionType === "SALE" && !(Number(salePrice) > 0)) {
    return "قیمت فروش باید بیشتر از صفر باشد.";
  }

  if (transactionType === "FULL_DEPOSIT" && !(Number(depositAmount) > 0)) {
    return "مبلغ رهن کامل باید بیشتر از صفر باشد.";
  }

  if (transactionType === "RENT" && !(Number(rentAmount) > 0)) {
    return "مبلغ اجاره باید بیشتر از صفر باشد.";
  }

  return null;
}
