import type { AuthorizationPolicy } from "../authorization.types";

interface PrivateNoteAuthorizationData {
  isOwnAgentNote?: boolean;
  isSuperAdmin?: boolean;
  isActive?: boolean;
}

/** Private notes are scoped to their agent; cross-agent access is super-admin only. */
export const privateNotePolicy: AuthorizationPolicy = (action, context) => {
  const data = context.resource?.data as PrivateNoteAuthorizationData | undefined;
  if (!data || context.actor.isActive === false || data.isActive === false) return false;

  if (context.actor.role === "AGENT") {
    return data.isOwnAgentNote === true &&
      ["LIST_OWN", "UPSERT_OWN", "DELETE_OWN"].includes(action);
  }

  if (context.actor.role === "HASHTI") {
    return data.isSuperAdmin === true &&
      ["LIST_ALL", "UPSERT_ANY", "DELETE_ANY"].includes(action);
  }

  return false;
};
