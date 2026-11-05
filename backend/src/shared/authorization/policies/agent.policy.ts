import type { AuthorizationContext, AuthorizationPolicy } from "../authorization.types";
import { selfOwnedResourcePolicy } from "./self-owned-resource.policy";

interface AgentAuthorizationData {
  isVerified?: boolean;
  isActive?: boolean;
}

/** Agent profile ownership and operational verification share one resource policy. */
export const agentPolicy: AuthorizationPolicy = (
  action: string,
  context: AuthorizationContext,
): boolean | Promise<boolean> => {
  if (action === "FAVORITE") {
    const data = context.resource?.data as AgentAuthorizationData | undefined;
    return context.actor.role === "CUSTOMER" &&
      data?.isVerified === true &&
      data.isActive === true;
  }

  if (action === "OPERATE") {
    const data = context.resource?.data as AgentAuthorizationData | undefined;
    return context.actor.role === "AGENT" &&
      context.actor.isActive !== false &&
      data?.isVerified === true;
  }

  if (context.actor.role !== "AGENT") return false;
  return selfOwnedResourcePolicy(action, context);
};
