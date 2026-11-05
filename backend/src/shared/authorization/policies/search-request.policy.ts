import type { AuthorizationPolicy } from "../authorization.types";

interface SearchRequestAuthorizationData {
  isOwner?: boolean;
  isCreator?: boolean;
  isVerifiedAgent?: boolean;
  status?: string;
  createdByRole?: string;
}

/** Search requests distinguish customer ownership, agent authorship and marketplace visibility. */
export const searchRequestPolicy: AuthorizationPolicy = (action, context) => {
  const data = context.resource?.data as SearchRequestAuthorizationData | undefined;
  if (!data || context.actor.isActive === false) return false;

  if (action === "CREATE") {
    if (context.actor.role === "CUSTOMER") return true;
    return context.actor.role === "AGENT" && data.isVerifiedAgent === true;
  }

  if (context.actor.role === "CUSTOMER") {
    if (data.isOwner !== true) return false;
    if (["ACCESS", "READ", "LIST_OWN"].includes(action)) return true;
    if (["UPDATE", "CLOSE"].includes(action)) return data.status === "ACTIVE";
    return false;
  }

  if (context.actor.role === "AGENT") {
    if (action === "MARKETPLACE_LIST" || action === "MARKETPLACE_READ") {
      return data.isVerifiedAgent === true && data.status === "ACTIVE";
    }
    if (action === "MANAGE_OWN") {
      return data.isCreator === true &&
        data.createdByRole === "AGENT" &&
        data.isVerifiedAgent === true;
    }
    return false;
  }

  return false;
};
