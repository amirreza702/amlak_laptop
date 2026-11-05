import type {
  AuthorizationContext,
  AuthorizationPolicy,
} from "../authorization.types";

interface PropertyPolicyData {
  isRelatedOwner?: boolean;
  isApprovedAgent?: boolean;
  isAllowedAgentCreator?: boolean;
  isCreator?: boolean;
  isDeleted?: boolean;
  isRegisteredByCurrentAgent?: boolean;
  isExpired?: boolean;
  isFinalApprovedAgent?: boolean;
  isAgentRegisteredProperty?: boolean;
}

/**
 * سیاست واحد دسترسی به منابع ملکی.
 * تصمیم درباره عملیات و داده‌های خصوصی فقط در این Policy انجام می‌شود.
 */
export const propertyPolicy: AuthorizationPolicy = (
  action: string,
  context: AuthorizationContext,
): boolean => {
  const data = context.resource?.data as PropertyPolicyData | undefined;
  if (!data) return false;

  const isHashti = context.actor.role === "HASHTI";
  if (data.isDeleted && !isHashti) return false;
  const isOwner = context.actor.role === "OWNER" && Boolean(data.isRelatedOwner);
  const isCreator = Boolean(data.isCreator);
  const isFinalApprovedAgent =
    context.actor.role === "AGENT" && Boolean(data.isFinalApprovedAgent);

  if (action === "ACCESS") {
    if (isHashti) return true;
    // انقضای آگهی، دسترسی عمومیِ ایجادکننده را هم می‌بندد.
    if (data.isExpired) return isOwner || isFinalApprovedAgent;
    if (context.actor.role === "OWNER") return isOwner;
    if (context.actor.role === "AGENT") {
      return isFinalApprovedAgent || Boolean(data.isAllowedAgentCreator);
    }
    return false;
  }

  if (action === "MANAGE") {
    if (isHashti) return true;
    return Boolean(
      data.isCreator ||
      (context.actor.role === "OWNER" && data.isRelatedOwner),
    );
  }

  if (action === "EDIT_OWN_REGISTRATION") {
    return context.actor.role === "AGENT" &&
      Boolean(data.isRegisteredByCurrentAgent);
  }

  if (action === "READ_PRIVATE") {
    if (isHashti) return true;
    if (data.isExpired) return isOwner || isFinalApprovedAgent;
    return isCreator || isOwner || isFinalApprovedAgent;
  }

  // اطلاعات مشاور ثبت‌کننده، مجوز مستقلی از اطلاعات خصوصی مالک دارد.
  if (action === "VIEW_REGISTRANT_DETAILS") {
    if (isHashti) return true;
    if (!data.isAgentRegisteredProperty) return false;
    if (data.isExpired) return isOwner || isFinalApprovedAgent;
    return context.actor.role === "AGENT";
  }

  // مجوز موقعیت دقیق و اطلاعات مالک مستقل از سایر مجوزهاست.
  if (action === "VIEW_EXACT_LOCATION" || action === "VIEW_OWNER_DETAILS") {
    if (isHashti) return true;
    if (data.isExpired) return isOwner || isFinalApprovedAgent;
    return isOwner || isCreator || isFinalApprovedAgent;
  }

  return false;
};
