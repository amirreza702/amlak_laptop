import { findAgentProfileByUserId } from "../repository/agentRepository";
import { findAgentPropertyRecords, type AgentPropertyQuery } from "../repository/agentPropertyManagementRepository";
import { getPropertyVisibility } from "../../property/service/propertyAuthorizationService";

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
    const isCreator =
      record.property.registrationSource === "AGENT" &&
      record.property.createdByUserId === userId;

    const {
      createdByUser,
      agents: _agents,
      ...propertyData
    } = record.property;
    const primaryOwner = record.property.owners[0] ?? null;
    const visibleOwner = isApprovedAgent
      ? approvedOwnerRelation
      : isCreator && visibility.canViewOwnerDetails
        ? primaryOwner
        : null;

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
      canManage: isCreator,
      property: {
        ...propertyData,
        createdByUserId: isCreator ? record.property.createdByUserId : null,
        address: visibility.canViewExactLocation
          ? record.property.address
          : [record.property.city, record.property.district, "محدوده تقریبی"].filter(Boolean).join("، "),
        latitudeExact: visibility.canViewExactLocation
          ? record.property.latitudeExact
          : record.property.listing?.latitudePublic ?? null,
        longitudeExact: visibility.canViewExactLocation
          ? record.property.longitudeExact
          : record.property.listing?.longitudePublic ?? null,
        postalCode: visibility.canViewExactLocation ? record.property.postalCode : null,
        owners: visibleOwner ? [visibleOwner] : [],
        ownerFirstName: visibleOwner
          ? (isApprovedAgent ? approvedOwnerRelation?.owner.firstName : record.property.ownerFirstName ?? visibleOwner.owner.firstName) ?? null
          : null,
        ownerLastName: visibleOwner
          ? (isApprovedAgent ? approvedOwnerRelation?.owner.lastName : record.property.ownerLastName ?? visibleOwner.owner.lastName) ?? null
          : null,
        ownerMobile: visibleOwner
          ? (isApprovedAgent ? approvedOwnerRelation?.owner.user.mobile : record.property.ownerMobile ?? visibleOwner.owner.user.mobile) ?? null
          : null,
        listing,
        approvedAgentFirstName: approvedAgentRelation?.agent.firstName ?? null,
        approvedAgentLastName: approvedAgentRelation?.agent.lastName ?? null,
        approvedAgentMobile: approvedAgentRelation?.agent.user.mobile ?? null,
        registrantFirstName: record.property.registrationSource === "AGENT" ? createdByUser?.agent?.firstName ?? null : null,
        registrantLastName: record.property.registrationSource === "AGENT" ? createdByUser?.agent?.lastName ?? null : null,
        creatorMobile: record.property.registrationSource === "AGENT" ? createdByUser?.mobile ?? record.property.creatorMobile : null,
      },
    };
  }));

  return { ...result, properties };
}
