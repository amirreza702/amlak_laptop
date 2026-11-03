import { findAgentProfileByUserId } from "../repository/agentRepository";
import { findAgentPropertyRecords, type AgentPropertyQuery } from "../repository/agentPropertyManagementRepository";

/** تمام املاک برای مشاور فهرست می‌شوند؛ وضعیت رابطه و مجوز مدیریت هر ملک مستقل محاسبه می‌شود. */
export async function getMyAgentPropertyRecords(userId: string, query: Omit<AgentPropertyQuery, "agentId">) {
  const agent = await findAgentProfileByUserId(userId);
  if (!agent) throw new Error("AGENT_PROFILE_NOT_FOUND");

  const result = await findAgentPropertyRecords({ agentId: agent.id, userId, ...query });
  return {
    ...result,
    properties: result.properties.map((record) => {
      const isCreator = record.property.registrationSource === "AGENT" && record.property.createdByUserId === userId;
      const approvedAgentRelation = record.property.agents.find(
        (item) => item.status === "ACTIVE" && item.approvedByOwner
      ) ?? null;
      const selectedAgentRelation = approvedAgentRelation?.agentId === agent.id ? approvedAgentRelation : null;
      const approvedOwnerRelation = selectedAgentRelation?.approvedByOwnerId
        ? record.property.owners.find((owner) => owner.ownerId === selectedAgentRelation.approvedByOwnerId) ?? null
        : null;
      const isApprovedAgent = Boolean(
        selectedAgentRelation &&
        record.status === "ACTIVE" && record.approvedByOwner && approvedOwnerRelation
      );
      const { createdByUser, agents: _agents, ...propertyData } = record.property;
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
          approvedAgentFirstName: approvedAgentRelation?.agent.firstName ?? null,
          approvedAgentLastName: approvedAgentRelation?.agent.lastName ?? null,
          approvedAgentMobile: approvedAgentRelation?.agent.user.mobile ?? null,
          registrantFirstName: record.property.registrationSource === "AGENT" ? createdByUser?.agent?.firstName ?? null : null,
          registrantLastName: record.property.registrationSource === "AGENT" ? createdByUser?.agent?.lastName ?? null : null,
          creatorMobile: record.property.registrationSource === "AGENT" ? createdByUser?.mobile ?? record.property.creatorMobile : null,
        },
      };
    }),
  };
}
