/**
 * Shared Authorization types.
 * Core and Policies remain independent from Express and Prisma.
 */
export type AuthorizationResource =
  | "property"
  | "owner"
  | "agent"
  | "customer"
  | "searchRequest"
  | "notification"
  | "ownerAgentRequest"
  | "roleAccess"
  | "admin"
  | "privateNote"
  | "evaluation";

export type AuthorizationAction = string;

export interface AuthorizationActor {
  id: string;
  role: string;
  isActive?: boolean;
}

export interface AuthorizationContext<TResource = unknown, TRelationship = unknown> {
  actor: AuthorizationActor;
  resource?: { id?: string; status?: string; data?: TResource };
  relationship?: TRelationship;
  metadata?: Record<string, unknown>;
}

export type AuthorizationPolicy = (
  action: AuthorizationAction,
  context: AuthorizationContext,
) => boolean | Promise<boolean>;
