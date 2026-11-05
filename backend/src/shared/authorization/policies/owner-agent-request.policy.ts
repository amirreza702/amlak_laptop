import type { AuthorizationContext, AuthorizationPolicy } from "../authorization.types";

interface OwnerAgentRequestPolicyData {
  isOwner?: boolean;
  isAgent?: boolean;
  isVerifiedAgent?: boolean;
  status?: string;
  isPropertyActive?: boolean;
  isPropertyDeleted?: boolean;
  isPropertyExpired?: boolean;
}

/**
 * مجوزهای چرخه همکاری مالک و مشاور.
 * هویت و رابطه درخواست توسط Service از داده آماده‌شده Repository تعیین می‌شود؛
 * این Policy مستقل از Prisma و Express است.
 */
export const ownerAgentRequestPolicy: AuthorizationPolicy = (
  action: string,
  context: AuthorizationContext,
): boolean => {
  const data = context.resource?.data as OwnerAgentRequestPolicyData | undefined;
  if (!data || context.actor.isActive === false) return false;

  if (action === "LIST_OWNER") {
    return context.actor.role === "OWNER" && data.isOwner === true;
  }

  if (action === "CLOSE") {
    return context.actor.role === "OWNER" &&
      data.isOwner === true &&
      data.status === "ACTIVE";
  }

  if (action === "LIST_AGENT" || action === "RESPOND") {
    return context.actor.role === "AGENT" &&
      data.isAgent === true &&
      data.isVerifiedAgent === true &&
      data.status === "ACTIVE" &&
      data.isPropertyActive === true &&
      data.isPropertyDeleted !== true &&
      data.isPropertyExpired !== true;
  }

  return false;
};
