import type { AuthorizationContext, AuthorizationPolicy } from "../authorization.types";
import { selfOwnedResourcePolicy } from "./self-owned-resource.policy";

/** Role-bound profile policy; ownership must be prepared by the repository layer. */
export function createProfilePolicy(expectedRole: "OWNER" | "CUSTOMER"): AuthorizationPolicy {
  return (action: string, context: AuthorizationContext) => {
    if (context.actor.role !== expectedRole || context.actor.isActive === false) return false;
    return selfOwnedResourcePolicy(action, context);
  };
}
