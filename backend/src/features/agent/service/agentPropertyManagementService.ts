import { findAgentProfileByUserId } from "./../repository/agentRepository";
import { findAgentPropertyRecords, type AgentPropertyQuery } from "../repository/agentPropertyManagementRepository";

/** مشاور فقط رکوردهایی را می‌بیند که از طریق رابطه PropertyAgent به او متصل‌اند. */
export async function getMyAgentPropertyRecords(userId: string, query: Omit<AgentPropertyQuery, "agentId">) {
  const agent = await findAgentProfileByUserId(userId);
  if (!agent) throw new Error("AGENT_PROFILE_NOT_FOUND");

  return findAgentPropertyRecords({
    agentId: agent.id,
    query: query.query,
    limit: query.limit,
    offset: query.offset,
  });
}
