/**
 * Service دریافت پروفایل مشتری نشست فعلی.
 * شناسه پروفایل از شناسه User احراز‌شده نگاشت می‌شود؛ ورودی Client مبنای هویت نیست.
 */
import { findCustomerProfileByUserId } from "../repository/currentCustomerProfileRepository";

export async function getCurrentCustomerProfile(userId: string) {
  const customer = await findCustomerProfileByUserId(userId);

  if (!customer) {
    throw new Error("Customer not found");
  }

  return customer;
}
