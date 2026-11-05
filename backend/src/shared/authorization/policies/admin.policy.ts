import type { AuthorizationPolicy } from "../authorization.types";

interface AdminAuthorizationData {
  isActive?: boolean;
  isSuperAdmin?: boolean;
  permissions?: string[];
}

/** Staff permissions are decided centrally from trusted account data. */
export const adminPolicy: AuthorizationPolicy = (action, context) => {
  const data = context.resource?.data as AdminAuthorizationData | undefined;
  if (context.actor.role !== "HASHTI" || !data || data.isActive !== true) return false;
  if (data.isSuperAdmin === true) return true;
  if (action === "EXPIRE_LISTING") return true;
  if (action !== "PERMISSION") return false;
  const permission = context.metadata?.permission;
  return typeof permission === "string" &&
    Array.isArray(data.permissions) &&
    data.permissions.includes(permission);
};
