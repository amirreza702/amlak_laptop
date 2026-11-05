/**
 * Service دریافت پروفایل مشتری نشست فعلی.
 * شناسه پروفایل از شناسه User احراز‌شده نگاشت می‌شود.
 */
import { authorize } from "../../../shared/authorization/authorization.core";
import { findCustomerProfileByUserId } from "../repository/currentCustomerProfileRepository";

export async function getCurrentCustomerProfile(userId: string) {
  const customer = await findCustomerProfileByUserId(userId);
  if (!customer) throw new Error("Customer not found");

  const allowed = await authorize("customer", "READ", {
    actor: { id: userId, role: "CUSTOMER" },
    resource: { id: customer.id, data: { isSelf: true } },
  });
  if (!allowed) throw new Error("CUSTOMER_PROFILE_FORBIDDEN");
  return customer;
}
