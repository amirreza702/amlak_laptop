import {
  findManagedAgents,
  updateAgentVerification as updateAgentVerificationRepository,
  type AgentManagementQuery,
} from "../repository/agentManagementRepository";

export const getManagedAgentsService = async (
  query: AgentManagementQuery
) => findManagedAgents(query);

export const setAgentVerificationService = async (input: {
  agentId: string;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
  reviewerUserId: string;
  reviewerMobile: string;
  notes: string | null;
}) => updateAgentVerificationRepository(input);
