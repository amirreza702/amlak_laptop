import { findAgentProfileByUserId } from "../repository/agentRepository";
import { findAgentPropertyRecords, type AgentPropertyQuery } from "../repository/agentPropertyManagementRepository";
import { getPropertyVisibility, projectPropertyForActor } from "../../property/service/propertyAuthorizationService";

/** فهرست املاک مشاور؛ تصمیم محرمانگی برای هر ملک از Authorization Core گرفته می‌شود. */
export async function getMyAgentPropertyRecords(userId: string, query: Omit<AgentPropertyQuery, "agentId" | "userId">) {
  const agent = await findAgentProfileByUserId(userId);
  if (!agent) throw new Error("AGENT_PROFILE_NOT_FOUND");

  const result = await findAgentPropertyRecords({ ...query, agentId: agent.id, userId });
  const actor = { id: userId, role: "AGENT" };

  const properties = await Promise.all(result.properties.map(async (record) => {
    const visibility = await getPropertyVisibility(actor, record.property);

    // استخراج رابطه تأییدشده فقط برای تعیین اینکه اطلاعات کدام مالک نمایش داده شود؛
    // مجاز بودن نمایش را Policy مرکزی تعیین می‌کند.
    const approvedAgentRelation = record.property.agents.find(
      (item) => item.status === "ACTIVE" && item.approvedByOwner
    ) ?? null;
    const selectedAgentRelation = approvedAgentRelation?.agentId === agent.id
      ? approvedAgentRelation
      : null;
    const approvedOwnerRelation = selectedAgentRelation?.approvedByOwnerId
      ? record.property.owners.find((owner) => owner.ownerId === selectedAgentRelation.approvedByOwnerId) ?? null
      : null;
    const isApprovedAgent = Boolean(
      visibility.canViewOwnerDetails &&
      selectedAgentRelation &&
      approvedOwnerRelation
    );
    const {
      createdByUser,
      agents: _agents,
      ...propertyData
    } = record.property;
    const primaryOwner = record.property.owners[0] ?? null;
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
      owners: visibleOwner ? [visibleOwner] : [],
      exposeCreatorContact: visibility.canViewOwnerDetails,
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
        approvedAgentFirstName: visibility.canViewOwnerDetails ? approvedAgentRelation?.agent.firstName ?? null : null,
        approvedAgentLastName: visibility.canViewOwnerDetails ? approvedAgentRelation?.agent.lastName ?? null : null,
        approvedAgentMobile: visibility.canViewOwnerDetails ? approvedAgentRelation?.agent.user.mobile ?? null : null,
        registrantFirstName: visibility.canViewOwnerDetails && record.property.registrationSource === "AGENT" ? createdByUser?.agent?.firstName ?? null : null,
        registrantLastName: visibility.canViewOwnerDetails && record.property.registrationSource === "AGENT" ? createdByUser?.agent?.lastName ?? null : null,
        creatorMobile: visibility.canViewOwnerDetails && record.property.registrationSource === "AGENT" ? createdByUser?.mobile ?? record.property.creatorMobile : null,
      },
    };
  }));

  return { ...result, properties };
}
