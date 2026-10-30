import { findAgentProfileByUserId } from "../repository/agentRepository";
import { findAgentPropertyRecords, type AgentPropertyQuery } from "../repository/agentPropertyManagementRepository";

/** تمام املاک برای مشاور فهرست می‌شوند؛ وضعیت رابطه و مجوز مدیریت هر ملک مستقل محاسبه می‌شود. */
export async function getMyAgentPropertyRecords(userId: string, query: Omit<AgentPropertyQuery, "agentId">) {
  const agent = await findAgentProfileByUserId(userId);
  if (!agent) throw new Error("AGENT_PROFILE_NOT_FOUND");

  const result = await findAgentPropertyRecords({ agentId: agent.id, ...query });
  return {
    ...result,
    properties: result.properties.map((record) => ({
      ...record,
      canManage: record.property.registrationSource === "AGENT" && record.property.createdByUserId === userId,
      property: {
        ...record.property,
        createdByUserId: record.property.registrationSource === "AGENT" && record.property.createdByUserId === userId
          ? record.property.createdByUserId
          : null,
      },
    })),
  };
}
