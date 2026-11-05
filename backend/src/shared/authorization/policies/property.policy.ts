import type {
  AuthorizationContext,
  AuthorizationPolicy,
} from "../authorization.types";

interface PropertyAccessData {
  isRelatedOwner: boolean;
  isApprovedAgent: boolean;
  isAllowedAgentCreator: boolean;
}

/**
 * قوانین پایه دسترسی خصوصی به ملک.
 * دریافت اطلاعات ملک و روابط آن همچنان در Middleware/Repository فعلی است.
 */
export const propertyPolicy: AuthorizationPolicy = (
  action: string,
  context: AuthorizationContext,
): boolean => {
  if (action !== "ACCESS") return false;

  const data = context.resource?.data as PropertyAccessData | undefined;
  if (!data) return false;

  if (context.actor.role === "HASHTI") return true;
  if (context.actor.role === "OWNER") return data.isRelatedOwner;
  if (context.actor.role === "AGENT") {
    return data.isApprovedAgent || data.isAllowedAgentCreator;
  }

  return false;
};
