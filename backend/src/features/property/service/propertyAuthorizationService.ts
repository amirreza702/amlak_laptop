import { authorize } from "../../../shared/authorization/authorization.core";
import type { AuthorizationAction, AuthorizationActor } from "../../../shared/authorization/authorization.types";

interface PropertyOwnerAuthorizationRelation {
  ownerId: string;
  owner?: { userId?: string | null } | null;
}

interface PropertyAgentAuthorizationRelation {
  agentId?: string;
  status?: string;
  approvedByOwner?: boolean;
  approvedByOwnerId?: string | null;
  agent?: { userId?: string | null; verificationStatus?: string | null } | null;
}

export interface PropertyAuthorizationSubject {
  id: string;
  isActive?: boolean;
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
  canViewRegistrantDetails: boolean;
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
    creatorMobile?: string | null;
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
    creatorMobile: options.exposeCreatorContact
      ? options.creatorMobile ?? property.creatorMobile ?? null
      : null,
  };
}

/**
 * تنها نقطه ساخت Context و تصمیم‌گیری درباره داده‌های خصوصی ملک.
 * این تابع داده یا رابطه را از دیتابیس نمی‌خواند؛ فقط اطلاعات آماده‌شده
 * توسط Repository را به Authorization Core می‌سپارد.
 */
/**
 * Context و تصمیم تمام عملیات ملک فقط در این سرویس ساخته می‌شود.
 * Middleware و Feature Service حق ندارند رابطه یا وضعیت ملک را جداگانه تفسیر کنند.
 */
export async function authorizePropertyAction(
  actor: AuthorizationActor,
  action: AuthorizationAction,
  property: PropertyAuthorizationSubject,
  options: {
    allowAgentCreator?: boolean;
    expectedApproverOwnerId?: string;
    allowApprovedAgentContact?: boolean;
  } = {},
): Promise<boolean> {
  const owners = property.owners ?? [];
  const agents = property.agents ?? [];

  const isRelatedOwner =
    actor.role === "OWNER" &&
    owners.some((relation) => relation.owner?.userId === actor.id);

  const hasVerifiedAgentRelation = agents.some((relation) =>
    relation.agent?.userId === actor.id &&
    relation.agent.verificationStatus === "VERIFIED"
  );

  const isCreator =
    actor.role === "AGENT" &&
    property.registrationSource === "AGENT" &&
    property.createdByUserId === actor.id &&
    hasVerifiedAgentRelation;

  const isFinalApprovedAgent =
    actor.role === "AGENT" &&
    agents.some((relation) =>
      relation.agent?.userId === actor.id &&
      relation.agent.verificationStatus === "VERIFIED" &&
      relation.status === "ACTIVE" &&
      relation.approvedByOwner === true &&
      Boolean(relation.approvedByOwnerId) &&
      (!options.expectedApproverOwnerId ||
        relation.approvedByOwnerId === options.expectedApproverOwnerId) &&
      owners.some((owner) => owner.ownerId === relation.approvedByOwnerId),
    );

  const confirmUntil = property.listing?.confirmUntil
    ? new Date(property.listing.confirmUntil)
    : null;
  const isExpired =
    property.listing?.status === "EXPIRED" ||
    (property.listing?.status === "PUBLISHED" &&
      (!confirmUntil || confirmUntil.getTime() <= Date.now()));

  return authorize("property", action, {
    actor,
    resource: {
      id: property.id,
      status: property.listing?.status ?? undefined,
      data: {
        isDeleted: Boolean(property.deletedAt),
        isActive: property.isActive !== false,
        isExpired,
        isCreator,
        isRelatedOwner,
        isFinalApprovedAgent,
        isApprovedAgent: isFinalApprovedAgent,
        isAllowedAgentCreator: Boolean(options.allowAgentCreator && isCreator),
        isRegisteredByCurrentAgent: isCreator,
        isAgentRegisteredProperty: property.registrationSource === "AGENT",
        isApprovedAgentContactAllowed: Boolean(options.allowApprovedAgentContact),
      },
    },
  });
}

/** تمام مجوزهای مشاهده جزئیات ملک از یک Context مشترک و Policy مرکزی گرفته می‌شوند. */
export async function getPropertyVisibility(
  actor: AuthorizationActor,
  property: PropertyAuthorizationSubject,
  expectedApproverOwnerId?: string,
): Promise<PropertyVisibility> {
  const options = { expectedApproverOwnerId };
  const [canViewExactLocation, canViewOwnerDetails, canViewRegistrantDetails, canManage] = await Promise.all([
    authorizePropertyAction(actor, "VIEW_EXACT_LOCATION", property, options),
    authorizePropertyAction(actor, "VIEW_OWNER_DETAILS", property, options),
    authorizePropertyAction(actor, "VIEW_REGISTRANT_DETAILS", property, options),
    authorizePropertyAction(actor, "MANAGE", property, options),
  ]);

  return { canViewExactLocation, canViewOwnerDetails, canViewRegistrantDetails, canManage };
}
