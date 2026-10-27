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

  const customer = searchRequest.customerId
    ? await findCustomerById(searchRequest.customerId)
    : null;
  if (searchRequest.customerId && !customer) throw new Error("Customer not found");

  // شماره تماس ثبت‌کننده در زمان ایجاد از نشست معتبر سرور ذخیره شده است.
  // در درخواست مشاور، این شماره متعلق به مشاور ثبت‌کننده است.
  const contact = {
    id: customer?.id ?? searchRequest.createdByUserId ?? "unknown",
    firstName: customer?.firstName ?? (searchRequest.createdByRole === "AGENT" ? "مشاور املاک" : "مشتری"),
    lastName: customer?.lastName ?? "",
    // برای درخواست‌های قدیمی که پیش از افزودن metadata ثبت شده‌اند، شماره مشتری از رابطه قبلی خوانده می‌شود.
    mobile: searchRequest.requesterMobile ?? customer?.user.mobile ?? "",
  };

  const existingAccess = await findContactAccessLog(agentId, searchRequestId);
  if (existingAccess) return { access: existingAccess, customer: contact };

  const access = await prisma.$transaction(async (tx) => {
    const existing = await findContactAccessLog(agentId, searchRequestId, tx);
    if (existing) return existing;
    return createContactAccessLog(agentId, customer?.id ?? null, searchRequestId, tx);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  return { access, customer: contact };
};
