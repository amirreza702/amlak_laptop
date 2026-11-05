/**
 * Service دریافت پروفایل مشتری نشست فعلی.
 * شناسه پروفایل از شناسه User احراز‌شده نگاشت می‌شود.
 */
import { authorize } from "../../../shared/authorization/authorization.core";
import type { AuthorizationActor } from "../../../shared/authorization/authorization.types";
import { findCustomerProfileByUserId } from "../repository/currentCustomerProfileRepository";

export async function getCurrentCustomerProfile(actor: AuthorizationActor) {
  const customer = await findCustomerProfileByUserId(actor.id);
  if (!customer) throw new Error("Customer not found");

  const allowed = await authorize("customer", "READ", {
    actor,
    resource: { id: customer.id, data: { isSelf: true } },
  });
  if (!allowed) throw new Error("CUSTOMER_PROFILE_FORBIDDEN");
  return customer;
}
