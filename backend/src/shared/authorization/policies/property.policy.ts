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
}

/**
 * قوانین دسترسی ملک.
 * داده و روابط لازم همچنان توسط لایه فعلی بک‌اند دریافت می‌شوند.
 */
export const propertyPolicy: AuthorizationPolicy = (
  action: string,
  context: AuthorizationContext,
): boolean => {
  const data = context.resource?.data as PropertyPolicyData | undefined;
  if (!data || data.isDeleted) return false;

  if (action === "ACCESS") {
    if (context.actor.role === "HASHTI") return true;
    if (context.actor.role === "OWNER") return Boolean(data.isRelatedOwner);
    if (context.actor.role === "AGENT") {
      return Boolean(data.isApprovedAgent || data.isAllowedAgentCreator);
    }
    return false;
  }

  if (action === "MANAGE") {
    return Boolean(
      data.isCreator ||
      (context.actor.role === "OWNER" && data.isRelatedOwner),
    );
  }

  if (action === "EDIT_OWN_REGISTRATION") {
    return context.actor.role === "AGENT" &&
      Boolean(data.isRegisteredByCurrentAgent);
  }

  return false;
};
