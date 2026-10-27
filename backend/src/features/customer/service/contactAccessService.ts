/**
 * Contact Access Service
 *
 * دسترسی مشاور تأییدشده به اطلاعات تماس مشتری.
 * اشتراک پولی و سهمیه ماهانه شرط دسترسی نیستند؛ همه دسترسی‌ها همچنان
 * ثبت می‌شوند و دسترسی تکراری برای یک درخواست دوباره ثبت نمی‌شود.
 */
import { prisma } from "../../../lib/prisma";
import { Prisma } from "@prisma/client";
import { findCustomerById } from "../repository/customerRepository";
import {
  createContactAccessLog,
  findContactAccessLog,
} from "../repository/contactAccessLogRepository";
import { findPropertySearchRequestById } from "../repository/propertySearchRequestRepository";

export const accessCustomerContact = async (
  agentId: string,
  searchRequestId: string
) => {
  const searchRequest = await findPropertySearchRequestById(searchRequestId);
  if (!searchRequest) throw new Error("Search request not found");
  if (searchRequest.status !== "ACTIVE") {
    throw new Error("Only active search requests can be accessed");
  }

  const customer = await findCustomerById(searchRequest.customerId);
  if (!customer) throw new Error("Customer not found");

  const existingAccess = await findContactAccessLog(agentId, searchRequestId);
  if (existingAccess) {
    return {
      access: existingAccess,
      customer: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        mobile: customer.user.mobile,
      },
    };
  }

  const access = await prisma.$transaction(async (tx) => {
    const existing = await findContactAccessLog(agentId, searchRequestId, tx);
    if (existing) return existing;
    return createContactAccessLog(agentId, customer.id, searchRequestId, tx);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  return {
    access,
    customer: {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      mobile: customer.user.mobile,
    },
  };
};
