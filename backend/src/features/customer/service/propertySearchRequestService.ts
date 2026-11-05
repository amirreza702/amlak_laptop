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

import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
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
  creator: AuthorizationActor & { mobile: string; isVerifiedAgent?: boolean }
) => {
  if (!data.city.trim()) throw new Error("City is required");
  if (data.budget === undefined || data.budget === null) throw new Error("Budget is required");
  if (!Number.isFinite(data.budget) || data.budget < 0) throw new Error("Budget cannot be negative");

  return prisma.$transaction(async (tx) => {
    const currentUser = await tx.user.findUnique({
      where: { id: creator.id },
      select: { id: true, role: true, isActive: true, mobile: true },
    });
    if (!currentUser || currentUser.isActive !== true || currentUser.role !== creator.role) {
      throw new Error("Search request creation is not authorized");
    }

    const agentProfile = currentUser.role === "AGENT"
      ? await tx.agent.findUnique({ where: { userId: currentUser.id }, select: { verificationStatus: true } })
      : null;
    const isVerifiedAgent = currentUser.role === "AGENT" &&
      agentProfile?.verificationStatus === "VERIFIED";
    const freshActor = { id: currentUser.id, role: currentUser.role, isActive: currentUser.isActive };
    const creationAllowed = await authorize("searchRequest", "CREATE", {
      actor: freshActor,
      resource: { data: { isVerifiedAgent } },
    });
    if (!creationAllowed) throw new Error("Search request creation is not authorized");

    let requesterFirstName: string | null;
    let requesterLastName: string;
    let requesterMobile: string;

    if (currentUser.role === "CUSTOMER") {
      if (!customerId) throw new Error("Customer not found");
      const customer = await tx.customer.findUnique({
        where: { id: customerId },
        select: { id: true, userId: true, firstName: true, lastName: true },
      });
      if (!customer || customer.userId !== currentUser.id) throw new Error("Customer not found");
      requesterFirstName = customer.firstName.trim() || null;
      requesterLastName = customer.lastName.trim();
      requesterMobile = currentUser.mobile;
    } else {
      if (currentUser.role !== "AGENT" || customerId !== null) {
        throw new Error("Agent-created requests cannot be assigned to a customer profile");
      }
      requesterFirstName = data.requesterFirstName?.trim() || null;
      requesterLastName = data.requesterLastName?.trim() ?? "";
      requesterMobile = data.requesterMobile?.trim() ?? "";
      if (!requesterLastName) throw new Error("Customer last name is required");
      if (!requesterMobile) throw new Error("Customer mobile is required");
    }

    return createPropertySearchRequest({
      customerId,
      createdByUserId: currentUser.id,
      createdByRole: currentUser.role as UserRole,
      requesterMobile,
      requesterFirstName,
      requesterLastName,
      transactionType: data.transactionType,
      propertyType: data.propertyType,
      city: data.city.trim(),
      budget: data.budget,
      description: data.description?.trim() || null,
    }, tx);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
};

/**
 * دریافت یک درخواست جستجو
 */
export const getCustomerSearchRequest =
  async (
    customerId: string,
    requestId: string,
    actor: AuthorizationActor
  ) => {
    const authenticatedUserId = actor.id;
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
      actor,
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
    actor: AuthorizationActor
  ) => {
    const authenticatedUserId = actor.id;
    const customer =
      await findCustomerById(customerId);

    if (!customer) {
      throw new Error(
        "Customer not found"
      );
    }

    const allowed = await authorize("searchRequest", "LIST_OWN", {
      actor,
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
  actor: AuthorizationActor
) => {
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({
      where: { id: customerId },
      select: { id: true, userId: true },
    });
    const request = await findPropertySearchRequestById(requestId, tx);
    if (!customer || !request) throw new Error("SEARCH_REQUEST_FORBIDDEN");

    const allowed = await authorize("searchRequest", "CLOSE", {
      actor,
      resource: { id: request.id, status: request.status, data: {
        isOwner: customer.userId === actor.id && request.customerId === customerId,
        status: request.status,
      } },
    });
    if (!allowed || request.status !== "ACTIVE") throw new Error("SEARCH_REQUEST_FORBIDDEN");

    return updatePropertySearchRequestStatus(requestId, "CLOSED", tx);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
};

/**
 * ویرایش درخواست جستجوی مشتری
 */
export const updateCustomerSearchRequest = async (
  customerId: string,
  requestId: string,
  actor: AuthorizationActor,
  data: {
    transactionType?: "SALE" | "FULL_DEPOSIT" | "RENT" | "DEPOSIT_AND_RENT";
    propertyType?: "APARTMENT" | "HOUSE" | "VILLA" | "LAND" | "SHOP" | "OFFICE" | "GARDEN";
    city?: string;
    budget?: number | null;
    description?: string | null;
  }
) => {
  if (data.city !== undefined && !data.city.trim()) throw new Error("City is required");
  if (data.budget === null) throw new Error("Budget is required");
  if (data.budget !== undefined && (!Number.isFinite(data.budget) || data.budget < 0)) {
    throw new Error("Budget cannot be negative");
  }

  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({
      where: { id: customerId },
      select: { id: true, userId: true },
    });
    const request = await findPropertySearchRequestById(requestId, tx);
    if (!customer || !request) throw new Error("SEARCH_REQUEST_FORBIDDEN");

    const allowed = await authorize("searchRequest", "UPDATE", {
      actor,
      resource: { id: request.id, status: request.status, data: {
        isOwner: customer.userId === actor.id && request.customerId === customerId,
        status: request.status,
      } },
    });
    if (!allowed || request.status !== "ACTIVE") throw new Error("SEARCH_REQUEST_FORBIDDEN");

    return updatePropertySearchRequest(requestId, {
      ...data,
      budget: data.budget ?? undefined,
      city: data.city !== undefined ? data.city.trim() : undefined,
      description: data.description !== undefined ? data.description?.trim() || null : undefined,
    }, tx);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
};

/**
 * دریافت درخواست‌های فعال جستجوی ملک
 *
 * این اطلاعات برای Agent قابل مشاهده است.
 *
 * اطلاعات تماس مشتری در این مرحله برگردانده نمی‌شود.
 */
export const getActivePropertySearchRequests = async (
  filters: {
    city?: string; transactionType?: string; propertyType?: string;
    minBudget?: string; maxBudget?: string; hashtiVerified?: string;
    createdFrom?: string; createdTo?: string;
  },
  actor: AuthorizationActor
) => {
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

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: actor.id },
      select: { id: true, role: true, isActive: true },
    });
    const agent = user?.role === "AGENT"
      ? await tx.agent.findUnique({ where: { userId: actor.id }, select: { verificationStatus: true } })
      : null;
    const freshActor = user ? { id: user.id, role: user.role, isActive: user.isActive } : actor;
    const isVerifiedAgent = user?.isActive === true && user.role === "AGENT" && agent?.verificationStatus === "VERIFIED";
    const allowed = user?.isActive === true && await authorize("searchRequest", "MARKETPLACE_LIST", {
      actor: freshActor,
      resource: { status: "ACTIVE", data: { status: "ACTIVE", isVerifiedAgent } },
    });
    if (!allowed) throw new Error("Search request marketplace access denied");
    return findActivePropertySearchRequests({
      city: filters.city?.trim() || undefined,
      transactionType: filters.transactionType,
      propertyType: filters.propertyType,
      minBudget, maxBudget, hashtiVerified, createdFrom, createdTo,
    }, tx);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
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
export const getActivePropertySearchRequestById = async (
  requestId: string,
  actor: AuthorizationActor
) => {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: actor.id },
      select: { id: true, role: true, isActive: true },
    });
    const agent = user?.role === "AGENT"
      ? await tx.agent.findUnique({ where: { userId: actor.id }, select: { verificationStatus: true } })
      : null;
    const request = await findActivePropertySearchRequestById(requestId, tx);
    if (!request) throw new Error("Active search request not found");

    const isVerifiedAgent = user?.isActive === true && user.role === "AGENT" && agent?.verificationStatus === "VERIFIED";
    const allowed = user?.isActive === true && await authorize("searchRequest", "MARKETPLACE_READ", {
      actor: user ? { id: user.id, role: user.role, isActive: user.isActive } : actor,
      resource: { id: requestId, status: request.status, data: { status: request.status, isVerifiedAgent } },
    });
    if (!allowed) throw new Error("Search request marketplace access denied");
    return request;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
};
