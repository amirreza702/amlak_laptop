import "./policies";

/**
 * Authorization Core
 *
 * مسئول پیدا کردن Policy مناسب و دریافت تصمیم نهایی است.
 * این فایل نباید مستقیماً به دیتابیس یا Express وابسته شود.
 */

import { getAuthorizationPolicy } from "./authorization.registry";
import type {
  AuthorizationAction,
  AuthorizationContext,
  AuthorizationResource,
} from "./authorization.types";

export async function authorize(
  resource: AuthorizationResource,
  action: AuthorizationAction,
  context: AuthorizationContext,
): Promise<boolean> {
  // حساب غیرفعال اجازه عبور ندارد؛ در صورت ارائه وضعیت حساب در Context.
  if (context.actor.isActive === false) {
    return false;
  }

  const policy = getAuthorizationPolicy(resource);

  // تا زمانی که Policy یک منبع ثبت نشده، دسترسی به آن رد می‌شود.
  if (!policy) {
    return false;
  }

  return policy(action, context);
}
