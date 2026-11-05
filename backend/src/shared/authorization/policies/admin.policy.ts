import type { AuthorizationPolicy } from "../authorization.types";

interface AdminAuthorizationData {
  isActive?: boolean;
  isSuperAdmin?: boolean;
  permissions?: string[];
}

/**
 * مجوز کارکنان هشتی از داده تازه و قابل اعتماد حساب خوانده می‌شود.
 * Super Admin تمام عملیات هشتی را دارد؛ سایر کارکنان فقط مجوز صریح همان
 * عملیات را دارند. هیچ عملیاتی صرفاً به دلیل داشتن نقش HASHTI مجاز نیست.
 */
export const adminPolicy: AuthorizationPolicy = (action, context) => {
  const data = context.resource?.data as AdminAuthorizationData | undefined;
  if (
    context.actor.role !== "HASHTI" ||
    context.actor.isActive !== true ||
    !data ||
    data.isActive !== true
  ) {
    return false;
  }

  if (data.isSuperAdmin === true) return true;
  if (!Array.isArray(data.permissions)) return false;

  // پشتیبانی از هر دو قرارداد:
  // 1) authorize("admin", "PERMISSION", { metadata: { permission } })
  // 2) authorize("admin", "<ACTION>", ...) برای عملیات مشخص مانند EXPIRE_LISTING
  const requestedPermission =
    action === "PERMISSION" ? context.metadata?.permission : action;

  return typeof requestedPermission === "string" &&
    data.permissions.includes(requestedPermission);
};
