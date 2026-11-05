/**
 * Shared Authorization types.
 *
 * این فایل فقط قرارداد مشترک Core و Policyها را تعریف می‌کند.
 * هیچ وابستگی به Express، Prisma یا Feature خاصی ندارد.
 */

export type AuthorizationResource =
  | "property"
  | "owner"
  | "agent"
  | "customer"
  | "searchRequest"
  | "notification"
  | "ownerAgentRequest";

export type AuthorizationAction = string;

export interface AuthorizationActor {
  id: string;
  role: string;
  isActive?: boolean;
}

export interface AuthorizationContext<
  TResource = unknown,
  TRelationship = unknown,
> {
  actor: AuthorizationActor;
  resource?: {
    id?: string;
    status?: string;
    data?: TResource;
  };
  relationship?: TRelationship;
  metadata?: Record<string, unknown>;
}

export type AuthorizationPolicy = (
  action: AuthorizationAction,
  context: AuthorizationContext,
) => boolean | Promise<boolean>;
