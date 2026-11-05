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
import { authorize } from "../../../shared/authorization/authorization.core";
import type { AuthorizationActor } from "../../../shared/authorization/authorization.types";
import { findAgentProfileByUserId } from "../../agent/repository/agentRepository";

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
  customerId: string | null,
  data: {
    transactionType: "SALE" | "FULL_DEPOSIT" | "RENT" | "DEPOSIT_AND_RENT";
    propertyType: "APARTMENT" | "HOUSE" | "VILLA" | "LAND" | "SHOP" | "OFFICE" | "GARDEN";
    city: string;
    budget: number;
    description?: string;
    requesterFirstName?: string;
    requesterLastName?: string;
    requesterMobile?: string;
  },
  creator: { id: string; role: "CUSTOMER" | "AGENT"; mobile: string; isVerifiedAgent?: boolean }
) => {
  const creationAllowed = await authorize("searchRequest", "CREATE", {
    actor: { id: creator.id, role: creator.role },
    resource: { data: { isVerifiedAgent: creator.isVerifiedAgent === true } },
  });
  if (!creationAllowed) throw new Error("Search request creation is not authorized");

  let requesterFirstName: string | null;
  let requesterLastName: string;
  let requesterMobile: string;

  // اطلاعات مشتری دارای حساب از پروفایل متصل به نشست معتبر خوانده می‌شود.
  if (creator.role === "CUSTOMER") {
    if (!customerId) throw new Error("Customer not found");
    const customer = await findCustomerById(customerId);
    if (!customer || customer.userId !== creator.id) throw new Error("Customer not found");
    requesterFirstName = customer.firstName.trim() || null;
    requesterLastName = customer.lastName.trim();
    requesterMobile = creator.mobile;
  } else {
    if (customerId !== null) throw new Error("Agent-created requests cannot be assigned to a customer profile");
    requesterFirstName = data.requesterFirstName?.trim() || null;
    requesterLastName = data.requesterLastName?.trim() ?? "";
    requesterMobile = data.requesterMobile?.trim() ?? "";
    if (!requesterLastName) throw new Error("Customer last name is required");
    if (!requesterMobile) throw new Error("Customer mobile is required");
  }

  if (!data.city.trim()) throw new Error("City is required");
  if (data.budget === undefined || data.budget === null) throw new Error("Budget is required");
  if (!Number.isFinite(data.budget) || data.budget < 0) throw new Error("Budget cannot be negative");

  return createPropertySearchRequest({
    customerId,
    createdByUserId: creator.id,
    createdByRole: creator.role,
    requesterMobile,
    requesterFirstName,
    requesterLastName,
    transactionType: data.transactionType,
    propertyType: data.propertyType,
    city: data.city.trim(),
    budget: data.budget,
    description: data.description?.trim() || null,
  });
};

/**
 * دریافت یک درخواست جستجو
 */
export const getCustomerSearchRequest =
  async (
    customerId: string,
    requestId: string,
    authenticatedUserId: string
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
    const allowed = await authorize("searchRequest", "READ", {
      actor: { id: authenticatedUserId, role: "CUSTOMER" },
      resource: { id: request.id, status: request.status, data: {
        isOwner: customer.userId === authenticatedUserId && request.customerId === customerId,
        status: request.status,
      } },
    });
    if (!allowed) throw new Error("SEARCH_REQUEST_FORBIDDEN");

    return request;
  };

/**
 * دریافت تمام درخواست‌های یک مشتری
 */
export const getCustomerSearchRequests =
  async (
    customerId: string,
    authenticatedUserId: string
  ) => {
    const customer =
      await findCustomerById(customerId);

    if (!customer) {
      throw new Error(
        "Customer not found"
      );
    }

    const allowed = await authorize("searchRequest", "LIST_OWN", {
      actor: { id: authenticatedUserId, role: "CUSTOMER" },
      resource: { data: { isOwner: customer.userId === authenticatedUserId } },
    });
    if (!allowed) throw new Error("SEARCH_REQUEST_FORBIDDEN");
    return findPropertySearchRequestsByCustomerId(customerId);
  };

  /**
 * بستن درخواست جستجوی مشتری
 */
export const closeCustomerSearchRequest = async (
  customerId: string,
  requestId: string,
  authenticatedUserId: string
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
  const allowed = await authorize("searchRequest", "CLOSE", {
    actor: { id: authenticatedUserId, role: "CUSTOMER" },
    resource: { id: request.id, status: request.status, data: {
      isOwner: customer.userId === authenticatedUserId && request.customerId === customerId,
      status: request.status,
    } },
  });
  if (!allowed) throw new Error("SEARCH_REQUEST_FORBIDDEN");

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
  authenticatedUserId: string,
  data: {
    transactionType?: 
      | "SALE"
      | "FULL_DEPOSIT"
      | "RENT"
      | "DEPOSIT_AND_RENT";

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
  const allowed = await authorize("searchRequest", "UPDATE", {
    actor: { id: authenticatedUserId, role: "CUSTOMER" },
    resource: { id: request.id, status: request.status, data: {
      isOwner: customer.userId === authenticatedUserId && request.customerId === customerId,
      status: request.status,
    } },
  });
  if (!allowed) throw new Error("SEARCH_REQUEST_FORBIDDEN");

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
  if (data.budget === null) {
    throw new Error("Budget is required");
  }

  if (
    data.budget !== undefined &&
    (!Number.isFinite(data.budget) || data.budget < 0)
  ) {
    throw new Error("Budget cannot be negative");
  }

  return updatePropertySearchRequest(
    requestId,
    {
      ...data,
      budget: data.budget ?? undefined,

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
  } = {},
  actor: AuthorizationActor
  ) => {
    const agent = actor.role === "AGENT" ? await findAgentProfileByUserId(actor.id) : null;
    const marketplaceAllowed = await authorize("searchRequest", "MARKETPLACE_LIST", {
      actor,
      resource: { status: "ACTIVE", data: { status: "ACTIVE", isVerifiedAgent: agent?.verificationStatus === "VERIFIED" } },
    });
    if (!marketplaceAllowed) throw new Error("Search request marketplace access denied");

    const transactionTypes = ["SALE", "FULL_DEPOSIT", "RENT", "DEPOSIT_AND_RENT"];
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
    requestId: string,
    actor: AuthorizationActor
  ) => {
    const agent = actor.role === "AGENT" ? await findAgentProfileByUserId(actor.id) : null;
    const request =
      await findActivePropertySearchRequestById(
        requestId
      );

    if (!request) {
      throw new Error(
        "Active search request not found"
      );
    }
    const allowed = await authorize("searchRequest", "MARKETPLACE_READ", {
      actor,
      resource: { id: requestId, status: request.status, data: { status: request.status, isVerifiedAgent: agent?.verificationStatus === "VERIFIED" } },
    });
    if (!allowed) throw new Error("Search request marketplace access denied");

    return request;
  };

 