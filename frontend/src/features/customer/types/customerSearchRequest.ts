/** داده‌های فرم درخواست جست‌وجوی ملک؛ مستقل از مدل دیتابیس. */
export type CustomerRequestTransactionType = "SALE" | "FULL_DEPOSIT" | "RENT";

export type CustomerRequestPropertyType =
  | "APARTMENT"
  | "HOUSE"
  | "VILLA"
  | "LAND"
  | "SHOP"
  | "OFFICE"
  | "GARDEN";

export interface CustomerSearchRequestFormValues {
  transactionType: CustomerRequestTransactionType;
  propertyType: CustomerRequestPropertyType;
  city: string;
  budget: string;
  description: string;
}

export interface CreateCustomerSearchRequestInput {
  transactionType: CustomerRequestTransactionType;
  propertyType: CustomerRequestPropertyType;
  city: string;
  budget?: number;
  description?: string;
}

/** پاسخ مسیر پروفایل مشتری فعلی؛ شکل آن با پروفایل موجود Backend همخوان است. */
export interface CustomerProfileForRequest {
  id: string;
  firstName: string;
  lastName: string;
  user: {
    mobile: string;
  };
}

export interface CustomerSearchRequestResult {
  id: string;
  status: string;
  createdAt: string;
}
