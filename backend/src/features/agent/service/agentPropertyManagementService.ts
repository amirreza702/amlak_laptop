import { findAgentProfileByUserId } from "../repository/agentRepository";
import { findAgentPropertyRecords, type AgentPropertyQuery } from "../repository/agentPropertyManagementRepository";
import { authorizePropertyAction, getPropertyVisibility, projectPropertyForActor } from "../../property/service/propertyAuthorizationService";
import type { AuthorizationActor } from "../../../shared/authorization/authorization.types";

/** فهرست املاک مشاور؛ تصمیم محرمانگی برای هر ملک از Authorization Core گرفته می‌شود. */
export async function getMyAgentPropertyRecords(actor: AuthorizationActor, query: Omit<AgentPropertyQuery, "agentId" | "userId">) {
  const userId = actor.id;
  const agent = await findAgentProfileByUserId(userId);
  if (!agent) throw new Error("AGENT_PROFILE_NOT_FOUND");
  if (agent.verificationStatus !== "VERIFIED") throw new Error("AGENT_VERIFICATION_REQUIRED");

  const result = await findAgentPropertyRecords({ ...query, agentId: agent.id, userId });

  // رابطه تأیید نهایی فقط وقتی معتبر است که مالک تأییدکننده واقعاً به همین ملک متصل باشد.
  const visibleRecords = await Promise.all(result.properties.map(async (record) => {
    const selectedRelation = record.property.agents.find((item) =>
      item.agentId === agent.id &&
      item.status === "ACTIVE" &&
      item.approvedByOwner === true &&
      Boolean(item.approvedByOwnerId) &&
      record.property.owners.some((owner) => owner.ownerId === item.approvedByOwnerId)
    ) ?? null;
    const listing = record.property.listing;
    const isExpired = listing?.status === "EXPIRED" ||
      (listing?.status === "PUBLISHED" && (!listing.confirmUntil || listing.confirmUntil.getTime() <= Date.now()));

    if (record.property.registrationSource === "OWNER" && !selectedRelation) return null;
    if (isExpired && !selectedRelation) return null;

    const canRead = await authorizePropertyAction(actor, "READ_PRIVATE", record.property);
    // ملک فعالِ ثبت‌شده توسط مشاور دیگر، فقط به‌صورت خلاصه و تقریبی در فهرست عمومی مشاوران دیده می‌شود.
    if (record.property.registrationSource === "OWNER" && !canRead) return null;
    return record;
  }));
  const authorizedRecords = visibleRecords.filter(
    (record): record is NonNullable<typeof record> => record !== null,
  );

  const properties = await Promise.all(authorizedRecords.map(async (record) => {
    const visibility = await getPropertyVisibility(actor, record.property);

    // استخراج رابطه تأییدشده فقط برای تعیین اینکه اطلاعات کدام مالک نمایش داده شود؛
    // مجاز بودن نمایش را Policy مرکزی تعیین می‌کند.
    const {
      createdByUser,
      creatorMobile: _creatorMobile,
      agents: _agents,
      owners: ownerRelations,
      ...propertyData
    } = record.property;
    const creatorIsVerifiedAndActive = createdByUser?.isActive === true &&
      createdByUser.agent?.verificationStatus === "VERIFIED";
    const approvedAgentRelation = record.property.agents.find(
      (item) => item.status === "ACTIVE" && item.approvedByOwner
    ) ?? null;
    const selectedAgentRelation = approvedAgentRelation?.agentId === agent.id
      ? approvedAgentRelation
      : null;
    const approvedOwnerRelation = selectedAgentRelation?.approvedByOwnerId
      ? ownerRelations.find((owner) => owner.ownerId === selectedAgentRelation.approvedByOwnerId) ?? null
      : null;
    const isApprovedAgent = Boolean(
      visibility.canViewOwnerDetails &&
      selectedAgentRelation &&
      approvedOwnerRelation
    );
    const primaryOwner = ownerRelations[0] ?? null;
    const visibleOwner = isApprovedAgent
      ? approvedOwnerRelation
      : visibility.canManage && visibility.canViewOwnerDetails
        ? primaryOwner
        : null;

    const safeProperty = projectPropertyForActor(propertyData, visibility, {
      owner: visibleOwner ? {
        firstName: visibleOwner.owner.firstName,
        lastName: visibleOwner.owner.lastName,
        mobile: visibleOwner.owner.user.mobile,
      } : null,
      owners: visibleOwner ? [{
        share: visibleOwner.share,
        isPrimary: visibleOwner.isPrimary,
        owner: {
          firstName: visibleOwner.owner.firstName,
          lastName: visibleOwner.owner.lastName,
        },
      }] : [],
      exposeCreatorContact: visibility.canViewRegistrantDetails && creatorIsVerifiedAndActive,
      creatorMobile: creatorIsVerifiedAndActive ? createdByUser?.mobile ?? null : null,
    });

    const listing = record.property.listing
      ? {
          ...record.property.listing,
          ...(record.property.listing.status === "PUBLISHED" || visibility.canViewOwnerDetails
            ? {}
            : { salePrice: null, depositAmount: null, rentAmount: null }),
        }
      : null;

    return {
      ...record,
      canManage: visibility.canManage,
      property: {
        ...safeProperty,
        createdByUserId: visibility.canManage ? record.property.createdByUserId : null,
        listing,
        approvedAgentFirstName: isApprovedAgent ? approvedAgentRelation?.agent.firstName ?? null : null,
        approvedAgentLastName: isApprovedAgent ? approvedAgentRelation?.agent.lastName ?? null : null,
        approvedAgentMobile: isApprovedAgent ? approvedAgentRelation?.agent.user.mobile ?? null : null,
        registrantFirstName: visibility.canViewRegistrantDetails && creatorIsVerifiedAndActive ? createdByUser?.agent?.firstName ?? null : null,
        registrantLastName: visibility.canViewRegistrantDetails && creatorIsVerifiedAndActive ? createdByUser?.agent?.lastName ?? null : null,
        creatorMobile: safeProperty.creatorMobile,
      },
    };
  }));

  const hiddenOnPage = result.properties.length - authorizedRecords.length;
  return { ...result, total: Math.max(authorizedRecords.length, result.total - hiddenOnPage), properties };
}
