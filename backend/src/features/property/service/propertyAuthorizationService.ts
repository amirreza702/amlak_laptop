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

export interface PropertyOwnerPrivateDetails {
  firstName?: string | null;
  lastName?: string | null;
  mobile?: string | null;
}

/**
 * Projection واحد داده‌های حساس ملک پس از تصمیم Authorization Core.
 * این تابع مجوز صادر نمی‌کند؛ فقط تصمیم Policy را به خروجی API اعمال می‌کند.
 * همه مسیرهای نمایش ملک باید از این projection استفاده کنند.
 */
export function projectPropertyForActor<
  T extends {
    city?: string | null;
    district?: string | null;
    address?: string | null;
    latitudeExact?: number | null;
    longitudeExact?: number | null;
    postalCode?: string | null;
    ownerFirstName?: string | null;
    ownerLastName?: string | null;
    ownerMobile?: string | null;
    creatorMobile?: string | null;
    owners?: unknown[];
    listing?: {
      latitudePublic?: number | null;
      longitudePublic?: number | null;
    } | null;
  },
>(
  property: T,
  visibility: PropertyVisibility,
  options: {
    owner?: PropertyOwnerPrivateDetails | null;
    owners?: unknown[];
    exposeCreatorContact?: boolean;
  } = {},
) {
  const canViewExactLocation = visibility.canViewExactLocation;
  const canViewOwnerDetails = visibility.canViewOwnerDetails;
  const mapLatitude = canViewExactLocation
    ? property.latitudeExact
    : property.listing?.latitudePublic ?? null;
  const mapLongitude = canViewExactLocation
    ? property.longitudeExact
    : property.listing?.longitudePublic ?? null;

  return {
    ...property,
    // تنها مختصات مجاز برای نقشه؛ فرانت نباید از روابط تو‌در‌تو مختصات را حدس بزند.
    mapLocation: mapLatitude != null && mapLongitude != null
      ? {
          latitude: mapLatitude,
          longitude: mapLongitude,
          precision: canViewExactLocation ? "EXACT" as const : "APPROXIMATE" as const,
        }
      : null,
    address: canViewExactLocation
      ? property.address
      : [property.city, property.district, "محدوده تقریبی"].filter(Boolean).join("، "),
    latitudeExact: canViewExactLocation
      ? property.latitudeExact
      : property.listing?.latitudePublic ?? null,
    longitudeExact: canViewExactLocation
      ? property.longitudeExact
      : property.listing?.longitudePublic ?? null,
    postalCode: canViewExactLocation ? property.postalCode : null,
    ownerFirstName: canViewOwnerDetails
      ? options.owner?.firstName ?? property.ownerFirstName ?? null
      : null,
    ownerLastName: canViewOwnerDetails
      ? options.owner?.lastName ?? property.ownerLastName ?? null
      : null,
    ownerMobile: canViewOwnerDetails
      ? options.owner?.mobile ?? property.ownerMobile ?? null
      : null,
    owners: canViewOwnerDetails ? options.owners ?? property.owners ?? [] : [],
    creatorMobile: canViewOwnerDetails && options.exposeCreatorContact
      ? property.creatorMobile ?? null
      : null,
  };
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
