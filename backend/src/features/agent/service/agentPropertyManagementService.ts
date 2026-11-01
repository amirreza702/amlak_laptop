import { findAgentProfileByUserId } from "../repository/agentRepository";
import { findAgentPropertyRecords, type AgentPropertyQuery } from "../repository/agentPropertyManagementRepository";

/** تمام املاک برای مشاور فهرست می‌شوند؛ وضعیت رابطه و مجوز مدیریت هر ملک مستقل محاسبه می‌شود. */
export async function getMyAgentPropertyRecords(userId: string, query: Omit<AgentPropertyQuery, "agentId">) {
  const agent = await findAgentProfileByUserId(userId);
  if (!agent) throw new Error("AGENT_PROFILE_NOT_FOUND");

  const result = await findAgentPropertyRecords({ agentId: agent.id, ...query });
  return {
    ...result,
    properties: result.properties.map((record) => {
      const isCreator = record.property.registrationSource === "AGENT" && record.property.createdByUserId === userId;
      const approvedAgentRelation = record.property.agents[0] ?? null;
      const approvedOwnerRequest = record.property.ownerAgentRequests.find((request) =>
        request.responses.some((response) => response.agentId === agent.id)
      ) ?? null;
      const approvedOwnerRelation = approvedOwnerRequest
        ? record.property.owners.find((owner) => owner.ownerId === approvedOwnerRequest.ownerId) ?? null
        : null;
      const isApprovedAgent = record.property.registrationSource === "OWNER" &&
        approvedAgentRelation?.status === "ACTIVE" &&
        approvedAgentRelation.approvedByOwner &&
        Boolean(approvedOwnerRelation);
      const { createdByUser, ownerAgentRequests: _ownerAgentRequests, ...propertyData } = record.property;
      const primaryOwner = record.property.owners[0] ?? null;
      const visibleOwner = isApprovedAgent ? approvedOwnerRelation : isCreator ? primaryOwner : null;
      return {
        ...record,
        canManage: isCreator,
        property: {
          ...propertyData,
          createdByUserId: isCreator ? record.property.createdByUserId : null,
          // فقط مالک مرتبط با تأیید همین مشاور یا مالک اصلی ملک ثبت‌شده توسط خود مشاور مجاز است.
          owners: visibleOwner ? [visibleOwner] : [],
          ownerFirstName: isApprovedAgent
            ? approvedOwnerRelation?.owner.firstName ?? null
            : isCreator ? record.property.ownerFirstName ?? visibleOwner?.owner.firstName ?? null : null,
          ownerLastName: isApprovedAgent
            ? approvedOwnerRelation?.owner.lastName ?? null
            : isCreator ? record.property.ownerLastName ?? visibleOwner?.owner.lastName ?? null : null,
          ownerMobile: isApprovedAgent
            ? approvedOwnerRelation?.owner.user.mobile ?? null
            : isCreator ? record.property.ownerMobile ?? visibleOwner?.owner.user.mobile ?? null : null,
          approvedAgentFirstName: isApprovedAgent ? agent.firstName : null,
          approvedAgentLastName: isApprovedAgent ? agent.lastName : null,
          approvedAgentMobile: isApprovedAgent ? agent.user.mobile : null,
          registrantFirstName: record.property.registrationSource === "AGENT" ? createdByUser?.agent?.firstName ?? null : null,
          registrantLastName: record.property.registrationSource === "AGENT" ? createdByUser?.agent?.lastName ?? null : null,
          creatorMobile: record.property.registrationSource === "AGENT" ? createdByUser?.mobile ?? record.property.creatorMobile : null,
        },
      };
    }),
  };
}
