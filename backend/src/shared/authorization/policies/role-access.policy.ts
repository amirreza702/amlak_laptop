import type { AuthorizationPolicy } from "../authorization.types";

/** Role gates are evaluated by the same Core as resource-level permissions. */
export const roleAccessPolicy: AuthorizationPolicy = (_action, context) => {
  const allowedRoles = context.metadata?.allowedRoles;
  if (!Array.isArray(allowedRoles)) return false;
  return context.actor.isActive !== false &&
    allowedRoles.includes(context.actor.role);
};
