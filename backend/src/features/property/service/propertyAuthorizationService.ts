import { authorize } from "../../../shared/authorization/authorization.core";
import type { AuthorizationActor } from "../../../shared/authorization/authorization.types";

interface PropertyOwnerAuthorizationRelation {
  ownerId: string;
  owner?: { userId?: string | null } | null;
}

interface PropertyAgentAuthorizationRelation {
  agentId?: string;
  status?: string;
  approvedByOwner?: boolean;
  approvedByOwnerId?: string | null;
  agent?: { userId?: string | null } | null;
}

export interface PropertyAuthorizationSubject {
  id: string;
  registrationSource?: string | null;
  createdByUserId?: string | null;
  deletedAt?: Date | string | null;
  listing?: {
    status?: string | null;
    confirmUntil?: Date | string | null;
  } | null;
  owners?: PropertyOwnerAuthorizationRelation[];
  agents?: PropertyAgentAuthorizationRelation[];
}

export interface PropertyVisibility {
  canViewExactLocation: boolean;
  canViewOwnerDetails: boolean;
  canManage: boolean;
}

/**
 * تنها نقطه ساخت Context و تصمیم‌گیری درباره داده‌های خصوصی ملک.
 * این تابع داده یا رابطه را از دیتابیس نمی‌خواند؛ فقط اطلاعات آماده‌شده
 * توسط Repository را به Authorization Core می‌سپارد.
 */
export async function getPropertyVisibility(
  actor: AuthorizationActor,
  property: PropertyAuthorizationSubject,
  expectedApproverOwnerId?: string,
): Promise<PropertyVisibility> {
  const owners = property.owners ?? [];
  const agents = property.agents ?? [];

  const isRelatedOwner =
    actor.role === "OWNER" &&
    owners.some((relation) => relation.owner?.userId === actor.id);

  const isCreator =
    actor.role === "AGENT" &&
    property.registrationSource === "AGENT" &&
    property.createdByUserId === actor.id;

  const isFinalApprovedAgent =
    actor.role === "AGENT" &&
    agents.some((relation) =>
      relation.agent?.userId === actor.id &&
      relation.status === "ACTIVE" &&
      relation.approvedByOwner === true &&
      Boolean(relation.approvedByOwnerId) &&
      (!expectedApproverOwnerId || relation.approvedByOwnerId === expectedApproverOwnerId) &&
      owners.some((owner) => owner.ownerId === relation.approvedByOwnerId),
    );

  const confirmUntil = property.listing?.confirmUntil
    ? new Date(property.listing.confirmUntil)
    : null;
  const isExpired =
    property.listing?.status === "EXPIRED" ||
    (property.listing?.status === "PUBLISHED" &&
      (!confirmUntil || confirmUntil.getTime() <= Date.now()));

  const context = {
    actor,
    resource: {
      id: property.id,
      status: property.listing?.status ?? undefined,
      data: {
        isDeleted: Boolean(property.deletedAt),
        isExpired,
        isCreator,
        isRelatedOwner,
        isFinalApprovedAgent,
      },
    },
  };

  const [canViewExactLocation, canViewOwnerDetails, canManage] = await Promise.all([
    authorize("property", "VIEW_EXACT_LOCATION", context),
    authorize("property", "VIEW_OWNER_DETAILS", context),
    authorize("property", "MANAGE", context),
  ]);

  return { canViewExactLocation, canViewOwnerDetails, canManage };
}
