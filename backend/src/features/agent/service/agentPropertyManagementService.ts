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
      const isApprovedAgent = record.status === "ACTIVE" && record.approvedByOwner;
      return {
        ...record,
        canManage: isCreator,
        property: {
          ...record.property,
          createdByUserId: isCreator ? record.property.createdByUserId : null,
          // مشخصات مالک فقط برای مشاور ثبت‌کننده ملک یا مشاور تأییدشده همان ملک ارسال می‌شود.
          owners: isCreator || isApprovedAgent ? record.property.owners : [],
          // شماره تماس ثبت‌کننده فقط در صورت ثبت ملک توسط مشاور، نه مالک، مجاز است.
          creatorMobile: record.property.registrationSource === "AGENT" ? record.property.creatorMobile : null,
        },
      };
    }),
  };
}
