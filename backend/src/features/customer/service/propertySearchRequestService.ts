/**
 * ============================================================
 * Property Search Request Service
 * ============================================================
 *
 * منطق Business مربوط به درخواست جستجوی مشتری
 * در این Service قرار دارد.
 *
 * جریان:
 *
 * Customer
 *    ↓
 * Search Request Service
 *    ↓
 * Repository
 *    ↓
 * Database
 *
 * ============================================================
 */

import {
  findCustomerById,
} from "../repository/customerRepository";

import {
  createPropertySearchRequest,
  findPropertySearchRequestById,
  findPropertySearchRequestsByCustomerId,
   updatePropertySearchRequestStatus,
   updatePropertySearchRequest,
   findActivePropertySearchRequests,
   findActivePropertySearchRequestById,
} from "../repository/propertySearchRequestRepository";




/**
 * بررسی وجود Customer
 *
 * این تابع فقط وجود Customer را بررسی می‌کند.
 * کنترل دسترسی، مالکیت درخواست و سایر قواعد
 * در Service مربوط به همان عملیات انجام می‌شود.
 */
const validateCustomer = async (
  customerId: string
) => {
  const customer =
    await findCustomerById(customerId);

  if (!customer) {
    throw new Error("Customer not found");
  }

  return customer;
};
/**
 * ایجاد درخواست جستجوی ملک
 */
export const createCustomerSearchRequest = async (
  customerId: string,
  data: {
    transactionType:
      | "SALE"
      | "FULL_DEPOSIT"
      | "RENT";

    propertyType:
      | "APARTMENT"
      | "HOUSE"
      | "VILLA"
      | "LAND"
      | "SHOP"
      | "OFFICE"
      | "GARDEN";

    city: string;

    budget?: number;

    description?: string;
  }
) => {
  /**
   * ابتدا بررسی می‌کنیم مشتری وجود دارد.
   */
  const customer =
    await findCustomerById(customerId);

  if (!customer) {
    throw new Error("Customer not found");
  }

  /**
   * شهر باید مقدار داشته باشد.
   */
  if (!data.city.trim()) {
    throw new Error("City is required");
  }

  /**
   * بودجه اگر ارسال شده باشد،
   * نباید منفی باشد.
   */
  if (
    data.budget !== undefined &&
    data.budget < 0
  ) {
    throw new Error(
      "Budget cannot be negative"
    );
  }

  /**
   * ایجاد درخواست
   */
  return createPropertySearchRequest({
    customerId,

    transactionType: data.transactionType,

    propertyType: data.propertyType,

    city: data.city.trim(),

    budget: data.budget,

    description:
      data.description?.trim() || null,
  });
};

/**
 * دریافت یک درخواست جستجو
 */
export const getCustomerSearchRequest =
  async (
    customerId: string,
    requestId: string
  ) => {
    const customer =
      await findCustomerById(customerId);

    if (!customer) {
      throw new Error(
        "Customer not found"
      );
    }

    const request =
      await findPropertySearchRequestById(
        requestId
      );

    if (!request) {
      throw new Error(
        "Search request not found"
      );
    }

    /**
     * جلوگیری از دسترسی مشتری به
     * درخواست مشتری دیگر
     */
    if (
      request.customerId !== customerId
    ) {
      throw new Error(
        "Search request does not belong to customer"
      );
    }

    return request;
  };

/**
 * دریافت تمام درخواست‌های یک مشتری
 */
export const getCustomerSearchRequests =
  async (
    customerId: string
  ) => {
    const customer =
      await findCustomerById(customerId);

    if (!customer) {
      throw new Error(
        "Customer not found"
      );
    }

    return findPropertySearchRequestsByCustomerId(
      customerId
    );
  };

  /**
 * بستن درخواست جستجوی مشتری
 */
export const closeCustomerSearchRequest = async (
  customerId: string,
  requestId: string
) => {
  /**
   * ابتدا مشتری باید وجود داشته باشد.
   */
  const customer =
    await findCustomerById(customerId);

  if (!customer) {
    throw new Error(
      "Customer not found"
    );
  }

  /**
   * درخواست باید وجود داشته باشد.
   */
  const request =
    await findPropertySearchRequestById(
      requestId
    );

  if (!request) {
    throw new Error(
      "Search request not found"
    );
  }

  /**
   * مشتری فقط می‌تواند درخواست خودش
   * را تغییر دهد.
   */
  if (
    request.customerId !== customerId
  ) {
    throw new Error(
      "Search request does not belong to customer"
    );
  }

  /**
   * فقط درخواست ACTIVE قابل بستن است.
   */
  if (request.status !== "ACTIVE") {
    throw new Error(
      "Only active search requests can be closed"
    );
  }

  /**
   * تغییر وضعیت به CLOSED
   */
  return updatePropertySearchRequestStatus(
    requestId,
    "CLOSED"
  );
};

/**
 * ویرایش درخواست جستجوی مشتری
 */
export const updateCustomerSearchRequest = async (
  customerId: string,
  requestId: string,
  data: {
    transactionType?: 
      | "SALE"
      | "FULL_DEPOSIT"
      | "RENT";

    propertyType?:
      | "APARTMENT"
      | "HOUSE"
      | "VILLA"
      | "LAND"
      | "SHOP"
      | "OFFICE"
      | "GARDEN";

    city?: string;

    budget?: number | null;

    description?: string | null;
  }
) => {
  /**
   * مشتری باید وجود داشته باشد.
   */
  const customer =
    await findCustomerById(customerId);

  if (!customer) {
    throw new Error(
      "Customer not found"
    );
  }

  /**
   * درخواست باید وجود داشته باشد.
   */
  const request =
    await findPropertySearchRequestById(
      requestId
    );

  if (!request) {
    throw new Error(
      "Search request not found"
    );
  }

  /**
   * مشتری فقط درخواست خودش را
   * می‌تواند ویرایش کند.
   */
  if (
    request.customerId !== customerId
  ) {
    throw new Error(
      "Search request does not belong to customer"
    );
  }

  /**
   * فقط درخواست ACTIVE قابل ویرایش است.
   */
  if (request.status !== "ACTIVE") {
    throw new Error(
      "Only active search requests can be updated"
    );
  }

  /**
   * اگر city ارسال شده باشد،
   * نباید خالی باشد.
   */
  if (
    data.city !== undefined &&
    !data.city.trim()
  ) {
    throw new Error(
      "City is required"
    );
  }

  /**
   * بودجه نباید منفی باشد.
   */
  if (
    data.budget !== undefined &&
    data.budget !== null &&
    data.budget < 0
  ) {
    throw new Error(
      "Budget cannot be negative"
    );
  }

  return updatePropertySearchRequest(
    requestId,
    {
      ...data,

      city:
        data.city !== undefined
          ? data.city.trim()
          : undefined,

      description:
        data.description !== undefined
          ? data.description?.trim() || null
          : undefined,
    }
  );
};

/**
 * دریافت درخواست‌های فعال جستجوی ملک
 *
 * این اطلاعات برای Agent قابل مشاهده است.
 *
 * اطلاعات تماس مشتری در این مرحله برگردانده نمی‌شود.
 */
export const getActivePropertySearchRequests =
  async (filters: {
    city?: string; transactionType?: string; propertyType?: string;
    minBudget?: string; maxBudget?: string; hashtiVerified?: string;
    createdFrom?: string; createdTo?: string;
  } = {}) => {
    const transactionTypes = ["SALE", "FULL_DEPOSIT", "RENT"];
    const propertyTypes = ["APARTMENT", "HOUSE", "VILLA", "LAND", "SHOP", "OFFICE", "GARDEN"];
    if (filters.transactionType && !transactionTypes.includes(filters.transactionType)) throw new Error("Invalid transaction type filter");
    if (filters.propertyType && !propertyTypes.includes(filters.propertyType)) throw new Error("Invalid property type filter");
    const parseAmount = (value: string | undefined, label: string) => {
      if (value === undefined || value.trim() === "") return undefined;
      const amount = Number(value);
      if (!Number.isFinite(amount) || amount < 0) throw new Error(`Invalid ${label} filter`);
      return amount;
    };
    const minBudget = parseAmount(filters.minBudget, "minimum budget");
    const maxBudget = parseAmount(filters.maxBudget, "maximum budget");
    if (minBudget !== undefined && maxBudget !== undefined && minBudget > maxBudget) throw new Error("Minimum budget cannot exceed maximum budget");
    const parseDate = (value: string | undefined, label: string) => {
      if (!value) return undefined;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) throw new Error(`Invalid ${label} date`);
      return date;
    };
    const createdFrom = parseDate(filters.createdFrom, "start");
    const createdTo = parseDate(filters.createdTo, "end");
    if (createdFrom && createdTo && createdFrom > createdTo) throw new Error("Start date cannot exceed end date");
    let hashtiVerified: boolean | undefined;
    if (filters.hashtiVerified === "true") hashtiVerified = true;
    else if (filters.hashtiVerified === "false") hashtiVerified = false;
    else if (filters.hashtiVerified && filters.hashtiVerified !== "all") throw new Error("Invalid verification filter");
    return findActivePropertySearchRequests({ city: filters.city?.trim() || undefined, transactionType: filters.transactionType, propertyType: filters.propertyType, minBudget, maxBudget, hashtiVerified, createdFrom, createdTo });
  };

  /**
 * دریافت جزئیات یک درخواست فعال جستجوی ملک برای Agent
 *
 * این عملیات مخصوص Marketplace Agent است.
 *
 * فقط درخواست ACTIVE قابل مشاهده است.
 *
 * اطلاعات Customer در Repository انتخاب نشده،
 * بنابراین این Service نیز به customerId دسترسی ندارد.
 */
export const getActivePropertySearchRequestById =
  async (
    requestId: string
  ) => {
    const request =
      await findActivePropertySearchRequestById(
        requestId
      );

    if (!request) {
      throw new Error(
        "Active search request not found"
      );
    }

    return request;
  };

 