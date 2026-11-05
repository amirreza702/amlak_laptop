import type { AuthorizationPolicy } from "../authorization.types";

const evaluatorRoles: Record<string, string> = {
  CUSTOMER_TO_AGENT: "CUSTOMER",
  OWNER_TO_AGENT: "OWNER",
  AGENT_TO_CUSTOMER: "AGENT",
  AGENT_TO_OWNER: "AGENT",
  CUSTOMER_TO_PROPERTY: "CUSTOMER",
  CUSTOMER_TO_OWNER: "CUSTOMER",
  OWNER_TO_CUSTOMER: "OWNER",
  AGENT_TO_PROPERTY: "AGENT",
  OWNER_TO_PROPERTY: "OWNER",
  HASHTI_TO_AGENT: "HASHTI",
};

/**
 * Policy ارزیابی؛ بررسی رابطه هدف در Service و با داده Repository انجام می‌شود.
 * این Policy نقش مجاز و تکمیل‌شدن بررسی رابطه را به‌عنوان شرط نهایی اعمال می‌کند.
 */
export const evaluationPolicy: AuthorizationPolicy = (action, context) => {
  const data = context.resource?.data as {
    type?: string;
    relationshipVerified?: boolean;
  } | undefined;

  if (!data || context.actor.isActive === false) return false;
  if (action === "CREATE") {
    return evaluatorRoles[data.type ?? ""] === context.actor.role &&
      data.relationshipVerified === true;
  }
  if (action === "READ_STATUS") {
    return evaluatorRoles[data.type ?? ""] === context.actor.role;
  }
  return false;
};
